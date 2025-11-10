/**
 * 文件服务模块
 * 处理文件列表、下载、上传等操作
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const mime = require('mime-types');
const http = require('../utils/http');
const { createParamError, createServerError } = require('../utils/error');
const config = require('../config');

/**
 * 获取文件列表
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} folderId - 文件夹ID，默认为根目录
 * @returns {Promise<Array>} 文件列表
 */
async function listFiles(cookie, bbsid, folderId = '-1') {
    if (!cookie || !bbsid) {
        throw createParamError('Cookie和Bbsid不能为空');
    }

    try {
        // 获取文件夹（recType=1）
        const folderResponse = await http.get(
            `${config.API_BASE}/pc/resource/getResourceList`,
            { bbsid, folderId, recType: '1' },
            cookie
        );

        if (folderResponse.result !== 1) {
            throw new Error(folderResponse.msg || '获取文件夹失败');
        }

        // 获取文件（recType=2）
        const fileResponse = await http.get(
            `${config.API_BASE}/pc/resource/getResourceList`,
            { bbsid, folderId, recType: '2' },
            cookie
        );

        if (fileResponse.result !== 1) {
            throw new Error(fileResponse.msg || '获取文件失败');
        }

        const files = [...(folderResponse.list || []), ...(fileResponse.list || [])];
        return files.map(file => {
            const isFolder = file.content.folderName?.length > 0;

            // 获取文件名，如果是URL编码则解码
            let fileName = isFolder ? file.content.folderName : file.content.name;
            try {
                // 检查是否是URL编码的字符串
                if (fileName && fileName.includes('%')) {
                    // 尝试解码
                    fileName = decodeURIComponent(fileName);
                }
            } catch (e) {
                // 如果解码失败，保持原样
                console.warn('文件名解码失败:', fileName, e);
            }

            return {
                name: fileName,
                type: isFolder ? '文件夹' : (file.content.suffix || file.content.filetype || '未知'),
                size: isFolder ? '-' : (file.content.size || 0),
                uploadTime: new Date(file.content.uploadDate || file.inserttime).toLocaleString(),
                id: isFolder ? file.id.toString() : `${file.id}$${file.content.fileId || file.content.objectId}`
            };
        });
    } catch (error) {
        throw createServerError(`获取文件列表失败: ${error.message}`);
    }
}

/**
 * 获取文件下载链接
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} fileId - 文件ID，格式为id$fileId
 * @returns {Promise<Object>} 下载链接信息
 */
async function downloadFile(cookie, bbsid, fileId) {
    if (!cookie || !fileId) {
        throw createParamError('Cookie和fileId不能为空');
    }

    try {
        // 验证fileId格式
        if (!fileId.includes('$')) {
            throw createParamError('fileId格式错误，应为id$fileId格式');
        }

        const fileIdPart = fileId.split('$')[1];
        const response = await http.post(
            `${config.DOWNLOAD_API}/screen/note_note/files/status/${fileIdPart}`,
            {},
            cookie
        );

        if (response.status && response.download) {
            // 添加过期时间（5分钟后过期）
            const expires = Date.now() + (5 * 60 * 1000);
            const separator = response.download.includes('?') ? '&' : '?';
            const signedUrl = `${response.download}${separator}expires=${expires}`;

            // 获取文件名信息
            const fileName = response.name || `file_${fileIdPart}`;

            return {
                message: '获取下载链接成功',
                downloadUrl: signedUrl,
                fileName,
                expires: new Date(expires).toISOString()
            };
        } else {
            throw new Error(response.msg || '获取下载链接失败');
        }
    } catch (error) {
        throw createServerError(`获取下载链接失败: ${error.message}`);
    }
}

/**
 * 下载文件到本地
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} fileId - 文件ID，格式为id$fileId
 * @param {string} outputPath - 输出文件路径，如果未指定则使用默认路径
 * @returns {Promise<Object>} 下载结果
 */
async function downloadFileToLocal(cookie, bbsid, fileId, outputPath) {
    if (!cookie || !bbsid || !fileId) {
        throw createParamError('Cookie、Bbsid和fileId不能为空');
    }

    try {
        // 首先获取下载链接
        const downloadInfo = await downloadFile(cookie, bbsid, fileId);
        const { downloadUrl, fileName } = downloadInfo;

        // 如果未指定输出路径，使用默认路径
        if (!outputPath) {
            const fs = require('fs');
            const path = require('path');
            const downloadDir = path.join(process.cwd(), 'download');

            // 确保下载目录存在
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }

            // 使用原始文件名，如果没有则使用默认名称
            outputPath = path.join(downloadDir, fileName || `file_${fileId.split('$')[1]}`);
        }

        // 使用axios下载文件
        const axios = require('axios');
        const fs = require('fs');

        const response = await axios({
            method: 'get',
            url: downloadUrl,
            headers: {
                'Cookie': cookie,
                'User-Agent': config.HEADERS.USER_AGENT,
                'Referer': config.HEADERS.REFERER
            },
            responseType: 'stream'
        });

        // 将文件流写入本地
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                resolve({
                    message: '文件下载完成',
                    filePath: outputPath,
                    fileName: fileName
                });
            });
            writer.on('error', (err) => {
                reject(new Error(`文件写入失败: ${err.message}`));
            });
        });
    } catch (error) {
        throw createServerError(`文件下载失败: ${error.message}`);
    }
}

/**
 * 创建文件夹
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} dirName - 文件夹名称
 * @param {string} parentId - 父文件夹ID，默认为根目录
 * @returns {Promise<Object>} 创建结果
 */
async function makeDir(cookie, bbsid, dirName, parentId = '-1') {
    if (!cookie || !bbsid || !dirName) {
        throw createParamError('Cookie、Bbsid和dirName不能为空');
    }

    try {
        const response = await http.get(
            `${config.API_BASE}/pc/resource/addResourceFolder`,
            { bbsid, name: dirName, pid: parentId },
            cookie
        );

        if (response.result === 1) {
            return {
                message: '创建文件夹成功',
                folderId: response.id
            };
        } else {
            throw new Error(response.msg || '创建文件夹失败');
        }
    } catch (error) {
        throw createServerError(`创建文件夹失败: ${error.message}`);
    }
}

/**
 * 上传文件
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} filePath - 文件路径
 * @param {string} dirId - 目标文件夹ID，默认为根目录
 * @returns {Promise<Object>} 上传结果
 */
async function uploadFile(cookie, bbsid, filePath, dirId = '-1') {
    if (!cookie || !bbsid || !filePath) {
        throw createParamError('Cookie、Bbsid和filePath不能为空');
    }

    if (!fs.existsSync(filePath)) {
        throw createParamError('文件不存在');
    }

    try {
        console.log(`开始上传文件: ${filePath} 到目录: ${dirId}`);
        
        // 获取上传配置
        console.log('正在获取上传配置...');
        const configResponse = await http.get(
            `${config.DOWNLOAD_API}/pc/files/getUploadConfig`,
            {},
            cookie
        );

        if (configResponse.result !== 1) {
            throw new Error(configResponse.msg || '获取上传配置失败');
        }
        
        console.log('上传配置获取成功:', configResponse.msg);

        const { puid, token } = configResponse.msg;
        const fileName = path.basename(filePath);
        const mimeType = mime.lookup(filePath) || 'application/octet-stream';
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), {
            filename: fileName,
            contentType: mimeType
        });
        formData.append('_token', token);
        formData.append('puid', puid.toString());

        // 上传文件
        console.log('开始上传文件到存储服务器...');
        const uploadResponse = await http.post(
            `${config.UPLOAD_API}/upload`,
            formData,
            cookie,
            { ...formData.getHeaders() }
        );
        
        console.log('文件上传响应:', JSON.stringify(uploadResponse, null, 2));

        if (uploadResponse.msg !== 'success') {
            throw new Error(uploadResponse.msg || '上传失败');
        }

        // 确认上传
        console.log('开始构造确认上传参数...');
        const uploadDoneParam = {
            key: uploadResponse.objectId,
            cataid: '100000019',
            param: {
                ...uploadResponse.data,
                name: fileName // 确保使用原始文件名
            }
        };
        
        const params = encodeURIComponent(JSON.stringify([uploadDoneParam]));
        
        console.log('确认上传参数:', params);
        console.log('开始确认上传到资源列表...');
        
        // 记录请求参数以便调试
        const confirmParams = { 
            bbsid, 
            pid: dirId, 
            type: 'yunpan', 
            params 
        };
        console.log('确认上传请求参数:', JSON.stringify(confirmParams, null, 2));
        
        const addResponse = await http.get(
            `${config.API_BASE}/pc/resource/addResource`,
            confirmParams,
            cookie
        );
        
        console.log('确认上传响应:', JSON.stringify(addResponse, null, 2));

        if (addResponse.result === 1) {
            console.log('文件上传成功:', addResponse.id);
            return {
                message: '上传成功',
                fileId: addResponse.id
            };
        } else {
            // 明确指出这是确认步骤失败
            console.error('确认上传失败，错误信息:', addResponse.msg);
            throw new Error(`确认上传失败: ${addResponse.msg || '未知错误'}`);
        }
    } catch (error) {
        console.error('上传文件过程中发生错误:', error);
        // 区分不同阶段的错误
        if (error.message.includes('确认上传失败')) {
            throw error;
        } else {
            throw createServerError(`上传文件失败: ${error.message}`);
        }
    }
}

/**
 * 使用原始文件名上传文件
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} filePath - 文件路径
 * @param {string} originalName - 原始文件名
 * @param {string} dirId - 目标文件夹ID，默认为根目录
 * @returns {Promise<Object>} 上传结果
 */
async function uploadFileWithOriginalName(cookie, bbsid, filePath, originalName, dirId = '-1') {
    if (!cookie || !bbsid || !filePath) {
        throw createParamError('Cookie、Bbsid和filePath不能为空');
    }

    if (!fs.existsSync(filePath)) {
        throw createParamError('文件不存在');
    }

    try {
        console.log(`开始上传文件: ${filePath} (原始文件名: ${originalName}) 到目录: ${dirId}`);
        
        // 获取上传配置
        console.log('正在获取上传配置...');
        const configResponse = await http.get(
            `${config.DOWNLOAD_API}/pc/files/getUploadConfig`,
            {},
            cookie
        );

        if (configResponse.result !== 1) {
            throw new Error(configResponse.msg || '获取上传配置失败');
        }
        
        console.log('上传配置获取成功:', configResponse.msg);

        const { puid, token } = configResponse.msg;
        // 使用原始文件名获取MIME类型
        const mimeType = mime.lookup(originalName) || 'application/octet-stream';
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), {
            filename: originalName,
            contentType: mimeType
        });
        formData.append('_token', token);
        formData.append('puid', puid.toString());

        // 上传文件
        console.log('开始上传文件到存储服务器...');
        const uploadResponse = await http.post(
            `${config.UPLOAD_API}/upload`,
            formData,
            cookie,
            { ...formData.getHeaders() }
        );
        
        console.log('文件上传响应:', JSON.stringify(uploadResponse, null, 2));

        if (uploadResponse.msg !== 'success') {
            throw new Error(uploadResponse.msg || '上传失败');
        }

        // 确认上传
        console.log('开始构造确认上传参数...');
        const uploadDoneParam = {
            key: uploadResponse.objectId,
            cataid: '100000019',
            param: {
                ...uploadResponse.data,
                name: originalName // 确保使用原始文件名
            }
        };
        
        const params = encodeURIComponent(JSON.stringify([uploadDoneParam]));
        
        console.log('确认上传参数:', params);
        console.log('开始确认上传到资源列表...');
        
        // 记录请求参数以便调试
        const confirmParams = { 
            bbsid, 
            pid: dirId, 
            type: 'yunpan', 
            params 
        };
        console.log('确认上传请求参数:', JSON.stringify(confirmParams, null, 2));
        
        const addResponse = await http.get(
            `${config.API_BASE}/pc/resource/addResource`,
            confirmParams,
            cookie
        );
        
        console.log('确认上传响应:', JSON.stringify(addResponse, null, 2));

        if (addResponse.result === 1) {
            console.log('文件上传成功:', addResponse.id);
            return {
                message: '上传成功',
                fileId: addResponse.id
            };
        } else {
            // 明确指出这是确认步骤失败
            console.error('确认上传失败，错误信息:', addResponse.msg);
            throw new Error(`确认上传失败: ${addResponse.msg || '未知错误'}`);
        }
    } catch (error) {
        console.error('上传文件过程中发生错误:', error);
        // 区分不同阶段的错误
        if (error.message.includes('确认上传失败')) {
            throw error;
        } else {
            throw createServerError(`上传文件失败: ${error.message}`);
        }
    }
}

/**
 * 删除文件或文件夹
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} resourceId - 资源ID，可以是文件ID或文件夹ID
 * @param {boolean|null} isFolder - 是否为文件夹，true为文件夹，false为文件，null为自动判断
 * @returns {Promise<Object>} 删除结果
 */
async function deleteResource(cookie, bbsid, resourceId, isFolder = null) {
    if (!cookie || !bbsid || !resourceId) {
        throw createParamError('Cookie、Bbsid和resourceId不能为空');
    }

    try {
        let path, query;

        // 根据资源类型选择不同的API路径和参数
        if (isFolder === true) {
            // 删除文件夹
            path = '/pc/resource/deleteResourceFolder';
            query = { bbsid, folderIds: resourceId };
        } else if (isFolder === false) {
            // 删除文件
            path = '/pc/resource/deleteResourceFile';
            // 文件ID格式为 "id$fileId"，我们只需要第一部分
            const recId = resourceId.split('$')[0];
            query = { bbsid, recIds: recId };
        } else {
            // 自动判断：如果包含$符号，则为文件，否则为文件夹
            if (resourceId.includes('$')) {
                path = '/pc/resource/deleteResourceFile';
                const recId = resourceId.split('$')[0];
                query = { bbsid, recIds: recId };
            } else {
                path = '/pc/resource/deleteResourceFolder';
                query = { bbsid, folderIds: resourceId };
            }
        }

        const response = await http.get(
            `${config.API_BASE}${path}`,
            query,
            cookie
        );

        if (response.result === 1) {
            return {
                message: '删除成功',
                resourceId,
                type: isFolder === true ? '文件夹' : (isFolder === false ? '文件' : 
                      (resourceId.includes('$') ? '文件' : '文件夹'))
            };
        } else {
            throw new Error(response.msg || '删除失败');
        }
    } catch (error) {
        throw createServerError(`删除资源失败: ${error.message}`);
    }
}

/**
 * 获取上传配置
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @returns {Promise<Object>} 上传配置信息
 */
async function getUploadConfig(cookie, bbsid) {
    if (!cookie || !bbsid) {
        throw createParamError('Cookie和Bbsid不能为空');
    }

    try {
        const configResponse = await http.get(
            `${config.DOWNLOAD_API}/pc/files/getUploadConfig`,
            {},
            cookie
        );

        if (configResponse.result !== 1) {
            throw new Error(configResponse.msg || '获取上传配置失败');
        }

        return configResponse;
    } catch (error) {
        throw createServerError(`获取上传配置失败: ${error.message}`);
    }
}

/**
 * 从内存缓冲区上传文件
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {Buffer} buffer - 文件数据缓冲区
 * @param {string} originalName - 原始文件名
 * @param {string} dirId - 目标文件夹ID，默认为根目录
 * @returns {Promise<Object>} 上传结果
 */
async function uploadFileFromBuffer(cookie, bbsid, buffer, originalName, dirId = '-1') {
    if (!cookie || !bbsid || !buffer || !originalName) {
        throw createParamError('Cookie、Bbsid、buffer和originalName不能为空');
    }

    try {
        console.log(`开始上传缓冲区数据 (原始文件名: ${originalName}) 到目录: ${dirId}`);
        
        // 获取上传配置
        console.log('正在获取上传配置...');
        const configResponse = await http.get(
            `${config.DOWNLOAD_API}/pc/files/getUploadConfig`,
            {},
            cookie
        );

        if (configResponse.result !== 1) {
            throw new Error(configResponse.msg || '获取上传配置失败');
        }
        
        console.log('上传配置获取成功:', configResponse.msg);

        const { puid, token } = configResponse.msg;
        const mimeType = mime.lookup(originalName) || 'application/octet-stream';
        const formData = new FormData();
        formData.append('file', buffer, {
            filename: originalName,
            contentType: mimeType
        });
        formData.append('_token', token);
        formData.append('puid', puid.toString());

        // 上传文件
        console.log('开始上传文件到存储服务器...');
        const uploadResponse = await http.post(
            `${config.UPLOAD_API}/upload`,
            formData,
            cookie,
            { ...formData.getHeaders() }
        );
        
        console.log('文件上传响应:', JSON.stringify(uploadResponse, null, 2));

        if (uploadResponse.msg !== 'success') {
            throw new Error(uploadResponse.msg || '上传失败');
        }

        // 确认上传
        console.log('开始构造确认上传参数...');
        const uploadDoneParam = {
            key: uploadResponse.objectId,
            cataid: '100000019',
            param: {
                ...uploadResponse.data,
                name: originalName // 确保使用原始文件名
            }
        };
        
        const params = encodeURIComponent(JSON.stringify([uploadDoneParam]));
        
        console.log('确认上传参数:', params);
        console.log('开始确认上传到资源列表...');
        
        // 记录请求参数以便调试
        const confirmParams = { 
            bbsid, 
            pid: dirId, 
            type: 'yunpan', 
            params 
        };
        console.log('确认上传请求参数:', JSON.stringify(confirmParams, null, 2));
        
        const addResponse = await http.get(
            `${config.API_BASE}/pc/resource/addResource`,
            confirmParams,
            cookie
        );
        
        console.log('确认上传响应:', JSON.stringify(addResponse, null, 2));

        if (addResponse.result === 1) {
            console.log('文件上传成功:', addResponse.id);
            return {
                message: '上传成功',
                fileId: addResponse.id
            };
        } else {
            // 明确指出这是确认步骤失败
            console.error('确认上传失败，错误信息:', addResponse.msg);
            throw new Error(`确认上传失败: ${addResponse.msg || '未知错误'}`);
        }
    } catch (error) {
        console.error('上传文件过程中发生错误:', error);
        // 区分不同阶段的错误
        if (error.message.includes('确认上传失败')) {
            throw error;
        } else {
            throw createServerError(`上传文件失败: ${error.message}`);
        }
    }
}

/**
 * 验证上传文件是否真实存在于服务器上
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} objectId - 文件objectId
 * @returns {Promise<boolean>} 验证结果
 */
async function verifyUploadedFile(cookie, bbsid, objectId) {
    try {
        // 这里可以实现验证逻辑
        // 例如通过查询文件列表或调用特定的验证接口
        console.log(`验证文件 objectId: ${objectId}`);
        // 暂时返回true，实际项目中应该实现真正的验证逻辑
        return true;
    } catch (error) {
        console.error('文件验证失败:', error);
        return false;
    }
}

module.exports = {
    listFiles,
    downloadFile,
    downloadFileToLocal,
    makeDir,
    uploadFile,
    uploadFileWithOriginalName,
    uploadFileFromBuffer,
    deleteResource,
    getUploadConfig,
    verifyUploadedFile
};
