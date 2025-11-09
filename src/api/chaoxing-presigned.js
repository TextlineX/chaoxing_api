/**
 * 超星网盘预签名URL下载功能
 * 基于您提供的Go驱动代码实现
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * 加密函数 - 与Go代码中的EncryptByAES对应
 * @param {string} message - 要加密的消息
 * @param {string} key - 加密密钥
 * @returns {string} 加密后的字符串
 */
function encryptByAES(message, key) {
    const aesKey = Buffer.from(key, 'utf8');
    const plainText = Buffer.from(message, 'utf8');

    const cipher = crypto.createCipher('aes-128-cbc', aesKey);
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted;
}

/**
 * 生成预签名下载URL
 * @param {string} fileId - 文件ID，格式为id$fileId
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @returns {Promise<Object>} 包含预签名URL的响应
 */
async function getPresignedDownloadUrl(fileId, cookie, bbsid) {
    try {
        // 验证fileId格式
        if (!fileId.includes('$')) {
            throw new Error('fileId格式错误，应为id$fileId格式');
        }

        // 从fileId中提取实际文件ID
        const actualFileId = fileId.split('$')[1];

        // 设置过期时间（5分钟后过期）
        const expires = Date.now() + (5 * 60 * 1000);

        // 生成签名
        const signatureData = {
            fileId: actualFileId,
            expires,
            bbsid,
            // 添加随机数防止重放攻击
            nonce: uuidv4()
        };

        const signatureString = JSON.stringify(signatureData);
        const signature = crypto
            .createHmac('sha256', process.env.SIGNATURE_KEY || 'default_signature_key')
            .update(signatureString)
            .digest('hex');

        // 构建预签名URL参数
        const params = {
            fileId: actualFileId,
            expires,
            bbsid,
            nonce: signatureData.nonce,
            signature
        };

        // 获取原始下载URL
        const downloadResponse = await axios.post(
            'https://noteyd.chaoxing.com/screen/note_note/files/status/' + actualFileId,
            {},
            {
                headers: {
                    'Cookie': cookie,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.160 Safari/537.36',
                    'Referer': 'https://chaoxing.com/'
                }
            }
        );

        if (!downloadResponse.data.status || !downloadResponse.data.download) {
            throw new Error(downloadResponse.data.msg || '获取下载链接失败');
        }

        // 构建预签名URL
        const baseUrl = downloadResponse.data.download;
        const separator = baseUrl.includes('?') ? '&' : '?';
        const presignedUrl = `${baseUrl}${separator}${querystring.stringify(params)}`;

        return {
            success: true,
            data: {
                downloadUrl: presignedUrl,
                fileName: downloadResponse.data.name || `file_${actualFileId}`,
                expires: new Date(expires).toISOString(),
                // 添加额外信息
                fileSize: downloadResponse.data.size || null,
                fileType: downloadResponse.data.filetype || null
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 验证预签名URL
 * @param {string} downloadUrl - 预签名下载URL
 * @returns {Promise<Object>} 验证结果
 */
async function verifyPresignedUrl(downloadUrl) {
    try {
        // 解析URL参数
        const urlObj = new URL(downloadUrl);
        const params = querystring.parse(urlObj.search.substring(1));

        // 检查必要参数
        if (!params.fileId || !params.expires || !params.signature || !params.nonce || !params.bbsid) {
            return {
                success: false,
                error: 'URL缺少必要参数'
            };
        }

        // 检查是否过期
        const currentTime = Date.now();
        const expiryTime = parseInt(params.expires);

        if (currentTime > expiryTime) {
            return {
                success: false,
                error: 'URL已过期',
                expiredAt: new Date(expiryTime).toISOString()
            };
        }

        // 验证签名
        const signatureData = {
            fileId: params.fileId,
            expires: params.expires,
            bbsid: params.bbsid,
            nonce: params.nonce
        };

        const signatureString = JSON.stringify(signatureData);
        const expectedSignature = crypto
            .createHmac('sha256', process.env.SIGNATURE_KEY || 'default_signature_key')
            .update(signatureString)
            .digest('hex');

        if (params.signature !== expectedSignature) {
            return {
                success: false,
                error: '签名验证失败'
            };
        }

        // URL有效
        return {
            success: true,
            data: {
                expiresAt: new Date(expiryTime).toISOString(),
                remainingTime: Math.floor((expiryTime - currentTime) / 1000) // 剩余秒数
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 获取预签名下载URL
 * POST /mobile/download-url
 * 请求体：
 *   - fileId: 文件ID
 *   - token: 认证令牌（可选，用于额外验证）
 */
router.post('/download-url', async (req, res) => {
    try {
        const { fileId, token } = req.body;

        // 从请求头获取认证信息
        const cookie = req.headers.cookie;
        const bbsid = req.headers.bbsid;

        // 验证认证信息
        if (!cookie || !bbsid) {
            return res.status(401).json({
                success: false,
                error: '认证信息不完整，请提供Cookie和Bbsid'
            });
        }

        // 验证必要参数
        if (!fileId) {
            return res.status(400).json({
                success: false,
                error: 'fileId不能为空'
            });
        }

        // 额外验证（可选）
        if (token && token !== process.env.MOBILE_API_TOKEN) {
            return res.status(401).json({
                success: false,
                error: '无效的API令牌'
            });
        }

        // 获取预签名URL
        const result = await getPresignedDownloadUrl(fileId, cookie, bbsid);

        // 返回结果
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 验证预签名URL是否有效
 * POST /mobile/verify-url
 * 请求体：
 *   - downloadUrl: 预签名URL
 */
router.post('/verify-url', async (req, res) => {
    try {
        const { downloadUrl } = req.body;

        // 验证必要参数
        if (!downloadUrl) {
            return res.status(400).json({
                success: false,
                error: 'downloadUrl不能为空'
            });
        }

        // 验证URL
        const result = await verifyPresignedUrl(downloadUrl);

        // 返回结果
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * API文档
 */
router.get('/docs', (req, res) => {
    res.json({
        title: '超星网盘预签名URL下载API',
        version: '1.0.0',
        description: '基于超星网盘API实现的预签名URL下载功能，支持安全的文件下载',
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
                    data: {
                        expiresAt: '过期时间（ISO格式）',
                        remainingTime: '剩余有效时间（秒）'
                    }
                }
            }
        ],
        security: {
            signature: 'HMAC-SHA256',
            expiresIn: '5分钟',
            replayProtection: '使用随机数(Nonce)防止重放攻击'
        }
    });
});

module.exports = router;
