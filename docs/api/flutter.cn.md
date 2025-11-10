# Flutter API

## 概述

Flutter API为Flutter应用程序提供了一个统一的接口，用于与超星网盘服务交互。它支持文件操作，如上传、下载、列表查看、文件夹创建和资源管理。

## 基础URL

```
http://localhost:3000/flutter
```

## 认证

认证通过服务器端的环境变量处理。服务器使用环境中设置的COOKIE和BBSID值来认证超星服务。用户也可以通过认证API提供自己的认证信息。

## API端点

### 1. 统一API入口

**端点**: `POST /flutter/api`

所有Flutter客户端请求都通过此统一入口处理，通过`action`参数区分不同操作。

#### 请求格式

```json
{
  "action": "操作类型",
  "params": {
    // 操作参数
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
| getUploadConfig | - | 获取上传配置 |
| syncUpload | uploadResult, fileName, dirId | 同步上传状态 |

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

### 4. 上传配置

**端点**: `POST /flutter/get-upload-config`

获取客户端直接上传到超星服务器的上传配置参数。

#### 响应

```json
{
  "success": true,
  "data": {
    "uploadUrl": "上传URL",
    "puid": "用户ID",
    "token": "上传令牌",
    "headers": {
      "User-Agent": "用户代理",
      "Referer": "Referer头"
    }
  }
}
```

### 5. 文件上传

**端点**: `POST /flutter/upload`

处理multipart/form-data文件上传。

#### 表单字段

- `file`: 要上传的文件
- `action`: 必须为"uploadFile"
- `dirId`: 目标目录ID（可选，默认为根目录）

#### 响应

```json
{
  "success": true,
  "data": {
    "message": "上传成功",
    "fileId": "文件ID"
  }
}
```

### 6. API文档

**端点**: `GET /flutter/docs`

获取JSON格式的API文档。

#### 响应

返回包括端点、参数和示例在内的完整API文档。

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