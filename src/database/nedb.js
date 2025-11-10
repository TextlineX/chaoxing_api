/**
 * NeDB数据库操作模块
 * 实现用户相关的数据库操作
 */

const Datastore = require('nedb');
const bcrypt = require('bcrypt');
const path = require('path');
const { dbConfig } = require('../config/db');

let db = null;

/**
 * 初始化数据库连接
 * @returns {Object} 数据库连接对象
 */
function initDatabase() {
  if (db) {
    return db;
  }

  db = new Datastore({
    filename: path.resolve(dbConfig.nedb.filename),
    autoload: true
  });

  // 确保索引存在
  db.ensureIndex({ fieldName: 'username', unique: true });
  db.ensureIndex({ fieldName: 'email', unique: true });

  return db;
}

/**
 * 创建用户
 * @param {Object} userData - 用户数据
 * @returns {Promise<Object>} 创建的用户信息
 */
async function createUser(userData) {
  const db = initDatabase();
  const { username, email, password, cookie, bbsid } = userData;
  
  // 密码加密
  const hashedPassword = await bcrypt.hash(password, 10);
  
  return new Promise((resolve, reject) => {
    const user = {
      username,
      email,
      password: hashedPassword,
      cookie,
      bbsid,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    db.insert(user, (err, newDoc) => {
      if (err) {
        reject(err);
      } else {
        // 移除敏感信息
        delete newDoc.password;
        delete newDoc.cookie;
        delete newDoc.bbsid;
        resolve(newDoc);
      }
    });
  });
}

/**
 * 根据用户名查找用户
 * @param {string} username - 用户名
 * @returns {Promise<Object|null>} 用户信息或null
 */
async function findUserByUsername(username) {
  const db = initDatabase();
  
  return new Promise((resolve, reject) => {
    db.findOne({ username }, (err, doc) => {
      if (err) {
        reject(err);
      } else {
        resolve(doc);
      }
    });
  });
}

/**
 * 根据邮箱查找用户
 * @param {string} email - 邮箱
 * @returns {Promise<Object|null>} 用户信息或null
 */
async function findUserByEmail(email) {
  const db = initDatabase();
  
  return new Promise((resolve, reject) => {
    db.findOne({ email }, (err, doc) => {
      if (err) {
        reject(err);
      } else {
        resolve(doc);
      }
    });
  });
}

/**
 * 根据用户ID查找用户
 * @param {string} id - 用户ID
 * @returns {Promise<Object|null>} 用户信息或null
 */
async function findUserById(id) {
  const db = initDatabase();
  
  return new Promise((resolve, reject) => {
    db.findOne({ _id: id }, (err, doc) => {
      if (err) {
        reject(err);
      } else {
        resolve(doc);
      }
    });
  });
}

/**
 * 更新用户认证信息
 * @param {string} userId - 用户ID
 * @param {Object} authData - 认证信息
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateUserAuth(userId, authData) {
  const db = initDatabase();
  const { cookie, bbsid } = authData;
  
  return new Promise((resolve, reject) => {
    db.update(
      { _id: userId },
      { $set: { cookie, bbsid, updated_at: new Date() } },
      {},
      (err, numReplaced) => {
        if (err) {
          reject(err);
        } else {
          resolve(numReplaced > 0);
        }
      }
    );
  });
}

module.exports = {
  initDatabase,
  createUser,
  findUserByUsername,
  findUserByEmail,
  findUserById,
  updateUserAuth
};