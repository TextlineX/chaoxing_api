/**
 * API路由索引模块
 * 集中管理所有API路由
 */

const express = require('express');
const fileRoutes = require('./file');
const { ApiError } = require('../utils/error');

const router = express.Router();

// 注册文件API路由
router.use('/files', fileRoutes);

// API错误处理中间件
router.use((err, req, res, next) => {
    console.error('API错误:', err);
    
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(err.toJSON());
    }
    
    // 处理其他错误
    res.status(500).json({
        error: {
            code: 'SERVER_ERROR',
            message: '服务器内部错误'
        }
    });
});

// 处理404错误
router.use((req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: '请求的API不存在'
        }
    });
});

module.exports = router;