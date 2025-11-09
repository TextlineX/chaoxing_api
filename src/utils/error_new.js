/**
 * 错误处理模块 - Cloudflare Pages Functions适配版
 * 提供错误处理功能
 */

/**
 * API错误类
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message
      }
    };
  }
}

/**
 * 创建参数错误
 * @param {string} message - 错误消息
 * @returns {ApiError} 参数错误对象
 */
export function createParamError(message) {
  return new ApiError(message, 400, 'PARAM_ERROR');
}

/**
 * 创建服务器错误
 * @param {string} message - 错误消息
 * @returns {ApiError} 服务器错误对象
 */
export function createServerError(message) {
  return new ApiError(message, 500, 'SERVER_ERROR');
}
