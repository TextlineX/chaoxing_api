// 调试日志模块
// 使用方法：在.env文件中设置 ENABLE_DEBUG_LOG=true 来启用调试日志

const ENABLE_DEBUG_LOG = process.env.ENABLE_DEBUG_LOG === 'true';

// 调试日志中间件
const debugLog = (req, res, next) => {
    if (ENABLE_DEBUG_LOG) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        console.log('请求头:', req.headers);
        console.log('请求体:', req.body);

        // 捕获响应
        const originalSend = res.send;
        res.send = function(data) {
            console.log('响应状态:', res.statusCode);
            console.log('响应数据:', data);
            originalSend.call(this, data);
        };
    }
    next();
};

// 记录API请求详情
const logApiRequest = (action, params, result, error = null) => {
    if (!ENABLE_DEBUG_LOG) return;

    console.log(`\n=== API请求详情 ===`);
    console.log(`时间: ${new Date().toISOString()}`);
    console.log(`操作: ${action}`);
    console.log(`参数:`, params);

    if (error) {
        console.log(`错误:`, error.message || error);
        console.log(`错误堆栈:`, error.stack);
    } else {
        console.log(`结果:`, result);
    }
    console.log(`=== 请求结束 ===\n`);
};

module.exports = {
    debugLog,
    logApiRequest,
    isDebugEnabled: () => ENABLE_DEBUG_LOG
};
