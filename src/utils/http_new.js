/**
 * HTTP工具模块 - Cloudflare Pages Functions适配版
 * 提供HTTP请求功能
 */

import axios from 'axios';
import config from '../config/index.js';

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
 * @param {Object} params - 查询参数
 * @param {string} cookie - 用户Cookie
 * @returns {Promise<Object>} 响应数据
 */
export async function get(url, params = {}, cookie = '') {
  try {
    const response = await axios.get(url, {
      params,
      headers: createHeaders(cookie)
    });

    return response.data;
  } catch (error) {
    console.error('GET请求失败:', error);
    throw error;
  }
}

/**
 * 发送POST请求
 * @param {string} url - 请求URL
 * @param {Object} data - 请求数据
 * @param {string} cookie - 用户Cookie
 * @param {Object} headers - 额外的请求头
 * @returns {Promise<Object>} 响应数据
 */
export async function post(url, data = {}, cookie = '', headers = {}) {
  try {
    const response = await axios.post(url, data, {
      headers: createHeaders(cookie, headers)
    });

    return response.data;
  } catch (error) {
    console.error('POST请求失败:', error);
    throw error;
  }
}
