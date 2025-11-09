const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const { listFiles, downloadFile, makeDir, uploadFile } = require('./src/api');
const { debugLog, logApiRequest } = require('./debugLogger');
const { startTerminal } = require('./src/terminal');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 从环境变量中获取认证信息
const cookie = process.env.COOKIE;
const bbsid = process.env.BBSID;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(debugLog); // 添加调试日志中间件

// 静态文件服务
app.use('/download', express.static(path.join(__dirname, 'download')));

// API 接口
app.get('/list', async (req, res) => {
    const { folderId = '-1' } = req.query;
    try {
        const files = await listFiles(folderId);
        res.json({ files });
    } catch (error) {
        console.error('获取文件列表失败:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/download', async (req, res) => {
    const { fileId } = req.query;
    if (!fileId) {
        const error = new Error('请提供 fileId');
        console.error(error);
        return res.status(400).json({ error: error.message });
    }
    try {
        const outputPath = path.join(__dirname, 'download', `file_${fileId.replace('$', '_')}.bin`);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        await downloadFile(fileId, outputPath);
        res.json({ message: '下载完成', file: `/file_${fileId.replace('$', '_')}.bin` });
    } catch (error) {
        console.error('下载文件失败:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/mkdir', async (req, res) => {
    const { parentId = '-1', dirName } = req.body;
    if (!dirName) {
        const error = new Error('请提供 dirName');
        console.error(error);
        return res.status(400).json({ error: error.message });
    }
    try {
        const message = await makeDir(parentId, dirName);
        res.json({ message });
    } catch (error) {
        console.error('创建文件夹失败:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/upload', async (req, res) => {
    const { dirId = '-1', filePath } = req.body;
    if (!filePath) {
        const error = new Error('请提供 filePath');
        console.error(error);
        return res.status(400).json({ error: error.message });
    }
    if (!fs.existsSync(filePath)) {
        const error = new Error('文件不存在');
        console.error(error, `路径: ${filePath}`);
        return res.status(400).json({ error: error.message });
    }
    try {
        const message = await uploadFile(dirId, filePath);
        res.json({ message });
    } catch (error) {
        console.error('上传文件失败:', error);
        res.status(500).json({ error: error.message });
    }
});



// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
const server = app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`调试日志功能: ${process.env.ENABLE_DEBUG_LOG === 'true' ? '已启用' : '已禁用'}`);
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    if (args.includes('--terminal') || args.includes('-t')) {
        console.log('\n启动终端模式...');
        startTerminal();
    }
});

// 处理端口错误
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用，尝试使用端口 ${parseInt(PORT) + 1}`);
        const altPort = parseInt(PORT) + 1;
        app.listen(altPort, () => {
            console.log(`服务器运行在 http://localhost:${altPort}`);
            console.log(`调试日志功能: ${process.env.ENABLE_DEBUG_LOG === 'true' ? '已启用' : '已禁用'}`);
            
            // 检查命令行参数
            const args = process.argv.slice(2);
            if (args.includes('--terminal') || args.includes('-t')) {
                console.log('\n启动终端模式...');
                startTerminal();
            }
        });
    } else {
        console.error('服务器启动失败:', err);
    }
});
