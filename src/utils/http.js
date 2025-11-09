/**
 * HTTP请求工具模块
 * 封装axios请求，处理请求头和错误
 */

const axios = require('axios');
const config = require('../config');
const { logApiRequest } = require('../../debugLogger');

/**
 * 创建带有认证信息的请求头
 * @param {string} cookie - 用户Cookie
 * @param {Object} additionalHeaders - 额外的请求头
 * @returns {Object} 完整的请求头对象
 */
function createHeaders(cookie, additionalHeaders = {}) {
    return {
        'Cookie': cookie,
        'User-Agent': config.HEADERS.USER_AGENT,
        'Referer': config.HEADERS.REFERER,
        'Accept': config.HEADERS.ACCEPT,
        ...additionalHeaders
    };
}

/**
 * 发送GET请求
 * @param {string} url - 请求URL
 * @param {Object} params - URL参数
 * @param {string} cookie - 用户Cookie
 * @param {Object} additionalHeaders - 额外的请求头
 * @returns {Promise<Object>} 响应数据
 */
async function get(url, params, cookie, additionalHeaders = {}) {
    try {
        // 记录请求详情
        logApiRequest('GET', { url, params }, null);
        
        const response = await axios.get(url, {
            params,
            headers: createHeaders(cookie, additionalHeaders)
        });
        
        // 记录响应结果
        logApiRequest('GET', { url, params }, response.data);
        
        return response.data;
    } catch (error) {
        // 记录错误
        logApiRequest('GET', { url, params }, null, error);
        throw handleError(error);
    }
}

/**
 * 发送POST请求
 * @param {string} url - 请求URL
 * @param {Object} data - 请求体数据
 * @param {string} cookie - 用户Cookie
 * @param {Object} additionalHeaders - 额外的请求头
 * @returns {Promise<Object>} 响应数据
 */
async function post(url, data, cookie, additionalHeaders = {}) {
    try {
        // 记录请求详情
        logApiRequest('POST', { url, data }, null);
        
        const response = await axios.post(url, data, {
            headers: createHeaders(cookie, additionalHeaders)
        });
        
        // 记录响应结果
        logApiRequest('POST', { url, data }, response.data);
        
        return response.data;
    } catch (error) {
        // 记录错误
        logApiRequest('POST', { url, data }, null, error);
        throw handleError(error);
    }
}

/**
 * 处理请求错误
 * @param {Error} error - 错误对象
 * @returns {Error} 格式化的错误对象
 */
function handleError(error) {
    if (error.response) {
        // 服务器响应错误
        const message = error.response.data?.msg || error.response.statusText || '服务器错误';
        return new Error(`请求失败: ${message} (${error.response.status})`);
    } else if (error.request) {
        // 请求发送但没有收到响应
        return new Error('服务器无响应，请检查网络连接');
    } else {
        // 请求配置错误
        return new Error(`请求错误: ${error.message}`);
    }
}

module.exports = {
    get,
    post,
    createHeaders
};