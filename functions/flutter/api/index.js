/**
 * Cloudflare Pages Functions Flutter API入口
 * 将Node.js Express Flutter API适配到Cloudflare Pages Functions环境
 */

const express = require('express');
const multer = require('multer');
const fileService = require('../../../src/services/file_new');
const { ApiError, createParamError } = require('../../../src/utils/error');
const config = require('../../../src/config');

// 创建Express路由
const router = express.Router();

// 配置multer中间件
const upload = multer({
  dest: '/tmp/', // Cloudflare Functions临时目录
  limits: {
    fileSize: 100 * 1024 * 1024 // 限制文件大小为100MB
  }
});

// 获取预签名下载URL
router.post('/get-download-url', async (req, res, next) => {
  try {
    const { fileId } = req.body;
    const cookie = req.headers.cookie || '';
    const bbsid = req.headers.bbsid || '';

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
});

// 统一API入口
router.post('/api', upload.any(), async (req, res, next) => {
  try {
    const { action, params } = req.body;

    // 验证请求格式
    if (!action) {
      throw createParamError('action参数不能为空');
    }

    // 从请求头获取认证信息
    const cookie = req.headers.cookie || '';
    const bbsid = req.headers.bbsid || '';

    if (!cookie || !bbsid) {
      throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
    }

    let result;

    // 根据action参数执行相应操作
    switch (action) {
      case 'listFiles':
        const { folderId = '-1' } = params || {};
        result = await fileService.listFiles(cookie, bbsid, folderId);
        break;

      case 'downloadFile':
        const { fileId } = params || {};
        if (!fileId) {
          throw createParamError('fileId参数不能为空');
        }
        result = await fileService.downloadFile(cookie, bbsid, fileId);
        break;

      case 'createFolder':
        const { dirName, parentId = '-1' } = params || {};
        if (!dirName) {
          throw createParamError('dirName参数不能为空');
        }
        result = await fileService.makeDir(cookie, bbsid, dirName, parentId);
        break;

      case 'uploadFile':
        // 检查是否有上传的文件
        if (req.files && req.files.length > 0) {
          // 使用上传的文件
          const { dirId = '-1' } = params || {};
          const uploadedFile = req.files[0];

          // 获取原始文件名（如果有）
          const originalName = req.body.filename || uploadedFile.originalname || uploadedFile.name;

          // 使用原始文件名和临时路径上传文件
          result = await fileService.uploadFileWithOriginalName(cookie, bbsid, uploadedFile.path, originalName, dirId);
        } else {
          // 使用文件路径参数
          const { filePath, dirId = '-1' } = params || {};
          if (!filePath) {
            throw createParamError('filePath参数不能为空');
          }
          result = await fileService.uploadFile(cookie, bbsid, filePath, dirId);
        }
        break;

      case 'downloadFileToLocal':
        const { fileId: dlFileId, outputPath } = params || {};
        if (!dlFileId) {
          throw createParamError('fileId参数不能为空');
        }
        result = await fileService.downloadFileToLocal(cookie, bbsid, dlFileId, outputPath);
        break;

      case 'deleteResource':
        const { resourceId, isFolder } = params || {};
        if (!resourceId) {
          throw createParamError('resourceId参数不能为空');
        }
        // 转换isFolder参数
        let isFolderParam = null;
        if (isFolder !== undefined) {
          isFolderParam = isFolder === 'true' || isFolder === true;
        }
        result = await fileService.deleteResource(cookie, bbsid, resourceId, isFolderParam);
        break;

      case 'moveResource':
        const { resourceId: moveResourceId, targetId, isFolder: moveIsFolder } = params || {};
        if (!moveResourceId) {
          throw createParamError('resourceId参数不能为空');
        }
        if (!targetId) {
          throw createParamError('targetId参数不能为空');
        }
        result = await fileService.moveResource(cookie, bbsid, moveResourceId, targetId, moveIsFolder);
        break;

      case 'batchMoveResources':
        const { resourceIds: batchResourceIds, targetId: batchTargetId, isFolder: batchIsFolder } = params || {};
        if (!batchResourceIds || !Array.isArray(batchResourceIds) || batchResourceIds.length === 0) {
          throw createParamError('resourceIds参数不能为空且必须是数组');
        }
        if (!batchTargetId) {
          throw createParamError('targetId参数不能为空');
        }
        result = await fileService.batchMoveResources(cookie, bbsid, batchResourceIds, batchTargetId, batchIsFolder);
        break;

      case 'getUploadConfig':
        result = await fileService.getUploadConfig(cookie, bbsid);
        break;

      default:
        throw createParamError(`未知的操作类型: ${action}`);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// 错误处理中间件
router.use((err, req, res, next) => {
  console.error('Flutter API错误:', err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // 处理其他错误
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: '服务器内部错误'
    }
  });
});

// 导出Cloudflare Pages Function
export async function onRequest(context) {
  // 设置环境变量
  if (context.env) {
    process.env.COOKIE = context.env.COOKIE || '';
    process.env.BBSID = context.env.BBSID || '';
    process.env.SIGNATURE_KEY = context.env.SIGNATURE_KEY || 'default_signature_key';
    process.env.MOBILE_API_TOKEN = context.env.MOBILE_API_TOKEN || '';
  }

  // 模拟Express请求/响应对象
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // 确定请求路径
  let path = '/';
  if (pathParts.length > 1 && pathParts[0] === 'flutter') {
    path = '/' + pathParts.slice(1).join('/');
  }

  // 模拟Express请求对象
  const req = {
    method: context.request.method,
    url: context.request.url,
    path: path,
    headers: Object.fromEntries(context.request.headers.entries()),
    body: await context.request.json().catch(() => ({})),
    files: []
  };

  // 处理文件上传
  if (context.request.method === 'POST' && context.request.headers.get('content-type')?.includes('multipart/form-data')) {
    const formData = await context.request.formData();
    const files = [];

    for (const [name, value] of formData.entries()) {
      if (value instanceof File) {
        // 将Cloudflare的File对象转换为类似Multer的格式
        const buffer = await value.arrayBuffer();
        const tempPath = `/tmp/${Date.now()}_${value.name}`;

        // 在Cloudflare Functions中，我们无法直接写入文件系统
        // 这里只是模拟，实际使用时需要调整
        files.push({
          fieldname: name,
          originalname: value.name,
          mimetype: value.type,
          size: value.size,
          path: tempPath
        });
      } else {
        // 处理普通表单字段
        if (!req.body) req.body = {};
        req.body[name] = value;
      }
    }

    req.files = files;
  }

  // 创建响应对象
  const res = {
    statusCode: 200,
    headers: {},
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    json: (data) => {
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...res.headers },
        status: res.statusCode || 200
      });
    },
    send: (data) => {
      return new Response(data, {
        status: res.statusCode || 200,
        headers: res.headers
      });
    },
    setHeader: (name, value) => {
      res.headers[name] = value;
      return res;
    }
  };

  // 使用路由处理请求
  try {
    // 查找匹配的路由
    const route = router.stack.find(layer => {
      return layer.route && layer.route.path === path && 
             layer.route.methods[context.request.method.toLowerCase()];
    });

    if (route) {
      return await route.handle(req, res);
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '请求的API不存在'
        }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: '服务器内部错误'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
