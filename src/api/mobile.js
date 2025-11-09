/**
 * 移动端专用API
 * 提供安全高效的文件下载功能
 */

const express = require('express');
const fileService = require('../services/file');
const { ApiError, createParamError } = require('../utils/error');
const config = require('../config');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const router = express.Router();

/**
 * 获取预签名下载URL
 * POST /mobile/download-url
 * 请求体：
 *   - fileId: 文件ID
 *   - token: 认证令牌（可选，用于额外验证）
 */
router.post('/download-url', async (req, res, next) => {
    try {
        const { fileId, token } = req.body;

        // 从请求头获取认证信息
        const cookie = req.headers.cookie;
        const bbsid = req.headers.bbsid;

        // 验证认证信息
        if (!cookie || !bbsid) {
            throw new ApiError('认证信息不完整，请提供Cookie和Bbsid', 401, 'AUTH_ERROR');
        }

        // 验证必要参数
        if (!fileId) {
            throw createParamError('fileId不能为空');
        }

        // 验证fileId格式
        if (!fileId.includes('$')) {
            throw createParamError('fileId格式错误，应为id$fileId格式');
        }

        // 额外验证（可选）
        if (token && token !== process.env.MOBILE_API_TOKEN) {
            throw new ApiError('无效的API令牌', 401, 'TOKEN_ERROR');
        }

        // 获取预签名URL
        const result = await fileService.downloadFile(cookie, bbsid, fileId);

        // 返回结果
        res.json({
            success: true,
            data: {
                downloadUrl: result.downloadUrl,
                fileName: result.fileName,
                expires: result.expires,
                // 添加额外信息
                fileSize: result.fileSize || null,
                fileType: result.fileType || null
            },
            message: '获取下载链接成功'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 获取文件信息（不包含下载链接）
 * POST /mobile/file-info
 * 请求体：
 *   - fileId: 文件ID
 */
router.post('/file-info', async (req, res, next) => {
    try {
        const { fileId } = req.body;

        // 从请求头获取认证信息
        const cookie = req.headers.cookie;
        const bbsid = req.headers.bbsid;

        // 验证认证信息
        if (!cookie || !bbsid) {
            throw new ApiError('认证信息不完整，请提供Cookie和Bbsid', 401, 'AUTH_ERROR');
        }

        // 验证必要参数
        if (!fileId) {
            throw createParamError('fileId不能为空');
        }

        // 验证fileId格式
        if (!fileId.includes('$')) {
            throw createParamError('fileId格式错误，应为id$fileId格式');
        }

        // 获取文件信息（通过获取下载链接但不返回URL）
        const result = await fileService.downloadFile(cookie, bbsid, fileId);

        // 返回结果（不包含下载链接）
        res.json({
            success: true,
            data: {
                fileName: result.fileName,
                expires: result.expires,
                // 添加额外信息
                fileSize: result.fileSize || null,
                fileType: result.fileType || null
            },
            message: '获取文件信息成功'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 验证预签名URL是否有效
 * POST /mobile/verify-url
 * 请求体：
 *   - downloadUrl: 预签名URL
 */
router.post('/verify-url', async (req, res, next) => {
    try {
        const { downloadUrl } = req.body;

        // 验证必要参数
        if (!downloadUrl) {
            throw createParamError('downloadUrl不能为空');
        }

        // 检查URL是否包含过期时间参数
        if (!downloadUrl.includes('expires=')) {
            return res.json({
                success: false,
                message: 'URL不包含过期时间参数'
            });
        }

        // 提取过期时间
        const urlParams = new URL(downloadUrl).searchParams;
        const expires = urlParams.get('expires');

        if (!expires) {
            return res.json({
                success: false,
                message: '无法解析URL中的过期时间'
            });
        }

        // 检查是否过期
        const currentTime = Date.now();
        const expiryTime = parseInt(expires);

        if (currentTime > expiryTime) {
            return res.json({
                success: false,
                message: 'URL已过期',
                expiredAt: new Date(expiryTime).toISOString()
            });
        }

        // URL有效
        res.json({
            success: true,
            message: 'URL有效',
            expiresAt: new Date(expiryTime).toISOString(),
            remainingTime: Math.floor((expiryTime - currentTime) / 1000) // 剩余秒数
        });
    } catch (error) {
        next(error);
    }
});

/**
 * API文档
 */
router.get('/docs', (req, res) => {
    res.json({
        title: '移动端API文档',
        version: '1.0.0',
        base_url: `http://localhost:${config.SERVER.PORT}/mobile`,
        authentication: {
            description: '需要在请求头中提供Cookie和Bbsid认证信息',
            headers: {
                Cookie: {
                    type: 'string',
                    required: true,
                    description: '用户Cookie'
                },
                Bbsid: {
                    type: 'string',
                    required: true,
                    description: '用户Bbsid'
                }
            }
        },
        endpoints: [
            {
                path: '/download-url',
                method: 'POST',
                description: '获取文件预签名下载URL',
                headers: {
                    Cookie: '用户Cookie',
                    Bbsid: '用户Bbsid'
                },
                body: {
                    fileId: {
                        type: 'string',
                        required: true,
                        description: '文件ID，格式为id$fileId'
                    },
                    token: {
                        type: 'string',
                        required: false,
                        description: 'API令牌（可选）'
                    }
                },
                response: {
                    success: true,
                    data: {
                        downloadUrl: '预签名下载URL',
                        fileName: '文件名',
                        expires: '过期时间（ISO格式）',
                        fileSize: '文件大小（字节）',
                        fileType: '文件类型'
                    }
                }
            },
            {
                path: '/file-info',
                method: 'POST',
                description: '获取文件信息（不包含下载链接）',
                headers: {
                    Cookie: '用户Cookie',
                    Bbsid: '用户Bbsid'
                },
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
                        fileName: '文件名',
                        expires: '过期时间（ISO格式）',
                        fileSize: '文件大小（字节）',
                        fileType: '文件类型'
                    }
                }
            },
            {
                path: '/verify-url',
                method: 'POST',
                description: '验证预签名URL是否有效',
                body: {
                    downloadUrl: {
                        type: 'string',
                        required: true,
                        description: '预签名下载URL'
                    }
                },
                response: {
                    success: true,
                    message: 'URL有效',
                    expiresAt: '过期时间（ISO格式）',
                    remainingTime: '剩余有效时间（秒）'
                }
            }
        ]
    });
});

module.exports = router;
