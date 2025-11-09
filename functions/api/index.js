/**
 * Cloudflare Pages Functions API入口
 * 直接使用Web API实现，不依赖Node.js模块
 */

// 导入必要的Web API
import { fileService } from '../../src/services/file_new.js';
import { ApiError, createParamError } from '../../src/utils/error.js';

// 处理API请求
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Bbsid'
  };

  // 处理OPTIONS请求
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // 从请求头获取认证信息
  const cookie = context.request.headers.get('cookie') || '';
  const bbsid = context.request.headers.get('bbsid') || '';

  if (!cookie || !bbsid) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: '认证信息不完整，请提供Cookie和Bbsid'
      }
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...headers }
    });
  }

  try {
    // 处理请求体
    let body = {};
    if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
      try {
        body = await context.request.json();
      } catch (e) {
        // 如果不是JSON，尝试解析表单数据
        const text = await context.request.text();
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) {
          body[key] = value;
        }
      }
    }

    // 根据路径处理请求
    if (path === '/api/files') {
      // 获取文件列表
      const folderId = url.searchParams.get('folderId') || '-1';
      const files = await fileService.listFiles(cookie, bbsid, folderId);

      return new Response(JSON.stringify({
        success: true,
        data: { files }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...headers }
      });
    } else if (path === '/api/files/download') {
      // 获取下载链接
      const fileId = url.searchParams.get('fileId');
      if (!fileId) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'PARAM_ERROR',
            message: 'fileId不能为空'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...headers }
        });
      }

      const result = await fileService.downloadFile(cookie, bbsid, fileId);
      return new Response(JSON.stringify({
        success: true,
        data: {
          message: result.message,
          downloadUrl: result.downloadUrl,
          fileName: result.fileName,
          expires: result.expires
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...headers }
      });
    } else if (path === '/api/files/folder') {
      // 创建文件夹
      if (context.request.method !== 'POST') {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: '只支持POST方法'
          }
        }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...headers }
        });
      }

      const dirName = body.dirName;
      const parentId = body.parentId || '-1';

      if (!dirName) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'PARAM_ERROR',
            message: 'dirName不能为空'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...headers }
        });
      }

      const result = await fileService.makeDir(cookie, bbsid, dirName, parentId);
      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...headers }
      });
    } else if (path === '/api/files/upload') {
      // 上传文件
      if (context.request.method !== 'POST') {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: '只支持POST方法'
          }
        }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...headers }
        });
      }

      const dirId = body.dirId || '-1';

      // 处理文件上传
      if (context.request.headers.get('content-type')?.includes('multipart/form-data')) {
        const formData = await context.request.formData();
        for (const [name, value] of formData.entries()) {
          if (value instanceof File) {
            const arrayBuffer = await value.arrayBuffer();
            const result = await fileService.uploadFileWithBuffer(cookie, bbsid, arrayBuffer, value.name, dirId);
            return new Response(JSON.stringify({
              success: true,
              data: result
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...headers }
            });
          }
        }
      } else {
        // 使用文件路径参数
        const filePath = body.filePath;
        if (!filePath) {
          return new Response(JSON.stringify({
            success: false,
            error: {
              code: 'PARAM_ERROR',
              message: 'filePath不能为空'
            }
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...headers }
          });
        }

        const result = await fileService.uploadFile(cookie, bbsid, filePath, dirId);
        return new Response(JSON.stringify({
          success: true,
          data: result
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...headers }
        });
      }
    } else if (path === '/api/files/download-local') {
      // 下载文件到本地
      if (context.request.method !== 'POST') {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: '只支持POST方法'
          }
        }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...headers }
        });
      }

      const fileId = body.fileId;
      const outputPath = body.outputPath;

      if (!fileId) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'PARAM_ERROR',
            message: 'fileId不能为空'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...headers }
        });
      }

      const result = await fileService.downloadFileToLocal(cookie, bbsid, fileId, outputPath);
      return new Response(JSON.stringify({
        success: true,
        data: {
          message: result.message,
          filePath: result.filePath,
          fileName: result.fileName
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...headers }
      });
    } else if (path === '/api/files') {
      // 删除文件或文件夹
      if (context.request.method !== 'DELETE') {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: '只支持DELETE方法'
          }
        }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...headers }
        });
      }

      const resourceId = url.searchParams.get('resourceId');
      const isFolderParam = url.searchParams.get('isFolder');

      if (!resourceId) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'PARAM_ERROR',
            message: 'resourceId不能为空'
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...headers }
        });
      }

      // 转换isFolder参数
      let isFolder = null;
      if (isFolderParam !== undefined) {
        isFolder = isFolderParam === 'true';
      }

      const result = await fileService.deleteResource(cookie, bbsid, resourceId, isFolder);
      return new Response(JSON.stringify({
        success: true,
        data: {
          message: result.message,
          resourceId: result.resourceId,
          type: result.type
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...headers }
      });
    } else {
      // 返回404
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '请求的API不存在'
        }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...headers }
      });
    }
  } catch (error) {
    console.error('API错误:', error);
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: error.code || 'SERVER_ERROR',
        message: error.message || '服务器内部错误'
      }
    }), {
      status: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json', ...headers }
    });
  }
}
