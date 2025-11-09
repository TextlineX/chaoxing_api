/**
 * Vercel专用入口点
 * 适配Serverless环境
 */

// 加载环境变量
require('dotenv').config();

// 导入应用实例，不启动服务器
const { app } = require('../app');

// 导出应用实例供Vercel使用
module.exports = app;
