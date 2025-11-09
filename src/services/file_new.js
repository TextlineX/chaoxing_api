/**
 * 文件服务模块 - Cloudflare Pages Functions适配版
 * 处理文件列表、下载、上传等操作
 */

// 导入必要的Web API
import axios from 'axios';
import { FormData } from 'form-data';
import mime from 'mime-types';
import { createParamError, createServerError } from '../utils/error.js';
import config from '../config/index.js';

/**
 * 获取文件列表
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} folderId - 文件夹ID，默认为根目录
 * @returns {Promise<Array>} 文件列表
 */
export async function listFiles(cookie, bbsid, folderId = '-1') {
  if (!cookie || !bbsid) {
    throw createParamError('Cookie和Bbsid不能为空');
  }

  try {
    // 获取文件夹（recType=1）
    const folderResponse = await axios.get(
      `${config.API_BASE}/pc/resource/getResourceList`,
      { 
        params: { bbsid, folderId, recType: '1' },
        headers: { 
          'Cookie': cookie,
          'User-Agent': config.HEADERS.USER_AGENT,
          'Referer': config.HEADERS.REFERER
        }
      }
    );

    if (folderResponse.data.result !== 1) {
      throw new Error(folderResponse.data.msg || '获取文件夹失败');
    }

    // 获取文件（recType=2）
    const fileResponse = await axios.get(
      `${config.API_BASE}/pc/resource/getResourceList`,
      { 
        params: { bbsid, folderId, recType: '2' },
        headers: { 
          'Cookie': cookie,
          'User-Agent': config.HEADERS.USER_AGENT,
          'Referer': config.HEADERS.REFERER
        }
      }
    );

    if (fileResponse.data.result !== 1) {
      throw new Error(fileResponse.data.msg || '获取文件失败');
    }

    const files = [...(folderResponse.data.list || []), ...(fileResponse.data.list || [])];
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
export async function downloadFile(cookie, bbsid, fileId) {
  if (!cookie || !fileId) {
    throw createParamError('Cookie和fileId不能为空');
  }

  try {
    // 验证fileId格式
    if (!fileId.includes('$')) {
      throw createParamError('fileId格式错误，应为id$fileId格式');
    }

    const fileIdPart = fileId.split('$')[1];
    const response = await axios.post(
      `${config.DOWNLOAD_API}/screen/note_note/files/status/${fileIdPart}`,
      {},
      {
        headers: { 
          'Cookie': cookie,
          'User-Agent': config.HEADERS.USER_AGENT,
          'Referer': config.HEADERS.REFERER
        }
      }
    );

    if (response.data.status && response.data.download) {
      // 添加过期时间（5分钟后过期）
      const expires = Date.now() + (5 * 60 * 1000);
      const separator = response.data.download.includes('?') ? '&' : '?';
      const signedUrl = `${response.data.download}${separator}expires=${expires}`;

      // 获取文件名信息
      const fileName = response.data.name || `file_${fileIdPart}`;

      return {
        message: '获取下载链接成功',
        downloadUrl: signedUrl,
        fileName,
        expires: new Date(expires).toISOString()
      };
    } else {
      throw new Error(response.data.msg || '获取下载链接失败');
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
export async function downloadFileToLocal(cookie, bbsid, fileId, outputPath) {
  if (!cookie || !bbsid || !fileId) {
    throw createParamError('Cookie、Bbsid和fileId不能为空');
  }

  try {
    // 首先获取下载链接
    const downloadInfo = await downloadFile(cookie, bbsid, fileId);
    const { downloadUrl, fileName } = downloadInfo;

    // 在Cloudflare环境中，我们无法直接写入文件系统
    // 这里只返回下载信息，由客户端处理实际下载
    return {
      message: '文件下载信息已获取',
      downloadUrl,
      fileName,
      note: '在Cloudflare环境中，无法直接写入文件系统，请使用提供的下载链接进行下载'
    };
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
export async function makeDir(cookie, bbsid, dirName, parentId = '-1') {
  if (!cookie || !bbsid || !dirName) {
    throw createParamError('Cookie、Bbsid和dirName不能为空');
  }

  try {
    const response = await axios.get(
      `${config.API_BASE}/pc/resource/addResourceFolder`,
      { 
        params: { bbsid, name: dirName, pid: parentId },
        headers: { 
          'Cookie': cookie,
          'User-Agent': config.HEADERS.USER_AGENT,
          'Referer': config.HEADERS.REFERER
        }
      }
    );

    if (response.data.result === 1) {
      return {
        message: '创建文件夹成功',
        folderId: response.data.id
      };
    } else {
      throw new Error(response.data.msg || '创建文件夹失败');
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
export async function uploadFile(cookie, bbsid, filePath, dirId = '-1') {
  if (!cookie || !bbsid || !filePath) {
    throw createParamError('Cookie、Bbsid和filePath不能为空');
  }

  // 在Cloudflare环境中，我们无法直接访问文件系统
  throw createServerError('在Cloudflare环境中，无法直接访问文件系统，请使用uploadFileWithBuffer方法');
}

/**
 * 使用缓冲区上传文件
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {ArrayBuffer} buffer - 文件缓冲区
 * @param {string} fileName - 文件名
 * @param {string} dirId - 目标文件夹ID，默认为根目录
 * @returns {Promise<Object>} 上传结果
 */
export async function uploadFileWithBuffer(cookie, bbsid, buffer, fileName, dirId = '-1') {
  if (!cookie || !bbsid || !buffer || !fileName) {
    throw createParamError('Cookie、Bbsid、buffer和fileName不能为空');
  }

  try {
    // 获取上传配置
    const configResponse = await axios.get(
      `${config.DOWNLOAD_API}/pc/files/getUploadConfig`,
      {},
      {
        headers: { 
          'Cookie': cookie,
          'User-Agent': config.HEADERS.USER_AGENT,
          'Referer': config.HEADERS.REFERER
        }
      }
    );

    if (configResponse.data.result !== 1) {
      throw new Error(configResponse.data.msg || '获取上传配置失败');
    }

    const { puid, token } = configResponse.data.msg;
    const mimeType = mime.lookup(fileName) || 'application/octet-stream';

    // 创建FormData
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: fileName,
      contentType: mimeType
    });
    formData.append('_token', token);
    formData.append('puid', puid.toString());

    // 上传文件
    const uploadResponse = await axios.post(
      `${config.UPLOAD_API}/upload`,
      formData,
      {
        headers: { 
          'Cookie': cookie,
          'User-Agent': config.HEADERS.USER_AGENT,
          'Referer': config.HEADERS.REFERER,
          ...formData.getHeaders()
        }
      }
    );

    if (uploadResponse.data.msg !== 'success') {
      throw new Error(uploadResponse.data.msg || '上传失败');
    }

    // 确认上传
    const uploadDoneParam = {
      key: uploadResponse.data.objectId,
      cataid: '100000019',
      param: uploadResponse.data.data
    };
    const params = encodeURIComponent(JSON.stringify([uploadDoneParam]));

    const addResponse = await axios.get(
      `${config.API_BASE}/pc/resource/addResource`,
      { 
        params: { bbsid, pid: dirId, type: 'yunpan', params },
        headers: { 
          'Cookie': cookie,
          'User-Agent': config.HEADERS.USER_AGENT,
          'Referer': config.HEADERS.REFERER
        }
      }
    );

    if (addResponse.data.result === 1) {
      return {
        message: '上传成功',
        fileId: addResponse.data.id
      };
    } else {
      throw new Error(addResponse.data.msg || '确认上传失败');
    }
  } catch (error) {
    throw createServerError(`上传文件失败: ${error.message}`);
  }
}

/**
 * 删除文件或文件夹
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} resourceId - 资源ID，可以是文件ID或文件夹ID
 * @param {boolean} isFolder - 是否为文件夹
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteResource(cookie, bbsid, resourceId, isFolder) {
  if (!cookie || !bbsid || !resourceId) {
    throw createParamError('Cookie、Bbsid和resourceId不能为空');
  }

  try {
    let query;
    if (isFolder === true) {
      // 删除文件夹
      query = {
        bbsid,
        resIds: resourceId,
        isFolder: 1
      };
    } else {
      // 删除文件
      const recId = resourceId.split('$')[0];
      query = {
        bbsid,
        resIds: recId,
        isFolder: 0
      };
    }

    const response = await axios.get(
      `${config.API_BASE}/pc/resource/deleteResource`,
      { 
        params: query,
        headers: { 
          'Cookie': cookie,
          'User-Agent': config.HEADERS.USER_AGENT,
          'Referer': config.HEADERS.REFERER
        }
      }
    );

    if (response.data.result === 1) {
      return {
        message: '删除成功',
        resourceId,
        type: isFolder === true ? '文件夹' : '文件'
      };
    } else {
      throw new Error(response.data.msg || '删除失败');
    }
  } catch (error) {
    throw createServerError(`删除失败: ${error.message}`);
  }
}

/**
 * 移动文件或文件夹
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {string} resourceId - 资源ID，可以是文件ID或文件夹ID
 * @param {string} targetId - 目标文件夹ID
 * @param {boolean} isFolder - 是否为文件夹
 * @returns {Promise<Object>} 移动结果
 */
export async function moveResource(cookie, bbsid, resourceId, targetId, isFolder) {
  if (!cookie || !bbsid || !resourceId || !targetId) {
    throw createParamError('Cookie、Bbsid、resourceId和targetId不能为空');
  }

  try {
    let query;
    if (isFolder === true) {
      // 移动文件夹
      query = {
        bbsid,
        resIds: resourceId,
        targetId,
        isFolder: 1
      };
    } else {
      // 移动文件
      const recId = resourceId.split('$')[0];
      query = {
        bbsid,
        resIds: recId,
        targetId,
        isFolder: 0
      };
    }

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

    if (response.data.result === 1) {
      return {
        message: '移动成功',
        resourceId,
        targetId,
        type: isFolder === true ? '文件夹' : '文件'
      };
    } else {
      throw new Error(response.data.msg || '移动失败');
    }
  } catch (error) {
    throw createServerError(`移动失败: ${error.message}`);
  }
}

/**
 * 批量移动文件或文件夹
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @param {Array<string>} resourceIds - 资源ID数组
 * @param {string} targetId - 目标文件夹ID
 * @param {boolean} isFolder - 是否为文件夹
 * @returns {Promise<Object>} 批量移动结果
 */
export async function batchMoveResources(cookie, bbsid, resourceIds, targetId, isFolder) {
  if (!cookie || !bbsid || !resourceIds || !resourceIds.length || !targetId) {
    throw createParamError('Cookie、Bbsid、resourceIds和targetId不能为空');
  }

  try {
    let query;
    if (isFolder === true) {
      // 移动文件夹
      query = {
        bbsid,
        resIds: resourceIds.join(','),
        targetId,
        isFolder: 1
      };
    } else {
      // 移动文件
      const recIds = resourceIds.map(id => id.split('$')[0]);
      query = {
        bbsid,
        resIds: recIds.join(','),
        targetId,
        isFolder: 0
      };
    }

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

    if (response.data.result === 1) {
      return {
        message: '批量移动成功',
        resourceIds,
        targetId,
        movedCount: resourceIds.length
      };
    } else {
      throw new Error(response.data.msg || '批量移动失败');
    }
  } catch (error) {
    throw createServerError(`批量移动失败: ${error.message}`);
  }
}

/**
 * 获取上传配置
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @returns {Promise<Object>} 上传配置
 */
export async function getUploadConfig(cookie, bbsid) {
  if (!cookie || !bbsid) {
    throw createParamError('Cookie和Bbsid不能为空');
  }

  try {
    const response = await axios.get(
      `${config.DOWNLOAD_API}/pc/files/getUploadConfig`,
      {},
      {
        headers: { 
          'Cookie': cookie,
          'User-Agent': config.HEADERS.USER_AGENT,
          'Referer': config.HEADERS.REFERER
        }
      }
    );

    if (response.data.result === 1) {
      return {
        message: '获取上传配置成功',
        config: response.data.msg
      };
    } else {
      throw new Error(response.data.msg || '获取上传配置失败');
    }
  } catch (error) {
    throw createServerError(`获取上传配置失败: ${error.message}`);
  }
}
