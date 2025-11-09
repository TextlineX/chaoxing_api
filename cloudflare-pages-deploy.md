# Cloudflare Pages 部署指南

## 部署步骤

1. **准备仓库**
   - 确保所有必要的文件已提交到GitHub仓库
   - 特别是 `_worker.js`、`functions/` 目录和 `_headers`、`_redirects` 文件

2. **登录Cloudflare Dashboard**
   - 访问 [cloudflare.com](https://cloudflare.com) 并登录
   - 进入 "Pages" 部分

3. **创建新项目**
   - 点击 "Create a project"
   - 连接到您的GitHub仓库
   - 选择 "chaoxing_api" 仓库

4. **配置构建设置**
   - 构建命令: `echo "No build required"`
   - 构建输出目录: `.` (根目录)
   - Root directory: `/` (根目录)

5. **设置环境变量**
   - 在项目设置中添加以下环境变量：
     - `COOKIE`: 您的超星Cookie
     - `BBSID`: 您的超星BBSID
     - `SIGNATURE_KEY`: 用于预签名URL签名的密钥（可选）
     - `MOBILE_API_TOKEN`: 移动端API令牌（可选）

6. **部署**
   - 点击 "Save and Deploy"
   - 等待部署完成

## 使用API

部署完成后，您的API将可通过以下端点访问：
- Flutter API: `https://your-project.pages.dev/flutter/api`
- 通用API: `https://your-project.pages.dev/api`

## 故障排除

### 问题：找不到package.json
**解决方案**：使用 `_worker.js` 而不是依赖package.json。Cloudflare Pages Functions可以直接使用ES模块导入。

### 问题：构建失败
**解决方案**：确保构建命令设置为 `echo "No build required"`，因为我们的项目不需要构建步骤。

### 问题：API返回404
**解决方案**：检查 `_redirects` 文件是否正确配置，确保API路径被正确重定向。

### 问题：CORS错误
**解决方案**：检查 `_headers` 文件是否正确配置了CORS头。

## 高级配置

### 使用自定义域名
1. 在Cloudflare Pages项目设置中
2. 点击 "Custom domains"
3. 添加您的域名

### 使用Cloudflare R2存储文件
1. 在Cloudflare Dashboard中创建R2存储桶
2. 在环境变量中添加R2存储桶名称
3. 修改代码以使用R2 API

### 使用Cloudflare KV缓存数据
1. 在Cloudflare Dashboard中创建KV命名空间
2. 在环境变量中添加KV绑定
3. 修改代码以使用KV API
