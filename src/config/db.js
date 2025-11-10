/**
 * 数据库配置模块
 * 支持多种数据库类型，根据环境变量选择
 */

// 数据库类型
const DB_TYPE = process.env.DB_TYPE || 'nedb';

// 数据库配置
const dbConfig = {
  nedb: {
    filename: process.env.NEDB_FILENAME || './database.nedb',
  },
  sqlite: {
    filename: process.env.SQLITE_FILENAME || './database.sqlite',
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'chaoxing'
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || 'chaoxing'
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/chaoxing'
  }
};

module.exports = {
  DB_TYPE,
  dbConfig
};