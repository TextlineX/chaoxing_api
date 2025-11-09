/**
 * Vercel专用入口点
 * 适配Serverless环境
 */

// 加载环境变量
require('dotenv').config();

// 检查必需的环境变量
const requiredEnvVars = ['COOKIE', 'BBSID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('=== 环境变量错误 ===');
    console.error('缺少以下必需的环境变量:');
    missingVars.forEach(varName => {
        console.error(`- ${varName}`);
    });
    console.error('
解决方案:');
    console.error('1. 在Vercel控制台的"Settings > Environment Variables"中添加这些变量');
    console.error('2. 或使用Vercel CLI: vercel env add <变量名>');
    console.error('3. 重新部署应用: vercel --prod');
    console.error('
详细指南请参考: https://vercel.com/docs/concepts/projects/environment-variables');

    // 创建一个简单的错误处理中间件
    const express = require('express');
    const errorApp = express();

    errorApp.use((req, res) => {
        res.status(500).json({
            error: {
                code: 'ENVIRONMENT_ERROR',
                message: '服务器配置错误：缺少必需的环境变量',
                details: {
                    missing: missingVars,
                    solution: '请在Vercel控制台中设置必需的环境变量'
                }
            }
        });
    });

    module.exports = errorApp;
} else {
    // 导入应用实例，不启动服务器
    const { app } = require('../app');

    // 导出应用实例供Vercel使用
    module.exports = app;
}
