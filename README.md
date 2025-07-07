# 🚀 Jobful API - Job Notification System

A comprehensive RESTful API for fetching the latest job notifications (India only) from various sources. Features enterprise-grade security, real-time notifications, user interest management, and robust error handling.

[![Security Rating](https://img.shields.io/badge/Security-A+-green.svg)](./SECURITY_IMPLEMENTATION_SUMMARY.md)
[![Node.js Version](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 📋 Table of Contents

- [✨ Features](#-features)
- [🔧 Prerequisites](#-prerequisites)
- [📦 Installation](#-installation)
- [🔐 Authentication](#-authentication)
- [📡 API Endpoints](#-api-endpoints)
- [📊 Pagination](#-pagination)
- [🧪 Testing](#-testing)
- [⚙️ Configuration](#️-configuration)
- [🌍 Environment Variables](#-environment-variables)
- [🔒 Security](#-security)
- [📈 Production Setup](#-production-setup)

## ✨ Features

### 🎯 Core Features
- **Multi-source Job Scraping**: Fetches job notifications from FreeJobAlert portal
- **Smart Categorization**: Banking, Teaching, Engineering, Defence, Railway, Education jobs
- **State-wise Filtering**: All Indian states with dedicated scraping (34 states supported)
- **Real-time Updates**: Automated job data refresh every 30 minutes via cron jobs
- **SQLite Caching**: High-performance local caching for job data with pagination

### 🔐 Security & Authentication
- **JWT Authentication**: Access and refresh token implementation with proper validation
- **Input Validation**: Comprehensive data validation using express-validator and Joi
- **Rate Limiting**: Configurable rate limits (15min/100 requests, auth 15min/10 requests)
- **Security Headers**: Helmet.js implementation with CSP, HSTS, XSS protection
- **Environment Validation**: Startup validation of all required configurations

### 🔔 Notification System
- **Email Notifications**: SMTP-based email alerts via Nodemailer
- **Push Notifications**: Firebase Cloud Messaging (FCM) support
- **Interest-based Filtering**: Users receive notifications based on selected categories
- **FCM Token Management**: Multi-device support with token registration/removal

### 📊 Data Management
- **MongoDB**: User authentication, interests, and FCM tokens storage
- **SQLite**: Job data caching with transaction support and error handling
- **Pagination**: Efficient data retrieval (default: 20 items, max: 100 per page)
- **Cron Jobs**: Automated scraping every 30 minutes with comprehensive error handling

## 🔧 Prerequisites

- **Node.js** (v18 or later)
- **MongoDB** (v6.0 or later)
- **npm** package manager
- **Firebase Project** (for push notifications)
- **SMTP Server** (Gmail, SendGrid, etc.)

## 📦 Installation

### 1. Clone Repository
```bash
git clone https://github.com/thrishank007/jobful-api.git
cd jobful-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server
NODE_ENV=development
PORT=5115

# Database
MONGO_URI=mongodb://localhost:27017/jobful-api

# JWT Configuration (minimum 32 characters each)
JWT_ACCESS_SECRET=your_super_secure_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-service-account%40your-project.iam.gserviceaccount.com
```

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-service-account%40your-project.iam.gserviceaccount.com
```

### 4. Start Server
```bash
# Development
npm run devrun

# Production
npm start
```

### 5. Verify Installation
```bash
curl http://localhost:5115/health
```

## 🔐 Authentication

JWT-based authentication with access/refresh token strategy:
- **Access Token**: 15 minutes (for API requests)
- **Refresh Token**: 7 days (for token renewal)
- **Rate Limited**: Authentication endpoints protected

## 📡 API Endpoints

### Public Routes

#### Root Endpoint
```http
GET /
```
**Response:**
```json
{
  "message": "Jobful API Server",
  "status": "operational",
  "version": "2.1.0",
  "timestamp": "2025-07-06T10:30:00.000Z"
}
```

### Authentication Routes

#### Register User
```http
POST /auth/register
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "dob": "1990-01-01",
  "phoneNumber": "+91-9876543210",
  "interests": ["Engineering", "Banking"]
}
```

#### Login User
```http
POST /auth/login
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Refresh Token
```http
POST /auth/refresh-token
```
**Headers:**
```
refreshToken: your_refresh_token
```

#### Get User Profile
```http
GET /auth/profile?userId=USER_ID
```

#### Update User Profile
```http
PATCH /auth/updateProfile?userId=USER_ID
```

#### Forgot Password
```http
POST /auth/forgot-password
```

#### Reset Password
```http
PATCH /auth/reset-password
```

### User Interest Management (Protected)

#### Get User Interests
```http
GET /user/interests
```
**Headers:** `Authorization: Bearer ACCESS_TOKEN`

#### Add User Interests
```http
POST /user/interests
```
**Body:**
```json
{
  "categories": ["Defence", "Railway"]
}
```

#### Remove User Interest
```http
DELETE /user/interests/{category}
```
**Example:** `DELETE /user/interests/Banking`

### Notification System (Protected)

#### Register FCM Token
```http
POST /notifications/fcm-token
```
**Body:**
```json
{
  "token": "fcm_token_string"
}
```

#### Remove FCM Token
```http
DELETE /notifications/fcm-token
```
**Body:**
```json
{
  "token": "fcm_token_string"
}
```

#### Update Notification Settings
```http
PATCH /notifications/notification-settings
```
**Body:**
```json
{
  "email": true,
  "push": false
}
```

#### Get Notification Settings
```http
GET /notifications/notification-settings
```

#### Subscribe to Category Topic
```http
POST /notifications/subscribe-topic/{category}
```
**Example:** `POST /notifications/subscribe-topic/engineering`

#### Unsubscribe from Category Topic
```http
POST /notifications/unsubscribe-topic/{category}
```
**Example:** `POST /notifications/unsubscribe-topic/engineering`

#### Send Test Notification
```http
POST /notifications/test-notification
```

### Job Data Routes (Protected)

All job endpoints require `Authorization: Bearer ACCESS_TOKEN` and support pagination.

#### Available Endpoints:
- `GET /freejobalert/v1/` - Latest jobs
- `GET /freejobalert/v1/bank-jobs` - Banking sector jobs
- `GET /freejobalert/v1/teaching-jobs` - Teaching positions
- `GET /freejobalert/v1/engineering-jobs` - Engineering roles
- `GET /freejobalert/v1/railway-jobs` - Railway department jobs
- `GET /freejobalert/v1/defence-jobs` - Defence sector jobs
- `GET /freejobalert/v1/latest-edu` - Education sector jobs
- `GET /freejobalert/v1/gov/other-all-india-exam` - All India government exams
- `GET /freejobalert/v1/gov/state/{CODE}` - State-specific jobs (UP, MH, KA, etc.)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "postName": "Software Engineer",
      "postBoard": "Company Name",
      "postDate": "2025-07-06",
      "lastDate": "2025-07-20",
      "advtNo": "ADV/2025/001",
      "postUrl": "https://example.com/job",
      "apply_online": "https://example.com/apply",
      "notification": "https://example.com/notification",
      "official_website": "https://example.com"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

### Health & Monitoring

#### Health Check
```http
GET /health
```

#### Readiness Probe
```http
GET /health/ready
```

#### Liveness Probe
```http
GET /health/live
```

## 📊 Pagination

All job endpoints support pagination:
- `?page=1` - Page number (default: 1)
- `?limit=20` - Items per page (default: 20, max: 100)

**Example:**
```bash
GET /freejobalert/v1/engineering-jobs?page=2&limit=25
```

## 🧪 Testing

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:5115/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "dob": "1990-01-01",
    "phoneNumber": "+91-9876543210",
    "interests": ["Engineering"]
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5115/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get Jobs:**
```bash
curl -X GET "http://localhost:5115/freejobalert/v1/engineering-jobs?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## ⚙️ Configuration

### Available Scripts
```bash
npm run devrun           # Development with nodemon
npm start               # Production server
npm test                # Run tests
npm run security:audit  # Security vulnerability scan
npm run security:check  # npm audit check
npm run deps:check      # Check outdated dependencies
npm run deps:update     # Update dependencies
```

## 🌍 Environment Variables

### Required Variables
```env
NODE_ENV=development|production
PORT=5115
MONGO_URI=mongodb://localhost:27017/jobful-api
JWT_ACCESS_SECRET=min_32_character_secret
JWT_REFRESH_SECRET=min_32_character_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
EMAIL_FROM=your-email@gmail.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk%40your-project.iam.gserviceaccount.com
```

### Optional Variables
```env
NOTIFICATION_ICON_URL=https://your-domain.com/icon.png
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🔒 Security

### Security Features
- **Rate Limiting**: 100 requests/15min (general), 10 requests/15min (auth)
- **Input Validation**: Express-validator + Joi schemas
- **Security Headers**: Helmet.js with CSP, HSTS, XSS protection
- **JWT Validation**: Proper token verification with expiry checks
- **Environment Validation**: Required variables checked at startup
- **SQL Injection Prevention**: Parameterized SQLite queries
- **SSRF Protection**: URL validation for scraping endpoints

### Security Headers Applied
```javascript
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: same-origin
```

### Rate Limiting
| Endpoint Type | Window | Max Requests |
|--------------|---------|--------------|
| Authentication | 15 min | 10 |
| General API | 15 min | 100 |
| Notifications | 1 hour | 50 |

## 📈 Production Setup

### 1. Environment Preparation
```bash
NODE_ENV=production
PORT=8080
# Configure MongoDB cluster URI
# Set secure JWT secrets (64+ characters)
# Configure production SMTP service
```

### 2. Process Management (PM2)
```bash
npm install -g pm2
pm2 start index.js --name jobful-api
pm2 startup
pm2 save
```

### 3. Security Audit
```bash
npm run security:audit
npm run security:check
```

### 4. Monitoring
- Health checks: `/health`, `/health/ready`, `/health/live`
- Log monitoring for error patterns
- Database connection monitoring
- Memory usage tracking

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/thrishank007/jobful-api/issues)
- **Security**: Report security issues via GitHub Security tab

---

## 📊 Project Status

- **Version**: 2.1.0
- **Status**: Production Ready ✅
- **Security Rating**: A+ ✅
- **Dependencies**: 0 vulnerabilities ✅
