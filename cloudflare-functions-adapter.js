/**
 * Cloudflare Pages Functions 适配器
 * 将Node.js Express应用适配到Cloudflare Pages Functions环境
 */

// 导入必要的Web API
import { Request, Response } from 'undici';

// 创建一个简化的Express风格路由处理器
export function createRouteHandler(handler) {
  return async function(context) {
    try {
      // 设置环境变量
      if (context.env) {
        global.process = global.process || {};
        global.process.env = {
          ...global.process.env,
          COOKIE: context.env.COOKIE || '',
          BBSID: context.env.BBSID || '',
          SIGNATURE_KEY: context.env.SIGNATURE_KEY || 'default_signature_key',
          MOBILE_API_TOKEN: context.env.MOBILE_API_TOKEN || ''
        };
      }

      // 创建请求对象
      const url = new URL(context.request.url);
      const method = context.request.method;
      const headers = {};
      context.request.headers.forEach((value, name) => {
        headers[name.toLowerCase()] = value;
      });

      // 处理请求体
      let body = {};
      let files = [];

      if (method !== 'GET' && method !== 'HEAD') {
        const contentType = headers['content-type'] || '';

        if (contentType.includes('application/json')) {
          try {
            body = await context.request.json();
          } catch (e) {
            console.error('Error parsing JSON body:', e);
          }
        } else if (contentType.includes('multipart/form-data')) {
          try {
            const formData = await context.request.formData();
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
          const text = await context.request.text();
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

      // 创建响应对象
      const res = {
        statusCode: 200,
        headers: {},
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          this.headers['content-type'] = 'application/json';
          return new Response(JSON.stringify(data), {
            status: this.statusCode,
            headers: this.headers
          });
        },
        send: function(data) {
          return new Response(data, {
            status: this.statusCode,
            headers: this.headers
          });
        },
        setHeader: function(name, value) {
          this.headers[name.toLowerCase()] = value;
          return this;
        },
        redirect: function(url) {
          return Response.redirect(url, this.statusCode);
        }
      };

      // 调用处理程序
      const result = await handler(req, res);

      // 如果处理程序返回了结果，使用它
      if (result) {
        return result;
      }

      // 否则返回默认响应
      return new Response(null, {
        status: res.statusCode || 200,
        headers: res.headers
      });
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
  };
}

// 创建一个简单的路由器
export function createRouter() {
  const routes = {};

  return {
    get(path, handler) {
      routes[`GET:${path}`] = handler;
    },
    post(path, handler) {
      routes[`POST:${path}`] = handler;
    },
    put(path, handler) {
      routes[`PUT:${path}`] = handler;
    },
    delete(path, handler) {
      routes[`DELETE:${path}`] = handler;
    },
    use(path, handler) {
      // 简单的中间件支持
      routes[`USE:${path}`] = handler;
    },
    handle(req, res) {
      const key = `${req.method}:${req.path}`;
      const route = routes[key];

      if (route) {
        return route(req, res);
      }

      // 查找中间件
      for (const [routeKey, routeHandler] of Object.entries(routes)) {
        if (routeKey.startsWith('USE:')) {
          const middlewarePath = routeKey.substring(4);
          if (req.path.startsWith(middlewarePath)) {
            const result = routeHandler(req, res);
            if (result) return result;
          }
        }
      }

      // 404处理
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '请求的API不存在'
        }
      });
    }
  };
}
