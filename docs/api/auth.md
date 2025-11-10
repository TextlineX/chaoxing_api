# Authentication API

## Overview

The authentication API provides user registration, login, and authentication management features. It uses JWT (JSON Web Tokens) for stateless authentication.

## Base URL

```
http://localhost:3000/auth
```

## API Endpoints

### 1. User Registration

**Endpoint**: `POST /auth/register`

Register a new user account.

#### Request Body

```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "cookie": "string (optional)",
  "bbsid": "string (optional)"
}
```

#### Response

```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  },
  "token": "string"
}
```

#### Errors

- `PARAM_ERROR` (400): Missing required fields
- `PARAM_ERROR` (400): Username or email already exists

### 2. User Login

**Endpoint**: `POST /auth/login`

Authenticate a user and obtain a JWT token.

#### Request Body

```json
{
  "username": "string",
  "password": "string"
}
```

#### Response

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string"
  },
  "token": "string"
}
```

#### Errors

- `PARAM_ERROR` (400): Missing required fields
- `AUTH_ERROR` (401): Invalid username or password

### 3. Get Current User

**Endpoint**: `GET /auth/me`

Get the current authenticated user's information.

#### Headers

```
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "data": {
    "cookie": "string",
    "bbsid": "string"
  }
}
```

#### Errors

- `AUTH_ERROR` (401): Missing or invalid token

### 4. Update User Authentication

**Endpoint**: `PUT /auth/me/auth`

Update the current user's authentication information.

#### Headers

```
Authorization: Bearer <token>
```

#### Request Body

```json
{
  "cookie": "string",
  "bbsid": "string"
}
```

#### Response

```json
{
  "success": true,
  "message": "Authentication information updated successfully"
}
```

#### Errors

- `AUTH_ERROR` (401): Missing or invalid token
- `PARAM_ERROR` (400): Failed to update authentication information