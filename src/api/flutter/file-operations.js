/**
 * 文件操作模块
 * 处理文件列表、下载、创建文件夹等操作
 */

const fileService = require('../../services/file');
const { createParamError } = require('../../utils/error');

/**
 * 获取文件列表
 */
async function listFiles(cookie, bbsid, params) {
    const { folderId = '-1' } = params || {};
    return await fileService.listFiles(cookie, bbsid, folderId);
}

/**
 * 下载文件
 */
async function downloadFile(cookie, bbsid, params) {
    const { fileId } = params || {};
    if (!fileId) {
        throw createParamError('fileId参数不能为空');
    }
    return await fileService.downloadFile(cookie, bbsid, fileId);
}

/**
 * 创建文件夹
 */
async function createFolder(cookie, bbsid, params) {
    const { dirName, parentId = '-1' } = params || {};
    if (!dirName) {
        throw createParamError('dirName参数不能为空');
    }
    return await fileService.makeDir(cookie, bbsid, dirName, parentId);
}

/**
 * 下载文件到本地
 */
async function downloadFileToLocal(cookie, bbsid, params) {
    const { fileId: dlFileId, outputPath } = params || {};
    if (!dlFileId) {
        throw createParamError('fileId参数不能为空');
    }
    return await fileService.downloadFileToLocal(cookie, bbsid, dlFileId, outputPath);
}

module.exports = {
    listFiles,
    downloadFile,
    createFolder,
    downloadFileToLocal
};