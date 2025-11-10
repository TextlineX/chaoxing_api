# Flutter API

## Overview

The Flutter API provides a unified interface for Flutter applications to interact with the Chaoxing cloud storage service. It supports file operations such as upload, download, listing, folder creation, and resource management.

## Base URL

```
http://localhost:3000/flutter
```

## Authentication

Authentication is handled through environment variables on the server side. The server uses COOKIE and BBSID values set in the environment to authenticate with the Chaoxing service. Users can also provide their own authentication information through the authentication API.

## API Endpoints

### 1. Unified API Entry

**Endpoint**: `POST /flutter/api`

All Flutter client requests are processed through this unified entry point, with different operations distinguished by the `action` parameter.

#### Request Format

```json
{
  "action": "operation_type",
  "params": {
    // operation parameters
  }
}
```

#### Supported Operations

| Operation | Parameters | Description |
|-----------|------------|-------------|
| listFiles | folderId | Get file list |
| uploadFile | dirId | Upload file |
| createFolder | dirName, parentId | Create folder |
| downloadFile | fileId | Get download link |
| deleteResource | resourceId, isFolder | Delete file or folder |
| moveResource | resourceId, targetId, isFolder | Move file or folder |
| batchMoveResources | resourceIds, targetId, isFolder | Batch move files or folders |
| getUploadConfig | - | Get upload configuration |
| syncUpload | uploadResult, fileName, dirId | Synchronize upload status |

### 2. Proxy Download

**Endpoint**: `GET /flutter/download/:fileId`

Download files through backend proxy to avoid exposing Chaoxing download links directly.

#### Path Parameters

- `fileId`: File ID in the format `id$fileId`

#### Response

Returns file stream directly with appropriate headers.

### 3. Pre-signed Download URL

**Endpoint**: `POST /flutter/get-download-url`

Get a pre-signed download URL for temporary access.

#### Request Body

```json
{
  "fileId": "File ID in the format id$fileId"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "downloadUrl": "Pre-signed download URL",
    "fileName": "File name",
    "expires": "Expiration time"
  }
}
```

### 4. Upload Configuration

**Endpoint**: `POST /flutter/get-upload-config`

Get upload configuration parameters for direct client-side upload to Chaoxing servers.

#### Response

```json
{
  "success": true,
  "data": {
    "uploadUrl": "Upload URL",
    "puid": "User ID",
    "token": "Upload token",
    "headers": {
      "User-Agent": "User agent",
      "Referer": "Referer header"
    }
  }
}
```

### 5. File Upload

**Endpoint**: `POST /flutter/upload`

Handle file uploads with multipart/form-data.

#### Form Fields

- `file`: The file to upload
- `action`: Must be "uploadFile"
- `dirId`: Target directory ID (optional, defaults to root)

#### Response

```json
{
  "success": true,
  "data": {
    "message": "Upload successful",
    "fileId": "File ID"
  }
}
```

### 6. API Documentation

**Endpoint**: `GET /flutter/docs`

Get API documentation in JSON format.

#### Response

Returns comprehensive API documentation including endpoints, parameters, and examples.

## Error Handling

API uses standard HTTP status codes to indicate request status. Error response format:

```json
{
  "success": false,
  "error": {
    "code": "Error code",
    "message": "Error description"
  }
}
```

Common error codes:

- `AUTH_ERROR` (401): Authentication failed
- `PARAM_ERROR` (400): Parameter error
- `SERVER_ERROR` (500): Internal server error
- `NOT_FOUND` (404): Resource not found