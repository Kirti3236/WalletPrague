# YaPague! Backend Setup Guide

📋 Complete step-by-step guide to set up the YaPague! Payment Management System API on your local machine.

## 🎯 Prerequisites

Before starting, ensure you have the following installed:

### Required Software
- **Node.js** (v18.0.0 or higher)
  ```bash
  node --version  # Should show v18+
  ```
- **npm** (comes with Node.js) or **yarn**
  ```bash
  npm --version
  ```
- **PostgreSQL** (v13.0 or higher)
  ```bash
  psql --version  # Should show 13+
  ```
- **Git** (for cloning the repository)
  ```bash
  git --version
  ```

### Optional Tools
- **pgAdmin** or **DBeaver** (for database management)
- **Postman** or **Insomnia** (for API testing)
- **VS Code** (recommended IDE)

## 📁 Project Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd yapague-backend
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Verify Installation
```bash
# Check if all dependencies are installed
npm list --depth=0
```

## 🗄️ Database Setup

### 1. Install PostgreSQL

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### On macOS (using Homebrew):
```bash
brew install postgresql
brew services start postgresql
```

#### On Windows:
Download from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database User
```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create a user (replace with your preferred credentials)
CREATE USER your_username WITH PASSWORD 'your_secure_password';
ALTER USER your_username CREATEDB;

# Exit PostgreSQL prompt
\q
```

### 3. Create Database
```bash
# Connect as the new user
psql -U your_username -h localhost

# Create the database
CREATE DATABASE your_database_name;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;

# Exit
\q
```

### 4. Verify Database Connection
```bash
# Test connection
psql -U your_username -h localhost -d your_database_name -c "SELECT version();"
```

## ⚙️ Environment Configuration

### 1. Create Environment File
```bash
# Copy the example environment file
cp .env.example .env

# Or create manually
touch .env
```


### 2. Generate Secure Keys (Production)
For production, generate secure random keys:

```bash
# Generate JWT secrets (32+ characters)
openssl rand -base64 32

# Generate encryption key (32 characters)
openssl rand -hex 16

# Generate encryption IV (16 characters)
openssl rand -hex 8
```

## 🚀 Starting the Application

### 1. Development Mode (Recommended)
```bash
# Start with hot reload
npm run dev

# Or with yarn
yarn dev
```

### 2. Production Build
```bash
# Build the application
npm run build

# Start production server
npm start
```

### 3. Verify Server is Running
Check the console output for:
```
🚀 YaPague! Server started.
🌐 Server: http://localhost:3000
📚 Swagger: http://localhost:3000/docs
🔑 Public routes: http://localhost:3000/v1/public/*
🔒 Private routes: http://localhost:3000/v1/private/*
🗄️ Database connected successfully.
```

### 4. Test API Access
```bash
# Test server health
curl http://localhost:3000

# Test Swagger documentation
curl http://localhost:3000/docs
```

## 📁 Directory Structure Setup

### 1. Create Upload Directories
```bash
# Create upload directories
mkdir -p src/uploads/documents
mkdir -p src/uploads/temp

# Set permissions (Linux/macOS)
chmod 755 src/uploads
chmod 755 src/uploads/documents
```

### 2. Create Log Directory
```bash
# Create log directory
mkdir -p logs

# Set permissions (Linux/macOS)
chmod 755 logs
```

## 🧪 Testing the Setup

### 1. Register a Test User
```bash
curl -X POST http://localhost:3000/v1/public/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_DNI_number": "YOUR_TEST_ID",
    "user_password": "YourSecurePassword123!",
    "user_confirm_password": "YourSecurePassword123!",
    "user_first_name": "Test",
    "user_last_name": "User",
    "user_phone_number": "+1234567890"
  }'
```

### 2. Login with Test User
```bash
curl -X POST http://localhost:3000/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "user_DNI_number": "YOUR_TEST_ID",
    "user_password": "YourSecurePassword123!"
  }'
```

### 3. Test Protected Endpoint
```bash
# Use the JWT token from login response
curl -X GET http://localhost:3000/v1/private/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL service status
sudo systemctl status postgresql

# Start PostgreSQL service
sudo systemctl start postgresql

# Check if port is available
netstat -an | grep 5432
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env file
PORT=3001
```

#### Permission Denied for Uploads
```bash
# Fix upload directory permissions
sudo chown -R $USER:$USER src/uploads
chmod -R 755 src/uploads
```

#### Node.js Version Issues
```bash
# Check Node.js version
node --version

# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18
nvm install 18
nvm use 18
```

### Database Issues

#### Reset Database
```bash
# Drop and recreate database
psql -U your_username -h localhost -c "DROP DATABASE IF EXISTS your_database_name;"
psql -U your_username -h localhost -c "CREATE DATABASE your_database_name;"
```

#### Check Database Tables
```bash
# Connect to database
psql -U your_username -h localhost -d your_database_name

# List tables
\dt

# Describe users table
\d yapague_users

# Exit
\q
```

## 📝 Next Steps

1. **Explore the API**: Visit http://localhost:3000/docs for interactive documentation
2. **Read Development Guide**: Check `DEVELOPMENT.md` for development workflow
3. **Setup Docker**: See `DOCKER_SETUP.md` for containerized development
4. **Review API Routes**: Check `ROUTES.md` for endpoint details

## 🔒 Security Notes

- **Never commit `.env` file** to version control
- **Change default secrets** in production
- **Use strong passwords** for database
- **Enable HTTPS** in production
- **Regularly update dependencies**

---

✅ **Setup Complete!** Your YaPague! backend is now ready for development.
