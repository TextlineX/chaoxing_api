/**
 * 认证中间件模块
 * 处理API请求的身份验证
 */

const { createAuthError } = require('../utils/error');
const authService = require('../services/auth');

/**
 * JWT认证中间件
 * 验证请求中的JWT令牌
 */
function authenticate(req, res, next) {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createAuthError('缺少访问令牌');
    }

    // 提取令牌
    const token = authHeader.substring(7);
    
    // 验证令牌
    const decoded = authService.verifyToken(token);
    
    // 将用户信息添加到请求对象
    req.userId = decoded.userId;
    req.username = decoded.username;
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 可选认证中间件
 * 如果提供了令牌则验证，否则继续处理
 */
function optionalAuthenticate(req, res, next) {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    // 提取令牌
    const token = authHeader.substring(7);
    
    // 验证令牌
    const decoded = authService.verifyToken(token);
    
    // 将用户信息添加到请求对象
    req.userId = decoded.userId;
    req.username = decoded.username;
    
    next();
  } catch (error) {
    // 即使令牌无效也继续处理
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate
};