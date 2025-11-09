/**
 * 配置模块 - Cloudflare Pages Functions适配版
 * 提供应用配置
 */

export default {
  // API基础URL
  API_BASE: 'https://pan-yun.chaoxing.com',

  // 下载API基础URL
  DOWNLOAD_API: 'https://noteyd.chaoxing.com',

  // 上传API基础URL
  UPLOAD_API: 'https://pan-yun.chaoxing.com',

  // 请求头配置
  HEADERS: {
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.160 Safari/537.36',
    REFERER: 'https://chaoxing.com/',
    ACCEPT: 'application/json, text/plain, */*'
  },

  // 服务器配置
  SERVER: {
    PORT: process.env.PORT || 3000
  }
};
