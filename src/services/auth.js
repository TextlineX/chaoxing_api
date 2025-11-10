/**
 * 用户认证服务模块
 * 处理用户注册、登录和认证相关操作
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const database = require('../database');
const { createParamError, createAuthError } = require('../utils/error');

const JWT_SECRET = process.env.JWT_SECRET || 'chaoxing_default_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * 用户注册
 * @param {Object} userData - 用户注册数据
 * @returns {Promise<Object>} 注册结果
 */
async function register(userData) {
  const { username, email, password, cookie, bbsid } = userData;

  // 检查必填字段
  if (!username || !email || !password) {
    throw createParamError('用户名、邮箱和密码不能为空');
  }

  // 检查用户是否已存在
  const existingUser = await database.findUserByUsername(username);
  if (existingUser) {
    throw createParamError('用户名已存在');
  }

  // 检查邮箱是否已存在
  const existingEmail = await database.findUserByEmail(email);
  if (existingEmail) {
    throw createParamError('邮箱已被使用');
  }

  // 创建用户
  const user = await database.createUser({
    username,
    email,
    password,
    cookie,
    bbsid
  });

  // 生成JWT令牌
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // 移除敏感信息
  delete user.password;
  delete user.cookie;
  delete user.bbsid;

  return {
    success: true,
    message: '注册成功',
    user,
    token
  };
}

/**
 * 用户登录
 * @param {Object} credentials - 登录凭证
 * @returns {Promise<Object>} 登录结果
 */
async function login(credentials) {
  const { username, password } = credentials;

  // 检查必填字段
  if (!username || !password) {
    throw createParamError('用户名和密码不能为空');
  }

  // 查找用户
  const user = await database.findUserByUsername(username);
  if (!user) {
    throw createAuthError('用户名或密码错误');
  }

  // 验证密码
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createAuthError('用户名或密码错误');
  }

  // 生成JWT令牌
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // 移除敏感信息
  delete user.password;
  delete user.cookie;
  delete user.bbsid;

  return {
    success: true,
    message: '登录成功',
    user,
    token
  };
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {Promise<Object>} 解码后的用户信息
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw createAuthError('无效的访问令牌');
  }
}

/**
 * 获取用户认证信息
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 用户认证信息
 */
async function getUserAuth(userId) {
  const user = await database.findUserById(userId);
  if (!user) {
    throw createAuthError('用户不存在');
  }

  return {
    cookie: user.cookie,
    bbsid: user.bbsid
  };
}

/**
 * 更新用户认证信息
 * @param {number} userId - 用户ID
 * @param {Object} authData - 认证信息
 * @returns {Promise<Object>} 更新结果
 */
async function updateUserAuth(userId, authData) {
  const { cookie, bbsid } = authData;
  
  const updated = await database.updateUserAuth(userId, { cookie, bbsid });
  if (!updated) {
    throw createParamError('更新认证信息失败');
  }

  return {
    success: true,
    message: '认证信息更新成功'
  };
}

module.exports = {
  register,
  login,
  verifyToken,
  getUserAuth,
  updateUserAuth
};