/**
 * Cloudflare Pages Functions 中间件
 * 处理所有API请求
 */

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

  // 根据路径处理请求
  if (path.startsWith('/api/')) {
    // 转发到API处理函数
    const { handleApiRequest } = await import('./index.js');
    return handleApiRequest(context);
  } else if (path.startsWith('/flutter/')) {
    // 转发到Flutter API处理函数
    const { handleFlutterRequest } = await import('../flutter/api/index.js');
    return handleFlutterRequest(context);
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
}
