/**
 * Flutter集成API
 * 提供简化的API接口，便于Flutter应用对接
 */

const express = require('express');
const multer = require('multer');
const fileService = require('../services/file'); // 使用修改后的服务
const { ApiError, createParamError } = require('../utils/error');
const config = require('../config');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 检测是否在Serverless环境中运行
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// 在Serverless环境中，跳过所有文件系统初始化操作
if (!isServerless) {
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '../../temp/uploads');

    if (!fs.existsSync(tempDir)) {
        try {
            fs.mkdirSync(tempDir, { recursive: true });
        } catch (error) {
            console.warn('无法创建临时目录:', error.message);
        }
    }

    // 临时文件存储配置
    const tempFileConfig = {
        tempDir: tempDir,
        // 文件保留时间（毫秒），默认为2小时
        retentionTime: 2 * 60 * 60 * 1000,
        // 清理间隔（毫秒），默认为30分钟
        cleanupInterval: 30 * 60 * 1000
    };

    // 启动定时清理任务
    setInterval(() => {
        cleanupTempFiles();
    }, tempFileConfig.cleanupInterval);

    // 立即执行一次清理
    cleanupTempFiles();
}

// 清理过期临时文件
function cleanupTempFiles() {
    try {
        console.log('开始清理过期临时文件...');
        
        // 清理上传的临时文件
        cleanDirectory(tempFileConfig.tempDir);
        

        
        console.log('临时文件清理完成');
    } catch (error) {
        console.error('清理临时文件失败:', error);
    }
}

// 清理目录中的过期文件
function cleanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath);
    const now = Date.now();
    
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        

            
        if (stats.isFile()) {
            // 检查文件是否过期
            if (now - stats.mtime.getTime() > tempFileConfig.retentionTime) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`已删除过期文件: ${filePath}`);
                } catch (e) {
                    console.error(`删除文件失败 ${filePath}:`, e);
                }
            }
        }
    }
}

const router = express.Router();

// 配置multer中间件
// 在Serverless环境中使用内存存储，否则使用文件系统
const storage = isServerless 
    ? multer.memoryStorage() 
    : { dest: 'temp/uploads/' };

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 限制文件大小为100MB
    }
});

/**
 * 获取预签名下载URL
 * POST /flutter/get-download-url
 * 请求体：
 *   - fileId: 文件ID
 */
router.post('/get-download-url', async (req, res, next) => {
    try {
        const { fileId } = req.body;
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        if (!fileId) {
            throw createParamError('fileId不能为空');
        }

        const result = await fileService.downloadFile(cookie, bbsid, fileId);
        res.json({
            success: true,
            data: {
                downloadUrl: result.downloadUrl,
                fileName: result.fileName,
                expires: result.expires
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 代理下载文件
 * GET /flutter/download/:fileId
 * 路径参数：
 *   - fileId: 文件ID，格式为id$fileId
 */
router.get('/download/:fileId', async (req, res, next) => {
    try {
        const { fileId } = req.params;
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        if (!fileId) {
            throw createParamError('fileId不能为空');
        }

        // 获取下载链接
        const downloadInfo = await fileService.downloadFile(cookie, bbsid, fileId);

        // 解码文件名（如果需要）
        let fileName = downloadInfo.fileName;
        try {
            if (fileName && fileName.includes('%')) {
                fileName = decodeURIComponent(fileName);
            }
        } catch (e) {
            console.warn('文件名解码失败:', fileName, e);
        }

        // 设置响应头
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Cache-Control', 'no-cache');

        // 使用axios获取文件流
        const axios = require('axios');
        const response = await axios({
            method: 'get',
            url: downloadInfo.downloadUrl,
            headers: {
                'Cookie': cookie,
                'User-Agent': require('../config').HEADERS.USER_AGENT,
                'Referer': require('../config').HEADERS.REFERER
            },
            responseType: 'stream'
        });

        // 将文件流转发给客户端
        response.data.pipe(res);

        // 处理错误
        response.data.on('error', (err) => {
            console.error('文件下载错误:', err);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: '文件下载失败'
                });
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * 统一API入口
 * 支持多种操作类型，通过action参数区分
 */
router.post('/api', upload.any(), async (req, res, next) => {
    try {
        const { action, params } = req.body;

        // 验证请求格式
        if (!action) {
            throw createParamError('action参数不能为空');
        }

        // 从环境变量获取认证信息
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        let result;

        // 根据action参数执行相应操作
        switch (action) {
            case 'listFiles':
                const { folderId = '-1' } = params || {};
                result = await fileService.listFiles(cookie, bbsid, folderId);
                break;

            case 'downloadFile':
                const { fileId } = params || {};
                if (!fileId) {
                    throw createParamError('fileId参数不能为空');
                }
                result = await fileService.downloadFile(cookie, bbsid, fileId);
                break;

            case 'createFolder':
                const { dirName, parentId = '-1' } = params || {};
                if (!dirName) {
                    throw createParamError('dirName参数不能为空');
                }
                result = await fileService.makeDir(cookie, bbsid, dirName, parentId);
                break;

            case 'uploadFile':
                // 检查是否有上传的文件
                if (req.files && req.files.length > 0) {
                    // 使用上传的文件
                    const { dirId = '-1' } = params || {};
                    const uploadedFile = req.files[0];
                    
                    // 获取原始文件名（如果有）
                    const originalName = req.body.filename || uploadedFile.originalname || uploadedFile.name;
                    
                    // 根据环境选择上传方式
                    if (isServerless) {
                        // 在Serverless环境中，使用内存中的文件数据
                        result = await fileService.uploadFileFromBuffer(cookie, bbsid, uploadedFile.buffer, originalName, dirId);
                    } else {
                        // 在非Serverless环境中，使用文件路径
                        result = await fileService.uploadFileWithOriginalName(cookie, bbsid, uploadedFile.path, originalName, dirId);
                    
                        // 删除临时文件
                        const fs = require('fs');
                        fs.unlinkSync(uploadedFile.path);
                    }
                } else {
                    // 使用文件路径参数
                    const { filePath, dirId = '-1' } = params || {};
                    if (!filePath) {
                        throw createParamError('filePath参数不能为空');
                    }
                    result = await fileService.uploadFile(cookie, bbsid, filePath, dirId);
                }
                break;

            case 'downloadFileToLocal':
                const { fileId: dlFileId, outputPath } = params || {};
                if (!dlFileId) {
                    throw createParamError('fileId参数不能为空');
                }
                result = await fileService.downloadFileToLocal(cookie, bbsid, dlFileId, outputPath);
                break;

            case 'deleteResource':
                const { resourceId, isFolder } = params || {};
                if (!resourceId) {
                    throw createParamError('resourceId参数不能为空');
                }
                // 转换isFolder参数
                let isFolderParam = null;
                if (isFolder !== undefined) {
                    isFolderParam = isFolder === 'true' || isFolder === true;
                }
                result = await fileService.deleteResource(cookie, bbsid, resourceId, isFolderParam);
                break;

            case 'moveResource':
                const { resourceId: moveResourceId, targetId, isFolder: moveIsFolder } = params || {};
                if (!moveResourceId) {
                    throw createParamError('resourceId参数不能为空');
                }
                if (!targetId) {
                    throw createParamError('targetId参数不能为空');
                }
                result = await moveResource(cookie, bbsid, moveResourceId, targetId, moveIsFolder);
                break;

            case 'batchMoveResources':
                const { resourceIds: batchResourceIds, targetId: batchTargetId, isFolder: batchIsFolder } = params || {};
                if (!batchResourceIds || !Array.isArray(batchResourceIds) || batchResourceIds.length === 0) {
                    throw createParamError('resourceIds参数不能为空且必须是数组');
                }
                if (!batchTargetId) {
                    throw createParamError('targetId参数不能为空');
                }
                result = await batchMoveResources(cookie, bbsid, batchResourceIds, batchTargetId, batchIsFolder);
                break;
                
            case 'getUploadConfig':
                result = await fileService.getUploadConfig(cookie, bbsid);
                break;
                
// 已移除分块上传初始化功能


                

                



                

                // 例如: await uploadSessionModel.create(uploadSession);
                
                result = {
                    uploadId,
                    chunkSize: 5 * 1024 * 1024, // 5MB
                    totalChunks: uploadSession.totalChunks
                };
                break;
                
            case 'uploadChunk':
                // 处理文件块上传
                const { uploadId: chunkUploadId, chunkIndex, totalChunks } = params || {};
                if (!chunkUploadId || chunkIndex === undefined) {
                    throw createParamError('uploadId和chunkIndex参数不能为空');
                }

                // 获取上传会话信息
                // const uploadSession = await uploadSessionModel.findById(chunkUploadId);
                // 这里简化处理，实际应该从数据库获取
                const chunkUploadSession = {}; // 假设已获取

                if (!chunkUploadSession) {
                    throw new ApiError('上传会话不存在或已过期', 404, 'NOT_FOUND');
                }

                // 处理文件块
                if (!req.files || req.files.length === 0) {
                    throw createParamError('没有上传文件块');
                }

                const chunkFile = req.files[0];
                
                // 保存文件块到临时目录
                const chunkDirPathForUpload = path.join(tempFileConfig.chunkDir, chunkUploadId);
                
                // 确保目录存在
                if (!fs.existsSync(chunkDirPathForUpload)) {
                    fs.mkdirSync(chunkDirPathForUpload, { recursive: true });
                }
                
                const chunkPath = path.join(chunkDirPathForUpload, `chunk_${chunkIndex}`);
                fs.writeFileSync(chunkPath, fs.readFileSync(chunkFile.path));
                
                // 删除临时文件
                fs.unlinkSync(chunkFile.path);
                
                // 更新上传会话状态
                chunkUploadSession.chunks.push(parseInt(chunkIndex));
                chunkUploadSession.status = 'uploading';
                
                // 保存更新后的会话信息
                // await uploadSessionModel.update(chunkUploadId, chunkUploadSession);
                
                result = {
                    chunkIndex,
                    received: true,
                    totalReceived: chunkUploadSession.chunks.length,
                    totalChunks: chunkUploadSession.totalChunks
                };
                break;
                
            case 'completeChunkedUpload':
                const { uploadId: completeUploadId } = params || {};
                if (!completeUploadId) {
                    throw createParamError('uploadId参数不能为空');
                }

                // 获取上传会话信息
                // const uploadSession = await uploadSessionModel.findById(completeUploadId);
                // 这里简化处理，实际应该从数据库获取
                const completeUploadSession = {}; // 假设已获取

                if (!completeUploadSession) {
                    throw new ApiError('上传会话不存在或已过期', 404, 'NOT_FOUND');
                }

                // 检查所有分块是否已上传
                if (completeUploadSession.chunks.length !== completeUploadSession.totalChunks) {
                    throw new ApiError('还有分块未上传完成', 400, 'BAD_REQUEST');
                }

                // 合并文件块
                const chunkDirPathForComplete = path.join(tempFileConfig.chunkDir, completeUploadId);
                const mergedFilePath = path.join(tempFileConfig.tempDir, completeUploadSession.fileName);
                
                // 创建合并后的文件流
                const writeStream = fs.createWriteStream(mergedFilePath);
                
                // 按顺序合并所有分块
                for (let i = 0; i < completeUploadSession.totalChunks; i++) {
                    const chunkPath = path.join(chunkDirPathForComplete, `chunk_${i}`);
                    const chunkData = fs.readFileSync(chunkPath);
                    writeStream.write(chunkData);
                }
                
                writeStream.end();
                
                // 等待写入完成
                await new Promise((resolve) => {
                    writeStream.on('finish', resolve);
                });
                
                // 上传合并后的文件到超星网盘
                const uploadResult = await fileService.uploadFile(
                    cookie, 
                    bbsid, 
                    mergedFilePath, 
                    completeUploadSession.folderId
                );
                
                // 清理临时文件
                fs.rmSync(chunkDirPathForComplete, { recursive: true, force: true });
                fs.unlinkSync(mergedFilePath);
                
                // 更新上传会话状态
                completeUploadSession.status = 'completed';
                completeUploadSession.completedAt = new Date().toISOString();
                
                // 保存更新后的会话信息
                // await uploadSessionModel.update(completeUploadId, completeUploadSession);
                
                result = {
                    message: '文件上传完成',
                    fileId: uploadResult.fileId,
                    fileName: completeUploadSession.fileName
                };
                break;
                
            case 'getUploadedChunks':
                const { uploadId: getChunksUploadId } = params || {};
                if (!getChunksUploadId) {
                    throw createParamError('uploadId参数不能为空');
                }

                // 获取上传会话信息
                // const uploadSession = await uploadSessionModel.findById(getChunksUploadId);
                // 这里简化处理，实际应该从数据库获取
                const getChunksUploadSession = {}; // 假设已获取

                if (!getChunksUploadSession) {
                    throw new ApiError('上传会话不存在或已过期', 404, 'NOT_FOUND');
                }

                result = {
                    uploadId: getChunksUploadId,
                    chunks: getChunksUploadSession.chunks || [],
                    totalChunks: getChunksUploadSession.totalChunks || 0,
                    status: getChunksUploadSession.status || 'unknown'
                };
                break;

            default:
                throw createParamError(`不支持的操作类型: ${action}`);
        }

        // 返回成功结果
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

/**
 * API文档接口
 * 提供Flutter集成所需的API文档
 */
router.get('/docs', (req, res) => {
    res.json({
        title: '朝星小组网盘API - Flutter集成文档',
        version: '1.0.0',
        base_url: `http://localhost:${config.SERVER.PORT}/flutter`,
        authentication: {
            description: '无需提供认证信息，服务器自动使用环境变量中的认证信息'
        },
        endpoints: [
            {
                path: '/get-download-url',
                method: 'POST',
                description: '获取文件预签名下载URL',
                headers: {},
                body: {
                    fileId: {
                        type: 'string',
                        required: true,
                        description: '文件ID，格式为id$fileId'
                    }
                },
                response: {
                    success: true,
                    data: {
                        downloadUrl: '预签名下载URL',
                        fileName: '文件名',
                        expires: '过期时间（ISO格式）'
                    }
                }
            },
            {
                path: '/api',
                method: 'POST',
                description: '统一API入口',
                headers: {},
                body: {
                    action: {
                        type: 'string',
                        required: true,
                        description: '操作类型'
                    },
                    params: {
                        type: 'object',
                        description: '操作参数'
                    }
                },
                actions: [
                    {
                        name: 'listFiles',
                        description: '获取文件列表',
                        params: {
                            folderId: {
                                type: 'string',
                                required: false,
                                default: '-1',
                                description: '文件夹ID，默认为根目录'
                            }
                        }
                    },
                    {
                        name: 'downloadFile',
                        description: '获取文件下载链接',
                        params: {
                            fileId: {
                                type: 'string',
                                required: true,
                                description: '文件ID，格式为id$fileId'
                            }
                        }
                    },
                    {
                        name: 'createFolder',
                        description: '创建文件夹',
                        params: {
                            dirName: {
                                type: 'string',
                                required: true,
                                description: '文件夹名称'
                            },
                            parentId: {
                                type: 'string',
                                required: false,
                                default: '-1',
                                description: '父文件夹ID，默认为根目录'
                            }
                        }
                    },
                    {
                        name: 'uploadFile',
                        description: '上传文件',
                        params: {
                            filePath: {
                                type: 'string',
                                required: true,
                                description: '文件路径'
                            },
                            dirId: {
                                type: 'string',
                                required: false,
                                default: '-1',
                                description: '目标文件夹ID，默认为根目录'
                            }
                        }
                    },
                    {
                        name: 'downloadFileToLocal',
                        description: '下载文件到本地',
                        params: {
                            fileId: {
                                type: 'string',
                                required: true,
                                description: '文件ID，格式为id$fileId'
                            },
                            outputPath: {
                                type: 'string',
                                required: false,
                                description: '输出路径（可选）'
                            }
                        }
                    },
                    {
                        name: 'deleteResource',
                        description: '删除文件或文件夹',
                        params: {
                            resourceId: {
                                type: 'string',
                                required: true,
                                description: '资源ID（文件ID或文件夹ID）'
                            },
                            isFolder: {
                                type: 'boolean',
                                required: false,
                                description: '是否为文件夹（true/false），如果不提供则自动判断'
                            }
                        }
                    },
                    {
                        name: 'moveResource',
                        description: '移动文件或文件夹',
                        params: {
                            resourceId: {
                                type: 'string',
                                required: true,
                                description: '资源ID（文件ID或文件夹ID）'
                            },
                            targetId: {
                                type: 'string',
                                required: true,
                                description: '目标文件夹ID'
                            },
                            isFolder: {
                                type: 'boolean',
                                required: false,
                                description: '是否为文件夹（true/false），如果不提供则自动判断'
                            }
                        }
                    },
                    {
                        name: 'batchMoveResources',
                        description: '批量移动文件或文件夹',
                        params: {
                            resourceIds: {
                                type: 'array',
                                required: true,
                                description: '资源ID数组'
                            },
                            targetId: {
                                type: 'string',
                                required: true,
                                description: '目标文件夹ID'
                            },
                            isFolder: {
                                type: 'boolean',
                                required: false,
                                description: '是否为文件夹（true/false），如果不提供则自动判断'
                            }
                        }
                    }
                ]
            }
        ],
        response_format: {
            success: {
                type: 'boolean',
                description: '操作是否成功'
            },
            data: {
                type: 'object',
                description: '返回的数据，具体结构取决于操作类型'
            }
        },
        error_response: {
            error: {
                code: {
                    type: 'string',
                    description: '错误代码'
                },
                message: {
                    type: 'string',
                    description: '错误信息'
                }
            }
        }
    });
});

/**
 * 文件上传路由
 * 处理multipart/form-data请求，支持直接上传文件
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
        // 检查是否有文件上传
        if (!req.file) {
            throw createParamError('没有上传文件');
        }

        // 从表单字段获取参数
        const { action, dirId = '-1' } = req.body;
        
        // 验证action参数
        if (action !== 'uploadFile') {
            throw createParamError('此路由仅支持uploadFile操作');
        }

        // 从环境变量获取认证信息
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        // 上传文件
        const result = await fileService.uploadFile(cookie, bbsid, req.file.path, dirId);
        
        // 删除临时文件
        const fs = require('fs');
        fs.unlinkSync(req.file.path);

        // 返回成功结果
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        // 如果出现错误，删除临时文件
        if (req.file && req.file.path) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('删除临时文件失败:', e);
            }
        }
        next(error);
    }
});

/**
 * 移动文件或文件夹
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} resourceId - 资源ID（文件ID或文件夹ID）
 * @param {string} targetId - 目标文件夹ID
 * @param {boolean|null} isFolder - 是否为文件夹，true为文件夹，false为文件，null为自动判断
 * @returns {Promise<Object>} 移动结果
 */
async function moveResource(cookie, bbsid, resourceId, targetId, isFolder = null) {
    if (!cookie || !bbsid || !resourceId || !targetId) {
        throw createParamError('Cookie、Bbsid、resourceId和targetId不能为空');
    }

    try {
        // 自动判断资源类型
        let isFolderParam = null;
        if (isFolder !== undefined) {
            isFolderParam = isFolder === 'true' || isFolder === true;
        } else {
            // 如果包含$符号，则为文件，否则为文件夹
            isFolderParam = !resourceId.includes('$');
        }

        // 构建请求参数
        let query;
        if (isFolderParam) {
            // 移动文件夹
            query = {
                bbsid,
                folderIds: resourceId,
                targetId
            };
        } else {
            // 移动文件
            const recId = resourceId.split('$')[0];
            query = {
                bbsid,
                recIds: recId,
                targetId
            };
        }

        // 发送移动请求
        const axios = require('axios');
        const response = await axios.get(
            `${config.API_BASE}/pc/resource/moveResource`,
            {
                params: query,
                headers: {
                    'Cookie': cookie,
                    'User-Agent': config.HEADERS.USER_AGENT,
                    'Referer': config.HEADERS.REFERER
                }
            }
        );

        // 检查响应
        if (response.data.status) {
            return {
                message: '移动成功',
                resourceId,
                targetId,
                type: isFolderParam ? '文件夹' : '文件'
            };
        } else {
            throw new Error(response.data.msg || '移动失败');
        }
    } catch (error) {
        throw createServerError(`移动资源失败: ${error.message}`);
    }
}

/**
 * 批量移动文件或文件夹
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {Array<string>} resourceIds - 资源ID数组
 * @param {string} targetId - 目标文件夹ID
 * @param {boolean|null} isFolder - 是否为文件夹，true为文件夹，false为文件，null为自动判断
 * @returns {Promise<Object>} 批量移动结果
 */
async function batchMoveResources(cookie, bbsid, resourceIds, targetId, isFolder = null) {
    if (!cookie || !bbsid || !resourceIds || !targetId) {
        throw createParamError('Cookie、Bbsid、resourceIds和targetId不能为空');
    }

    if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
        throw createParamError('resourceIds必须是非空数组');
    }

    try {
        // 分离文件和文件夹
        const fileIds = [];
        const folderIds = [];

        if (isFolder !== null) {
            // 如果明确指定了类型
            if (isFolder === true) {
                folderIds.push(...resourceIds);
            } else {
                fileIds.push(...resourceIds.map(id => id.split('$')[0]));
            }
        } else {
            // 自动判断类型
            resourceIds.forEach(id => {
                if (id.includes('$')) {
                    fileIds.push(id.split('$')[0]);
                } else {
                    folderIds.push(id);
                }
            });
        }

        // 构建请求参数
        const query = {
            bbsid,
            targetId
        };

        // 添加文件ID
        if (fileIds.length > 0) {
            query.recIds = fileIds.join(',');
        }

        // 添加文件夹ID
        if (folderIds.length > 0) {
            query.folderIds = folderIds.join(',');
        }

        // 发送移动请求
        const axios = require('axios');
        const response = await axios.get(
            `${config.API_BASE}/pc/resource/moveResource`,
            {
                params: query,
                headers: {
                    'Cookie': cookie,
                    'User-Agent': config.HEADERS.USER_AGENT,
                    'Referer': config.HEADERS.REFERER
                }
            }
        );

        // 检查响应
        if (response.data.status) {
            return {
                message: '批量移动成功',
                resourceIds,
                targetId,
                movedCount: resourceIds.length,
                fileCount: fileIds.length,
                folderCount: folderIds.length
            };
        } else {
            throw new Error(response.data.msg || '批量移动失败');
        }
    } catch (error) {
        throw createServerError(`批量移动资源失败: ${error.message}`);
    }
}

module.exports = router;
