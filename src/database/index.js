/**
 * 数据库连接模块
 * 提供统一的数据库连接接口，支持多种数据库
 */

const { DB_TYPE, dbConfig } = require('../config/db');

let dbInstance = null;

/**
 * 获取数据库实例
 * @returns {Object} 数据库实例
 */
function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  switch (DB_TYPE) {
    case 'nedb':
      dbInstance = require('./nedb');
      break;
    case 'sqlite':
      dbInstance = require('./sqlite');
      break;
    case 'mysql':
      dbInstance = require('./mysql');
      break;
    case 'postgres':
      dbInstance = require('./postgres');
      break;
    case 'mongodb':
      dbInstance = require('./mongodb');
      break;
    default:
      // 默认使用nedb
      dbInstance = require('./nedb');
  }

  return dbInstance;
}

module.exports = getDatabase();