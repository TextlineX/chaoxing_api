/**
 * 用户认证API模块
 * 提供用户注册、登录等认证相关接口
 */

const express = require('express');
const authService = require('../services/auth');
const { createParamError } = require('../utils/error');

const router = express.Router();

/**
 * 用户注册接口
 * POST /api/auth/register
 * 请求体：
 *   - username: 用户名
 *   - email: 邮箱
 *   - password: 密码
 *   - cookie: 超星Cookie（可选）
 *   - bbsid: 超星BBSID（可选）
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, cookie, bbsid } = req.body;
    
    const result = await authService.register({
      username,
      email,
      password,
      cookie,
      bbsid
    });
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * 用户登录接口
 * POST /api/auth/login
 * 请求体：
 *   - username: 用户名
 *   - password: 密码
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    const result = await authService.login({
      username,
      password
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * 获取当前用户信息接口
 * GET /api/auth/me
 */
router.get('/me', async (req, res, next) => {
  try {
    // 从请求对象获取用户ID
    const userId = req.userId;
    
    if (!userId) {
      throw createParamError('用户未登录');
    }
    
    // 获取用户信息
    const user = await authService.getUserAuth(userId);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 更新用户认证信息接口
 * PUT /api/auth/me/auth
 * 请求体：
 *   - cookie: 超星Cookie
 *   - bbsid: 超星BBSID
 */
router.put('/me/auth', async (req, res, next) => {
  try {
    // 从请求对象获取用户ID
    const userId = req.userId;
    
    if (!userId) {
      throw createParamError('用户未登录');
    }
    
    const { cookie, bbsid } = req.body;
    
    const result = await authService.updateUserAuth(userId, {
      cookie,
      bbsid
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;