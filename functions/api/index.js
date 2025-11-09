/**
 * Cloudflare Pages Functions API入口
 * 将Node.js Express应用适配到Cloudflare Pages Functions环境
 */

const { app } = require('../../src/app');

export async function onRequest(context) {
  // 设置环境变量
  if (context.env) {
    process.env.COOKIE = context.env.COOKIE || '';
    process.env.BBSID = context.env.BBSID || '';
    process.env.SIGNATURE_KEY = context.env.SIGNATURE_KEY || 'default_signature_key';
    process.env.MOBILE_API_TOKEN = context.env.MOBILE_API_TOKEN || '';
  }

  // 模拟Express请求/响应对象
  const req = {
    method: context.request.method,
    url: context.request.url,
    headers: Object.fromEntries(context.request.headers.entries()),
    body: context.request.body
  };

  // 创建响应对象
  const res = {
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    json: (data) => {
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: res.statusCode || 200
      });
    },
    send: (data) => {
      return new Response(data, {
        status: res.statusCode || 200
      });
    },
    setHeader: (name, value) => {
      res.headers = res.headers || {};
      res.headers[name] = value;
      return res;
    },
    statusCode: 200
  };

  // 处理请求
  try {
    // 将Express应用转换为Cloudflare Pages Function
    const response = await new Promise((resolve, reject) => {
      const mockReq = {
        ...req,
        get: (header) => req.headers[header.toLowerCase()],
        query: new URL(req.url).searchParams
      };

      const mockRes = {
        ...res,
        headers: {},
        end: (data) => {
          resolve(new Response(data, {
            headers: mockRes.headers,
            status: mockRes.statusCode || 200
          }));
        }
      };

      // 使用Express应用处理请求
      app(mockReq, mockRes);
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
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
