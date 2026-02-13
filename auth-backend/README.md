# 🔐 Express + SQLite Authentication Backend

A secure local authentication system with JWT tokens, bcrypt password hashing, and Postman-ready API testing.

## 📁 Folder Structure

```
auth-backend/
├── src/
│   ├── config/
│   │   └── env.ts          # Environment configuration
│   ├── middleware/
│   │   ├── auth.ts          # JWT authentication middleware
│   │   └── validate.ts      # Input validation middleware
│   ├── routes/
│   │   └── auth.ts          # Auth routes (register, login, profile, users)
│   ├── db.ts                # SQLite database setup
│   └── server.ts            # Express server entry point
├── .env                     # Environment variables (secret keys)
├── .env.example             # Template for .env
├── postman-collection.json  # Postman collection for API testing
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Setup & Run

### Step 1: Install dependencies
```bash
cd auth-backend
npm install
```

### Step 2: Configure environment
```bash
# Edit .env file and change JWT_SECRET to a strong random string
```

### Step 3: Run the server
```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm run build
npm start
```

Server starts at **http://localhost:3000**

## 📡 API Endpoints

| Method | Endpoint              | Auth Required | Description            |
|--------|-----------------------|---------------|------------------------|
| POST   | `/api/auth/register`  | ❌            | Register a new user    |
| POST   | `/api/auth/login`     | ❌            | Login & get JWT token  |
| GET    | `/api/auth/profile`   | ✅ Bearer     | Get logged-in user     |
| GET    | `/api/auth/users`     | ❌            | List all users (test)  |

## 📬 Postman Testing

### Import Collection
1. Open **Postman**
2. Click **Import** → **Upload Files**
3. Select `postman-collection.json`
4. The collection "Auth Backend API" appears with 9 pre-built requests

### Test Flow
Run requests in order (1→9):

#### 1. Register User ✅
```
POST http://localhost:3000/api/auth/register
Body: { "email": "test@example.com", "password": "password123" }
→ 201: { message, user: { id, email }, token }
```

#### 2. Duplicate Registration ❌
```
Same request again
→ 409: { message: "User already exists" }
```

#### 3. Invalid Email ❌
```
Body: { "email": "invalid-email", "password": "password123" }
→ 400: { message: "Invalid email format" }
```

#### 4. Short Password ❌
```
Body: { "email": "test2@example.com", "password": "123" }
→ 400: { message: "Password must be at least 6 characters" }
```

#### 5. Login ✅
```
POST http://localhost:3000/api/auth/login
Body: { "email": "test@example.com", "password": "password123" }
→ 200: { message, user, token }
```
⚡ Token auto-saved to collection variable!

#### 6. Wrong Password ❌
```
Body: { "email": "test@example.com", "password": "wrongpassword" }
→ 401: { message: "Invalid email or password" }
```

#### 7. Get Profile (with token) ✅
```
GET http://localhost:3000/api/auth/profile
Header: Authorization: Bearer {{token}}
→ 200: { user: { id, email, created_at } }
```

#### 8. Get Profile (no token) ❌
```
GET http://localhost:3000/api/auth/profile
→ 401: { message: "Access token required" }
```

#### 9. List All Users ✅
```
GET http://localhost:3000/api/auth/users
→ 200: { count, users: [...] }
```

## 🗄️ Database Schema

```sql
CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,        -- bcrypt hashed (12 rounds)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

The `auth.db` file is created automatically in the `auth-backend/` folder on first run.

## 🔒 Security Features

- **bcrypt** password hashing (12 salt rounds)
- **JWT** token authentication with configurable expiry
- **Input validation** (email format, password length)
- **Duplicate prevention** (unique email constraint)
- **Generic error messages** on login to prevent enumeration
- **CORS** enabled for cross-origin requests
- **Environment variables** for secrets (never hardcoded)
