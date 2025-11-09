/**
 * 认证服务模块
 * 处理用户认证相关功能
 */

const { createAuthError } = require('../utils/error');

/**
 * 验证认证信息
 * @param {string} cookie - 用户Cookie
 * @param {string} bbsid - 用户Bbsid
 * @throws {ApiError} 如果认证信息无效
 */
function validateAuth(cookie, bbsid) {
    if (!cookie || !bbsid) {
        throw createAuthError('Cookie和Bbsid不能为空');
    }
}

/**
 * 从请求中提取认证信息
 * @param {Object} req - Express请求对象
 * @returns {Object} 包含cookie和bbsid的对象
 * @throws {ApiError} 如果认证信息无效
 */
function getAuthFromRequest(req) {
    // 从请求头或查询参数中获取认证信息
    const cookie = req.headers.cookie || req.query.cookie || req.body?.cookie;
    const bbsid = req.headers.bbsid || req.query.bbsid || req.body?.bbsid;
    
    validateAuth(cookie, bbsid);
    
    return { cookie, bbsid };
}

module.exports = {
    validateAuth,
    getAuthFromRequest
};