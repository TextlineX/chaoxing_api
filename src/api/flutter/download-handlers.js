/**
 * 下载处理模块
 * 处理文件下载相关操作
 */

const fileService = require('../../services/file');
const { ApiError, createParamError } = require('../../utils/error');
const config = require('../../config');

/**
 * 获取预签名下载URL
 */
async function getDownloadUrl(req, res, next) {
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
}

/**
 * 代理下载文件
 */
async function downloadFile(req, res, next) {
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
                'User-Agent': require('../../config').HEADERS.USER_AGENT,
                'Referer': require('../../config').HEADERS.REFERER
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
}

module.exports = {
    getDownloadUrl,
    downloadFile
};