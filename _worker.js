/**
 * Cloudflare Pages Worker 入口文件
 * 将Node.js Express应用适配到Cloudflare Pages环境
 */

import { app } from './src/app.js';

export default {
  async fetch(request, env, ctx) {
    // 设置环境变量
    if (env) {
      process.env.COOKIE = env.COOKIE || '';
      process.env.BBSID = env.BBSID || '';
      process.env.SIGNATURE_KEY = env.SIGNATURE_KEY || 'default_signature_key';
      process.env.MOBILE_API_TOKEN = env.MOBILE_API_TOKEN || '';
    }

    // 将Request转换为Express兼容的格式
    const url = new URL(request.url);
    const method = request.method;
    const headers = {};
    request.headers.forEach((value, name) => {
      headers[name.toLowerCase()] = value;
    });

    // 处理请求体
    let body = {};
    let files = [];

    if (method !== 'GET' && method !== 'HEAD') {
      const contentType = headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        try {
          body = await request.json();
        } catch (e) {
          console.error('Error parsing JSON body:', e);
        }
      } else if (contentType.includes('multipart/form-data')) {
        try {
          const formData = await request.formData();
          for (const [name, value] of formData.entries()) {
            if (value instanceof File) {
              // 处理文件上传
              const arrayBuffer = await value.arrayBuffer();
              files.push({
                fieldname: name,
                originalname: value.name,
                mimetype: value.type,
                size: value.size,
                buffer: arrayBuffer
              });
            } else {
              // 处理普通表单字段
              body[name] = value;
            }
          }
        } catch (e) {
          console.error('Error parsing form data:', e);
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        for (const [key, value] of params.entries()) {
          body[key] = value;
        }
      }
    }

    // 创建Express兼容的请求对象
    const req = {
      method,
      url: url.pathname + url.search,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      headers,
      body,
      files,
      get: (header) => headers[header.toLowerCase()]
    };

    // 创建Express兼容的响应对象
    let statusCode = 200;
    const responseHeaders = {};

    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseHeaders['content-type'] = 'application/json';
        return new Response(JSON.stringify(data), {
          status: statusCode,
          headers: responseHeaders
        });
      },
      send: (data) => {
        return new Response(data, {
          status: statusCode,
          headers: responseHeaders
        });
      },
      setHeader: (name, value) => {
        responseHeaders[name.toLowerCase()] = value;
        return res;
      },
      redirect: (url) => {
        return Response.redirect(url, statusCode);
      }
    };

    // 处理请求
    try {
      // 使用Express应用处理请求
      const response = await new Promise((resolve, reject) => {
        // 捕获响应
        const originalEnd = res.end;
        res.end = function(data) {
          if (data) {
            resolve(new Response(data, {
              status: statusCode,
              headers: responseHeaders
            }));
          } else {
            resolve(new Response(null, {
              status: statusCode,
              headers: responseHeaders
            }));
          }
        };

        // 处理请求
        try {
          app(req, res);
        } catch (e) {
          reject(e);
        }
      });

      return response;
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
        headers: { 'content-type': 'application/json' }
      });
    }
  }
};
