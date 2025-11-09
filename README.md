# 朝星网盘API服务文档

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

## 技术栈

- Node.js
- Express.js
- Axios
- Multer（文件上传）
- FormData（表单数据处理）

## 项目结构

```
chaoxing/
├── src/
│   ├── api/                    # API路由
│   │   ├── flutter_new.js      # Flutter客户端API（主要）
│   │   └── index.js           # API路由索引
│   ├── services/               # 业务逻辑层
│   │   ├── file_new.js        # 文件操作服务（主要）
│   │   └── auth.js           # 认证服务
│   ├── utils/                 # 工具类
│   │   ├── error.js           # 错误处理
│   │   └── http.js            # HTTP请求工具
│   ├── config/                # 配置
│   │   └── index.js           # 项目配置
│   ├── app.js                 # Express应用配置
│   └── index.js              # 项目入口
├── docs/                      # 文档
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

# 可选配置
SIGNATURE_KEY=your_signature_key_here  # 用于预签名URL签名
MOBILE_API_TOKEN=your_api_token_here   # 移动端API令牌
```

## API接口

### 1. 统一API入口

**端点**: `POST /flutter/api`

所有Flutter客户端请求都通过此统一入口处理，通过`action`参数区分不同操作。

#### 请求格式

```json
{
  "action": "操作类型",
  "params": {
    
  }
}
```

#### 支持的操作

| 操作类型 | 参数 | 描述 |
|---------|------|------|
| listFiles | folderId | 获取文件列表 |
| uploadFile | dirId | 上传文件 |
| createFolder | dirName, parentId | 创建文件夹 |
| downloadFile | fileId | 获取下载链接 |
| deleteResource | resourceId, isFolder | 删除文件或文件夹 |
| moveResource | resourceId, targetId, isFolder | 移动文件或文件夹 |
| batchMoveResources | resourceIds, targetId, isFolder | 批量移动文件或文件夹 |

### 2. 代理下载

**端点**: `GET /flutter/download/:fileId`

通过后端代理下载文件，避免直接暴露超星下载链接。

#### 路径参数

- `fileId`: 文件ID，格式为`id$fileId`

#### 响应

直接返回文件流，带有适当的响应头。

### 3. 预签名下载URL

**端点**: `POST /flutter/get-download-url`

获取文件的预签名下载URL，支持临时访问。

#### 请求体

```json
{
  "fileId": "文件ID，格式为id$fileId"
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "downloadUrl": "预签名下载URL",
    "fileName": "文件名",
    "expires": "过期时间"
  }
}
```

## 使用示例

### 获取文件列表

```javascript
const response = await fetch('http://your-server:3000/flutter/api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'your_cookie',
    'Bbsid': 'your_bbsid'
  },
  body: JSON.stringify({
    action: 'listFiles',
    params: { folderId: '-1' }
  })
});

const data = await response.json();
console.log(data.data); // 文件列表
```

### 上传文件

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://your-server:3000/flutter/api', {
  method: 'POST',
  headers: {
    'Cookie': 'your_cookie',
    'Bbsid': 'your_bbsid'
  },
  body: formData
});

// 注意：上传文件时，action和params通过表单字段传递
// 实际实现可能需要根据后端代码调整
```

### 下载文件

```javascript
// 方式1：获取预签名URL
const response = await fetch('http://your-server:3000/flutter/get-download-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'your_cookie',
    'Bbsid': 'your_bbsid'
  },
  body: JSON.stringify({
    fileId: '12345$abcdef'
  })
});

const data = await response.json();
window.open(data.data.downloadUrl);

// 方式2：代理下载
window.open('http://your-server:3000/flutter/download/12345$abcdef');
```

## 错误处理

API使用标准HTTP状态码表示请求状态，错误响应格式如下：

```json
{
  "success": false,
  "error": {
    "code": "错误代码",
    "message": "错误描述"
  }
}
```

常见错误代码：

- `AUTH_ERROR` (401): 认证失败
- `PARAM_ERROR` (400): 参数错误
- `SERVER_ERROR` (500): 服务器内部错误
- `NOT_FOUND` (404): 资源不存在

## 文件名编码

系统自动处理中文文件名编码问题：
- 上传时保留原始文件名
- 下载时自动解码URL编码的文件名
- 列表显示时解码文件名

## 安全考虑

1. 所有API请求需要有效的Cookie和Bbsid
2. 预签名URL具有时效性（默认5分钟）
3. 临时文件定期自动清理
4. 文件大小限制（默认100MB）

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

## 更新日志

### v2.0.0
- 新增代理下载功能
- 优化中文文件名处理
- 重构API结构，统一入口
- 改进错误处理

### v1.0.0
- 初始版本
- 基本文件操作功能
- Flutter客户端支持

## 常见问题

### Q: 如何获取Cookie和Bbsid？
A: 登录超星学习通网页版，通过浏览器开发者工具查看请求头中的Cookie和页面中的Bbsid。

### Q: 上传文件大小限制是多少？
A: 默认限制为100MB，可在代码中修改。

### Q: 如何处理中文文件名？
A: 系统自动处理，无需额外操作。

### Q: 临时文件多久清理一次？
A: 默认每30分钟清理一次，保留2小时内的文件。

## 开发者

如需贡献代码或报告问题，请访问项目仓库。

## 许可证

MIT
