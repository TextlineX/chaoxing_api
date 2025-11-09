/**
 * 文件API路由模块
 * 处理文件相关的API请求
 */

const express = require('express');
const path = require('path');
const fileService = require('../services/file'); // 使用修改后的服务
const { ApiError } = require('../utils/error');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const router = express.Router();

/**
 * 获取文件列表
 * GET /api/files
 * 查询参数：
 *   - folderId: 文件夹ID，默认为根目录
 */
router.get('/', async (req, res, next) => {
    try {
        const { folderId = '-1' } = req.query;
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        const files = await fileService.listFiles(cookie, bbsid, folderId);
        res.json({ success: true, data: { files } });
    } catch (error) {
        next(error);
    }
});

/**
 * 获取文件下载链接
 * GET /api/files/download
 * 查询参数：
 *   - fileId: 文件ID
 */
router.get('/download', async (req, res, next) => {
    try {
        const { fileId } = req.query;
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        if (!fileId) {
            throw new ApiError('fileId不能为空', 400, 'PARAM_ERROR');
        }

        const result = await fileService.downloadFile(cookie, fileId);
        res.json({
            success: true,
            data: {
                message: result.message,
                downloadUrl: result.downloadUrl,
                fileName: result.fileName,
                expires: result.expires // 添加过期时间
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 创建文件夹
 * POST /api/files/folder
 * 请求体：
 *   - dirName: 文件夹名称
 *   - parentId: 父文件夹ID，默认为根目录
 */
router.post('/folder', async (req, res, next) => {
    try {
        const { dirName, parentId = '-1' } = req.body;
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        if (!dirName) {
            throw new ApiError('dirName不能为空', 400, 'PARAM_ERROR');
        }

        const result = await fileService.makeDir(cookie, bbsid, dirName, parentId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * 上传文件
 * POST /api/files/upload
 * 请求体：
 *   - filePath: 文件路径
 *   - dirId: 目标文件夹ID，默认为根目录
 */
router.post('/upload', async (req, res, next) => {
    try {
        const { filePath, dirId = '-1' } = req.body;
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        if (!filePath) {
            throw new ApiError('filePath不能为空', 400, 'PARAM_ERROR');
        }

        const result = await fileService.uploadFile(cookie, bbsid, filePath, dirId);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
});

/**
 * 下载文件到本地
 * POST /api/files/download-local
 * 请求体：
 *   - fileId: 文件ID
 *   - outputPath: 输出路径（可选）
 */
router.post('/download-local', async (req, res, next) => {
    try {
        const { fileId, outputPath } = req.body;
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        if (!fileId) {
            throw new ApiError('fileId不能为空', 400, 'PARAM_ERROR');
        }

        const result = await fileService.downloadFileToLocal(cookie, bbsid, fileId, outputPath);
        res.json({
            success: true,
            data: {
                message: result.message,
                filePath: result.filePath,
                fileName: result.fileName
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * 删除文件或文件夹
 * DELETE /api/files
 * 查询参数：
 *   - resourceId: 资源ID（文件ID或文件夹ID）
 *   - isFolder: 可选，是否为文件夹（true/false），如果不提供则自动判断
 */
router.delete('/', async (req, res, next) => {
    try {
        const { resourceId, isFolder } = req.query;
        const cookie = process.env.COOKIE;
        const bbsid = process.env.BBSID;

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        if (!resourceId) {
            throw new ApiError('resourceId不能为空', 400, 'PARAM_ERROR');
        }

        // 转换isFolder参数
        let isFolderParam = null;
        if (isFolder !== undefined) {
            isFolderParam = isFolder === 'true';
        }

        const result = await fileService.deleteResource(cookie, bbsid, resourceId, isFolderParam);
        res.json({
            success: true,
            data: {
                message: result.message,
                resourceId: result.resourceId,
                type: result.type
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
