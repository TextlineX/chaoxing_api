# 超星网盘API服务文档

## 项目简介

超星网盘API服务是一个基于Node.js和Express的后端服务，提供超星学习通小组网盘的API接口，支持文件上传、下载、列表查看、文件夹创建和文件移动等功能。该服务主要面向Flutter客户端，提供简洁易用的RESTful API。

## 功能特性

- 文件上传与下载
- 文件列表查看
- 文件夹创建与管理
- 文件与文件夹移动
- 中文文件名支持
- 代理下载功能
- 文件预签名URL生成
- 临时文件自动清理
- 用户认证系统（支持JWT）
- 多种数据库支持（NeDB、SQLite、MySQL、PostgreSQL、MongoDB）

## 技术栈

- Node.js
- Express.js
- Axios
- Multer（文件上传）
- FormData（表单数据处理）
- Bcrypt（密码加密）
- JWT（身份验证）
- NeDB/SQLite/MySQL/PostgreSQL/MongoDB（数据库）

## 项目结构

```
chaoxing/
├── src/
│   ├── api/                    # API路由
│   │   ├── flutter/            # Flutter客户端API（主要）
│   │   │   ├── index.js        # 主路由
│   │   │   ├── file-operations.js  # 文件操作
│   │   │   ├── upload-handlers.js  # 上传处理
│   │   │   ├── download-handlers.js # 下载处理
│   │   │   ├── resource-operations.js # 资源操作
│   │   │   └── docs.js         # API文档
│   │   ├── auth.js             # 认证API
│   │   └── index.js            # API路由索引
│   ├── services/               # 业务逻辑层
│   │   ├── file.js             # 文件操作服务
│   │   └── auth.js             # 认证服务
│   ├── utils/                  # 工具类
│   │   ├── error.js            # 错误处理
│   │   └── http.js             # HTTP请求工具
│   ├── config/                 # 配置
│   │   ├── index.js            # 项目配置
│   │   └── db.js               # 数据库配置
│   ├── database/               # 数据库操作
│   │   ├── index.js            # 数据库入口
│   │   ├── nedb.js             # NeDB操作
│   │   └── sqlite.js           # SQLite操作
│   ├── middleware/             # 中间件
│   │   └── auth.js             # 认证中间件
│   ├── app.js                 # Express应用配置
│   └── index.js               # 项目入口
├── docs/                      # 文档
│   └── api/                   # API文档
├── examples/                  # 示例代码
├── temp/                      # 临时文件目录
└── download/                  # 下载文件目录
```

## 环境配置

在运行项目前，需要设置以下环境变量：

```bash
# 超星学习通认证信息
COOKIE=your_cookie_here
BBSID=your_bbsid_here

# 数据库配置
DB_TYPE=nedb                   # 数据库类型 (nedb, sqlite, mysql, postgres, mongodb)
NEDB_FILENAME=./data/database.nedb    # NeDB文件路径
SQLITE_FILENAME=./data/database.sqlite # SQLite文件路径

# JWT配置
JWT_SECRET=chaoxing_default_secret     # JWT密钥
JWT_EXPIRES_IN=24h                     # JWT过期时间

# 可选配置
ENABLE_DEBUG_LOG=true          # 启用调试日志
```

## API接口文档

详细的API接口文档请查看 [docs/api](docs/api) 目录：

- [认证API](docs/api/auth.cn.md) - 用户注册、登录和认证管理
- [Flutter API](docs/api/flutter.cn.md) - Flutter客户端接口

## 安全考虑

1. 所有API请求需要有效的Cookie和Bbsid
2. 预签名URL具有时效性（默认5分钟）
3. 临时文件定期自动清理
4. 文件大小限制（默认100MB）
5. 用户密码使用bcrypt加密存储
6. 使用JWT进行无状态身份验证

## 部署说明

1. 安装依赖：
   ```bash
   npm install
   ```

2. 配置环境变量：
   ```bash
   cp .env.example .env
   # 编辑.env文件，填入必要的认证信息
   ```

3. 启动服务：
   ```bash
   npm start
   # 或者
   node index.js
   ```

4. 使用终端模式：
   ```bash
   npm run terminal
   ```

## 开发者

如需贡献代码或报告问题，请访问项目仓库。

## 许可证

MIT
