/**
 * 错误处理工具模块
 * 定义API错误类型和处理方法
 */

/**
 * API错误类
 * 用于统一处理API错误
 */
class ApiError extends Error {
    /**
     * 创建API错误实例
     * @param {string} message - 错误消息
     * @param {number} statusCode - HTTP状态码
     * @param {string} code - 错误代码
     */
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
    }

    /**
     * 转换为JSON格式
     * @returns {Object} 错误的JSON表示
     */
    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message
            }
        };
    }
}

/**
 * 创建认证错误
 * @param {string} message - 错误消息
 * @returns {ApiError} API错误实例
 */
function createAuthError(message = '认证失败，请提供有效的Cookie和Bbsid') {
    return new ApiError(message, 401, 'AUTH_ERROR');
}

/**
 * 创建参数错误
 * @param {string} message - 错误消息
 * @returns {ApiError} API错误实例
 */
function createParamError(message = '参数错误，请检查请求参数') {
    return new ApiError(message, 400, 'PARAM_ERROR');
}

/**
 * 创建服务器错误
 * @param {string} message - 错误消息
 * @returns {ApiError} API错误实例
 */
function createServerError(message = '服务器内部错误') {
    return new ApiError(message, 500, 'SERVER_ERROR');
}

/**
 * 创建资源错误
 * @param {string} message - 错误消息
 * @returns {ApiError} API错误实例
 */
function createResourceError(message = '资源不存在或无法访问') {
    return new ApiError(message, 404, 'RESOURCE_ERROR');
}

module.exports = {
    ApiError,
    createAuthError,
    createParamError,
    createServerError,
    createResourceError
};