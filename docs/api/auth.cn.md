# 认证API

## 概述

认证API提供用户注册、登录和认证管理功能。它使用JWT（JSON Web Tokens）进行无状态认证。

## 基础URL

```
http://localhost:3000/auth
```

## API端点

### 1. 用户注册

**端点**: `POST /auth/register`

注册新用户账户。

#### 请求体

```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "cookie": "string (可选)",
  "bbsid": "string (可选)"
}
```

#### 响应

```json
{
  "success": true,
  "message": "注册成功",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  },
  "token": "string"
}
```

#### 错误

- `PARAM_ERROR` (400): 缺少必填字段
- `PARAM_ERROR` (400): 用户名或邮箱已存在

### 2. 用户登录

**端点**: `POST /auth/login`

验证用户并获取JWT令牌。

#### 请求体

```json
{
  "username": "string",
  "password": "string"
}
```

#### 响应

```json
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  },
  "token": "string"
}
```

#### 错误

- `PARAM_ERROR` (400): 缺少必填字段
- `AUTH_ERROR` (401): 用户名或密码无效

### 3. 获取当前用户

**端点**: `GET /auth/me`

获取当前认证用户的信息。

#### 请求头

```
Authorization: Bearer <token>
```

#### 响应

```json
{
  "success": true,
  "data": {
    "cookie": "string",
    "bbsid": "string"
  }
}
```

#### 错误

- `AUTH_ERROR` (401): 缺少或无效的令牌

### 4. 更新用户认证信息

**端点**: `PUT /auth/me/auth`

更新当前用户的认证信息。

#### 请求头

```
Authorization: Bearer <token>
```

#### 请求体

```json
{
  "cookie": "string",
  "bbsid": "string"
}
```

#### 响应

```json
{
  "success": true,
  "message": "认证信息更新成功"
}
```

#### 错误

- `AUTH_ERROR` (401): 缺少或无效的令牌
- `PARAM_ERROR` (400): 更新认证信息失败