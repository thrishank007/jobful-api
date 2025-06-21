# Jobful API

A RESTful API for fetching the latest job notifications (India only) from various sources. The API supports user authentication using JWT with refresh tokens and stores user data in MongoDB.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Pagination](#pagination)
- [Testing](#testing)
  - [Using Curl](#using-curl)
  - [Using Postman](#using-postman)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Security](#security)

---

## Features

- Fetch the latest job notifications from various sources.
- User registration and login with JWT authentication.
- Refresh tokens for extended session management.
- Pagination for efficient data retrieval.
- Data storage using MongoDB.
- Web scraping with Axios and Cheerio.
- Logging with Signale for debugging and monitoring.

---

## Prerequisites

- Node.js (v14 or later)
- MongoDB (local or cloud instance)
- npm or yarn

---

## Installation

1. **Clone the repository:**

   ```sh
   git clone https://github.com/thrishank007/jobful-api.git
   ```

2. **Install dependencies:**

   ```sh
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the root directory with the following content:

   ```env
   PORT=3000
   JWT_ACCESS_SECRET=your_access_jwt_secret
   JWT_REFRESH_SECRET=your_refresh_jwt_secret
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   MONGO_URI=mongodb://localhost:27017/jobful-api
   SMTP_HOST=YOUR_SMTP_HOST
   SMTP_PORT=YOUR_SMTP_PORT
   SMTP_USER=YOUR_SMTP_USER
   SMTP_PASS=YOUR_SMTP_PASS
   EMAIL_FROM=YOUR_SENDER_MAIL
   ```

4. **Start the server:**

   ```sh
   npm start
   ```

   For development with hot-reloading:

   ```sh
   npm run dev
   ```

---

## Usage

### API Endpoints

#### Public Routes

- **Root Route**

  **GET** `/`

  **Response:**

  ```json
  {
    "msg": "In Root"
  }
  ```

#### Authentication Routes

- **Register User**

  **POST** `/auth/register`

  **Request Body:**

  ```json
  {
    "email": "testuser@example.com",
    "password": "password123",
    "fullName": "Test User",
    "dob": "1990-01-01",
    "phoneNumber": "+1234567890",
    "interests": ["Engineering", "Teaching"]
  }
  ```

  **Response:**

  ```json
  {
    "success": true,
    "accessToken": "YOUR_ACCESS_TOKEN",
    "user": {
      "id": "USER_ID",
      "email": "testuser@example.com",
      "fullName": "Test User",
      "dob": "1990-01-01T00:00:00.000Z",
      "phoneNumber": "+1234567890",
      "interests": ["Engineering", "Teaching"]
    }
  }
  ```

- **Login User**

  **POST** `/auth/login`

  **Request Body:**

  ```json
  {
    "email": "testuser@example.com",
    "password": "password123"
  }
  ```

  **Response:**

  ```json
  {
    "success": true,
    "accessToken": "YOUR_ACCESS_TOKEN",
    "user": {
      "id": "USER_ID",
      "email": "testuser@example.com",
      "fullName": "Test User",
      "dob": "1990-01-01T00:00:00.000Z",
      "phoneNumber": "+1234567890",
      "interests": ["Engineering", "Teaching"]
    }
  }
  ```

- **Refresh Token**

  **POST** `/auth/refresh-token`

  **Headers:**

  ```
  refreshToken: YOUR_REFRESH_TOKEN
  ```

  **Response:**

  ```json
  {
    "success": true,
    "accessToken": "NEW_ACCESS_TOKEN"
  }
  ```

#### Protected Routes

- **Get Latest Notifications**

  **GET** `/freejobalert/v1/?page=1&limit=10`

  **Headers:**

  ```
  Authorization: Bearer YOUR_ACCESS_TOKEN
  ```

  **Response:**

  ```json
  {
    "success": true,
    "data": [...],
    "total": NUMBER_OF_TOTAL_RESULTS
  }
  ```

---

## Pagination

Pagination is implemented to handle large datasets efficiently. Specify `page` and `limit` query parameters to control the number of results returned.

**Example:**

```sh
GET /freejobalert/v1/bank-jobs?page=3&limit=5
```

**Response:**

```json
{
  "success": true,
  "data": [...],
  "total": NUMBER_OF_TOTAL_RESULTS
}
```

---

## Testing

### Using Curl

- **Register User:**

  ```sh
  curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123",
    "fullName": "Test User",
    "dob": "1990-01-01",
    "phoneNumber": "+1234567890",
    "interests": ["Engineering", "Teaching"]
  }'
  ```

- **Login User:**

  ```sh
  curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123"
  }'
  ```

- **Access Protected Route:**

  ```sh
  curl -X GET http://localhost:3000/freejobalert/v1/bank-jobs?page=3&limit=5 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

### Using Postman

1. **Register User:**
   - Method: POST
   - URL: `http://localhost:3000/auth/register`
   - Body:

     ```json
     {
       "email": "testuser@example.com",
       "password": "password123",
       "fullName": "Test User",
       "dob": "1990-01-01",
       "phoneNumber": "+1234567890",
       "interests": ["Engineering", "Teaching"]
     }
     ```

2. **Login User:**
   - Method: POST
   - URL: `http://localhost:3000/auth/login`

3. **Access Protected Route:**
   - Method: GET
   - URL: `http://localhost:3000/freejobalert/v1/bank-jobs?page=3&limit=5`
   - Headers:

     ```
     Authorization: Bearer YOUR_ACCESS_TOKEN
     ```

---

## Configuration

- **Port**: The server runs on the port specified in the `.env` file (`PORT=3000` by default).
- **JWT Secrets**: Configure `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in the `.env` file.
- **MongoDB URI**: Set `MONGO_URI` in the `.env` file.
- **SMTP Info**: Configure details of smtp for sending mails

---

## Environment Variables

- `PORT`: Port number for the server.
- `JWT_ACCESS_SECRET`: Secret for signing access tokens.
- `JWT_REFRESH_SECRET`: Secret for signing refresh tokens.
- `JWT_ACCESS_EXPIRES_IN`: Expiry time for access tokens (e.g., `15m` for 15 minutes).
- `JWT_REFRESH_EXPIRES_IN`: Expiry time for refresh tokens (e.g., `7d` for 7 days).
- `MONGO_URI`: MongoDB connection URI.
- `SMTP_HOST: SMTP host for email service
-  SMTP_PORT: MTP port (e.g., 587 or 465)
-  SMTP_USER: SMTP login username
-  SMTP_PASS: SMTP login password
-  EMAIL_FROM: Email appears in 'From' address

---

## Security

- Ensure secrets like `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are kept private.
- Use HTTPS in production to secure data.
