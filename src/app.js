/**
 * 朝星小组网盘API服务
 * 主应用文件
 */

const express = require('express');
const path = require('path');
const apiRoutes = require('./api/file'); // 使用修改后的API路由
const config = require('./config');
const { debugLog } = require('../debugLogger');

// 创建Express应用
const app = express();

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(debugLog); // 添加调试日志中间件

// 处理跨域请求
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Bbsid');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// 注册API路由
app.use('/api', apiRoutes);

// 注册Flutter API路由
const flutterRoutes = require('./api/flutter'); // 使用修改后的Flutter路由
app.use('/flutter', flutterRoutes);

// 根路由，提供API信息
app.get('/', (req, res) => {
    res.json({
        name: '朝星小组网盘API',
        version: '1.0.0',
        description: '超星学习通小组网盘API服务',
        endpoints: [
            { method: 'GET', path: '/api/files', description: '获取文件列表' },
            { method: 'GET', path: '/api/files/download', description: '获取文件下载链接' },
            { method: 'POST', path: '/api/files/download-local', description: '下载文件到本地' },
            { method: 'POST', path: '/api/files/folder', description: '创建文件夹' },
            { method: 'POST', path: '/api/files/upload', description: '上传文件' },
            { method: 'DELETE', path: '/api/files', description: '删除文件或文件夹' }
        ],
        flutter_usage: {
            base_url: `http://localhost:${config.SERVER.PORT}/flutter`,
            authentication: {
                headers: {
                    'Cookie': 'your_cookie_here',
                    'Bbsid': 'your_bbsid_here'
                }
            },
            new_feature: '预签名URL下载',
            description: '新增预签名URL下载功能，支持安全的文件下载，无需暴露后端凭证'
        }
    });
});

// 启动服务器
function startServer() {
    const port = config.SERVER.PORT;
    const server = app.listen(port, () => {
        console.log(`朝星小组网盘API服务运行在 http://localhost:${port}`);
        console.log(`Flutter集成请使用: http://localhost:${port}/flutter`);
        console.log(`API文档: http://localhost:${port}`);
    });

    // 处理端口错误
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`端口 ${port} 已被占用，尝试使用端口 ${parseInt(port) + 1}`);
            const altPort = parseInt(port) + 1;
            app.listen(altPort, () => {
                console.log(`朝星小组网盘API服务运行在 http://localhost:${altPort}`);
                console.log(`Flutter集成请使用: http://localhost:${altPort}/flutter`);
                console.log(`API文档: http://localhost:${altPort}`);
            });
        } else {
            console.error('服务器启动失败:', err);
        }
    });
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
