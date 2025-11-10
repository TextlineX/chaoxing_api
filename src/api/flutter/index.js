/**
 * Flutter集成API主路由模块
 * 提供简化的API接口，便于Flutter应用对接
 */

const express = require('express');
const multer = require('multer');
const fileService = require('../../services/file');
const authService = require('../../services/auth');
const { ApiError, createParamError } = require('../../utils/error');
const config = require('../../config');
const dotenv = require('dotenv');
const path = require('path');
const authMiddleware = require('../../middleware/auth');

// 加载环境变量
dotenv.config();

// 检测是否在Serverless环境中运行
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// 导入各功能模块
const fileOperations = require('./file-operations');
const uploadHandlers = require('./upload-handlers');
const downloadHandlers = require('./download-handlers');
const resourceOperations = require('./resource-operations');

// 临时文件存储配置
const tempFileConfig = {
    tempDir: 'temp/uploads',
    // 文件保留时间（毫秒），默认为2小时
    retentionTime: 2 * 60 * 60 * 1000,
    // 清理间隔（毫秒），默认为30分钟
    cleanupInterval: 30 * 60 * 1000
};

// 在Serverless环境中，跳过所有文件系统初始化操作
if (!isServerless) {
    const fs = require('fs');
    const tempDir = path.join(__dirname, '../../../temp/uploads');

    if (!fs.existsSync(tempDir)) {
        try {
            fs.mkdirSync(tempDir, { recursive: true });
        } catch (error) {
            console.warn('无法创建临时目录:', error.message);
        }
    }
    
    // 更新tempFileConfig.tempDir为绝对路径
    tempFileConfig.tempDir = tempDir;

    // 启动定时清理任务（仅在非Serverless环境中）
    setInterval(() => {
        cleanupTempFiles();
    }, tempFileConfig.cleanupInterval);

    // 立即执行一次清理
    cleanupTempFiles();
}

// 清理过期临时文件
function cleanupTempFiles() {
    // 在Serverless环境中跳过清理
    if (isServerless) return;
    
    try {
        console.log('开始清理过期临时文件...');
        
        // 清理上传的临时文件
        cleanDirectory(tempFileConfig.tempDir);
        
        console.log('临时文件清理完成');
    } catch (error) {
        console.error('清理临时文件失败:', error);
    }
}

// 清理目录中的过期文件
function cleanDirectory(dirPath) {
    // 在非Serverless环境中才进行清理操作
    if (isServerless) return;
    
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath);
    const now = Date.now();
    
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
            // 检查文件是否过期
            if (now - stats.mtime.getTime() > tempFileConfig.retentionTime) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`已删除过期文件: ${filePath}`);
                } catch (e) {
                    console.error(`删除文件失败 ${filePath}:`, e);
                }
            }
        }
    }
}

const router = express.Router();

// 配置multer中间件
// 在Serverless环境中使用内存存储，否则使用文件系统
const storage = isServerless 
    ? multer.memoryStorage() 
    : multer.diskStorage({
        destination: 'temp/uploads/',
        filename: function (req, file, cb) {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 限制文件大小为100MB
    }
});

/**
 * 统一API入口
 * 支持多种操作类型，通过action参数区分
 */
router.post('/api', authMiddleware.optionalAuthenticate, upload.any(), async (req, res, next) => {
    try {
        const { action, params } = req.body;

        // 验证请求格式
        if (!action) {
            throw createParamError('action参数不能为空');
        }

        // 获取认证信息（优先使用用户认证信息，否则使用环境变量）
        let cookie = process.env.COOKIE;
        let bbsid = process.env.BBSID;
        
        // 如果用户已登录，使用用户的认证信息
        if (req.userId) {
            const userAuth = await authService.getUserAuth(req.userId);
            cookie = userAuth.cookie;
            bbsid = userAuth.bbsid;
        }

        if (!cookie || !bbsid) {
            throw new ApiError('服务器配置错误：未设置Cookie和BBSID', 500, 'SERVER_ERROR');
        }

        let result;

        // 根据action参数执行相应操作
        switch (action) {
            case 'listFiles':
                result = await fileOperations.listFiles(cookie, bbsid, params);
                break;

            case 'downloadFile':
                result = await fileOperations.downloadFile(cookie, bbsid, params);
                break;

            case 'createFolder':
                result = await fileOperations.createFolder(cookie, bbsid, params);
                break;

            case 'uploadFile':
                result = await uploadHandlers.handleUpload(req, cookie, bbsid, params, isServerless);
                break;

            case 'downloadFileToLocal':
                result = await fileOperations.downloadFileToLocal(cookie, bbsid, params);
                break;

            case 'deleteResource':
                result = await resourceOperations.deleteResource(cookie, bbsid, params);
                break;

            case 'moveResource':
                result = await resourceOperations.moveResource(cookie, bbsid, params);
                break;

            case 'batchMoveResources':
                result = await resourceOperations.batchMoveResources(cookie, bbsid, params);
                break;
                
            case 'getUploadConfig':
                result = await fileService.getUploadConfig(cookie, bbsid);
                break;
                
            case 'syncUpload':
                return await uploadHandlers.syncUpload(req, res);
                
            default:
                throw createParamError(`不支持的操作类型: ${action}`);
        }

        // 返回成功结果
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
});

// 注册其他路由模块
router.use('/get-download-url', downloadHandlers.getDownloadUrl);
router.use('/get-upload-config', uploadHandlers.getUploadConfig);
router.use('/download', downloadHandlers.downloadFile);
router.use('/upload', upload.single('file'), uploadHandlers.uploadFile);
router.use('/docs', require('./docs'));

module.exports = router;