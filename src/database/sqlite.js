/**
 * SQLite数据库操作模块
 * 实现用户相关的数据库操作
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { dbConfig } = require('../config/db');
const bcrypt = require('bcrypt');

let dbPromise = null;

/**
 * 初始化数据库连接
 * @returns {Promise<Object>} 数据库连接对象
 */
async function initDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = open({
    filename: dbConfig.sqlite.filename,
    driver: sqlite3.Database
  });

  const db = await dbPromise;
  
  // 创建用户表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      cookie TEXT,
      bbsid TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

/**
 * 创建用户
 * @param {Object} userData - 用户数据
 * @returns {Promise<Object>} 创建的用户信息
 */
async function createUser(userData) {
  const db = await initDatabase();
  const { username, email, password, cookie, bbsid } = userData;
  
  // 密码加密
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await db.run(
    'INSERT INTO users (username, email, password, cookie, bbsid) VALUES (?, ?, ?, ?, ?)',
    [username, email, hashedPassword, cookie, bbsid]
  );
  
  return {
    id: result.lastID,
    username,
    email,
    cookie,
    bbsid
  };
}

/**
 * 根据用户名查找用户
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>} 用户信息或null
 */
async function findUserByUsername(username) {
  const db = await initDatabase();
  return await db.get('SELECT * FROM users WHERE username = ?', [username]);
}

/**
 * 根据邮箱查找用户
 * @param {string} email - 邮箱
 * @returns {Promise<Object|null>} 用户信息或null
 */
async function findUserByEmail(email) {
  const db = await initDatabase();
  return await db.get('SELECT * FROM users WHERE email = ?', [email]);
}

/**
 * 根据用户ID查找用户
 * @param {number} id - 用户ID
 * @returns {Promise<Object|null>} 用户信息或null
 */
async function findUserById(id) {
  const db = await initDatabase();
  return await db.get('SELECT * FROM users WHERE id = ?', [id]);
}

/**
 * 更新用户认证信息
 * @param {number} userId - 用户ID
 * @param {Object} authData - 认证信息
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateUserAuth(userId, authData) {
  const db = await initDatabase();
  const { cookie, bbsid } = authData;
  
  const result = await db.run(
    'UPDATE users SET cookie = ?, bbsid = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [cookie, bbsid, userId]
  );
  
  return result.changes > 0;
}

module.exports = {
  initDatabase,
  createUser,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  updateUserAuth
};