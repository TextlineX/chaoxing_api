/**
 * 资源操作模块
 * 处理资源移动、删除等操作
 */

const { createParamError } = require('../../utils/error');
const config = require('../../config');
const fileService = require('../../services/file');

/**
 * 删除资源
 */
async function deleteResource(cookie, bbsid, params) {
    const { resourceId, isFolder } = params || {};
    if (!resourceId) {
        throw createParamError('resourceId参数不能为空');
    }
    // 转换isFolder参数
    let isFolderParam = null;
    if (isFolder !== undefined) {
        isFolderParam = isFolder === 'true' || isFolder === true;
    }
    return await fileService.deleteResource(cookie, bbsid, resourceId, isFolderParam);
}

/**
 * 移动资源
 */
async function moveResource(cookie, bbsid, params) {
    const { resourceId: moveResourceId, targetId, isFolder: moveIsFolder } = params || {};
    if (!moveResourceId) {
        throw createParamError('resourceId参数不能为空');
    }
    if (!targetId) {
        throw createParamError('targetId参数不能为空');
    }
    return await moveResourceFunc(cookie, bbsid, moveResourceId, targetId, moveIsFolder);
}

/**
 * 批量移动资源
 */
async function batchMoveResources(cookie, bbsid, params) {
    const { resourceIds: batchResourceIds, targetId: batchTargetId, isFolder: batchIsFolder } = params || {};
    if (!batchResourceIds || !Array.isArray(batchResourceIds) || batchResourceIds.length === 0) {
        throw createParamError('resourceIds参数不能为空且必须是数组');
    }
    if (!batchTargetId) {
        throw createParamError('targetId参数不能为空');
    }
    return await batchMoveResourcesFunc(cookie, bbsid, batchResourceIds, batchTargetId, batchIsFolder);
}

/**
 * 移动文件或文件夹
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} resourceId - 资源ID（文件ID或文件夹ID）
 * @param {string} targetId - 目标文件夹ID
 * @param {boolean|null} isFolder - 是否为文件夹，true为文件夹，false为文件，null为自动判断
 * @returns {Promise<Object>} 移动结果
 */
async function moveResourceFunc(cookie, bbsid, resourceId, targetId, isFolder = null) {
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
async function batchMoveResourcesFunc(cookie, bbsid, resourceIds, targetId, isFolder = null) {
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

// 从utils/error导入createServerError
function createServerError(message = '服务器内部错误') {
    const error = new Error(message);
    error.statusCode = 500;
    error.code = 'SERVER_ERROR';
    return error;
}

module.exports = {
    deleteResource,
    moveResource,
    batchMoveResources
};