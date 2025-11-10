/**
 * 上传处理模块
 * 处理文件上传相关操作
 */

const fileService = require('../../services/file');
const { createParamError } = require('../../utils/error');
const config = require('../../config');

/**
 * 处理文件上传
 */
async function handleUpload(req, cookie, bbsid, params, isServerless) {
    // 检查是否有上传的文件
    if (req.files && req.files.length > 0) {
        // 使用上传的文件
        const { dirId = '-1' } = params || {};
        const uploadedFile = req.files[0];
        
        // 获取原始文件名（如果有）
        const originalName = req.body.filename || uploadedFile.originalname || uploadedFile.name;
        
        let result;
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
        
        return result;
    } else {
        // 使用文件路径参数
        const { filePath, dirId = '-1' } = params || {};
        if (!filePath) {
            throw createParamError('filePath参数不能为空');
        }
        return await fileService.uploadFile(cookie, bbsid, filePath, dirId);
    }
}

/**
 * 同步上传状态
 */
async function syncUpload(req, res) {
    try {
        const { uploadResult, fileName, dirId } = req.body;
        
        // 验证上传结果
        if (!uploadResult || !uploadResult.success) {
            if (!res.headersSent) {
                return res.json({ 
                    success: false, 
                    message: '上传结果无效' 
                });
            }
            return;
        }
        
        // 解析上传数据
        let data = uploadResult.data;
        if (typeof data === 'string') {
            // 如果是字符串，尝试解析为JSON
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error('解析上传数据失败:', e);
                // 即使解析失败，也认为同步成功，因为文件已经上传到超星服务器
            }
        }
        
        // 如果data是对象，直接处理
        if (data && typeof data === 'object') {
            // 异步处理上传数据，不阻塞响应
            processUploadData(data, fileName, dirId).catch(error => {
                console.error('后台处理上传数据时出错:', error);
            });
        }
        
        // 立即返回同步成功响应，提高响应速度
        if (!res.headersSent) {
            res.json({
                success: true,
                message: '状态同步成功'
            });
        }
        return; // 确保函数在此处结束
    } catch (error) {
        console.error('状态同步失败:', error);
        // 即使同步失败，也返回成功，因为文件已经上传到超星服务器
        if (!res.headersSent) {
            res.json({
                success: true,
                message: '状态同步完成（存在警告）'
            });
        }
        return; // 确保函数在此处结束
    }
}

/**
 * 处理上传数据的辅助函数
 */
async function processUploadData(data, fileName, dirId) {
    try {
        // 根据实际返回的数据结构提取有用信息
        const fileInfo = {
            objectId: data.objectId,
            resid: data.resid,
            residstr: data.residstr,  // 字符串类型的resid
            crc: data.crc,
            name: fileName || data.name,
            size: data.size,
            dirId: dirId || '-1',
            uploadTime: new Date().toISOString(),
            suffix: data.suffix,
            isfile: data.isfile,
            pantype: data.pantype
        };
        
        // 在这里可以将文件信息保存到数据库
        // await saveFileInfoToDatabase(fileInfo);
        
        console.log('文件信息已同步:', fileInfo);
    } catch (error) {
        console.error('处理上传数据时出错:', error);
        // 不抛出错误，确保接口的稳定性
    }
}

/**
 * 获取上传配置
 */
async function getUploadConfig(req, res, next) {
    try {
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        // 获取上传配置
        const configResult = await fileService.getUploadConfig(cookie, bbsid);
        
        // 返回上传所需的所有参数
        res.json({
            success: true,
            data: {
                uploadUrl: `${config.UPLOAD_API}/upload`, // 上传URL
                puid: configResult.msg.puid,             // 用户ID
                token: configResult.msg.token,           // 上传令牌
                headers: {
                    'User-Agent': config.HEADERS.USER_AGENT,
                    'Referer': config.HEADERS.REFERER
                }
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * 上传文件路由处理
 */
async function uploadFile(req, res, next) {
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
}

module.exports = {
    handleUpload,
    syncUpload,
    getUploadConfig,
    uploadFile
};