# YaPague! Payment Management System API

🚀 A robust NestJS-based backend API for payment management with user authentication, file uploads, and comprehensive security features.

## 🌟 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 13+
- npm or yarn

### 🏃‍♂️ Fast Setup
```bash
# Clone and install
git clone <repository-url>
cd yapague-backend
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev
```

### 🐳 Docker Quick Start
```bash
# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f yapague-backend
```

## 📚 Documentation

- **[📋 Detailed Setup Guide](./SETUP.md)** - Complete installation and configuration
- **[🐳 Docker Setup Guide](./DOCKER_SETUP.md)** - Docker-based development and deployment
- **[⚡ Development Guide](./DEVELOPMENT.md)** - Development workflow and best practices
- **[🛣️ API Routes](./ROUTES.md)** - API endpoints documentation

## 🔗 Quick Links

| Service | URL | Description |
|---------|-----|-------------|
| **API Server** | http://localhost:3000 | Main API endpoint |
| **Swagger Docs** | http://localhost:3000/docs | Interactive API documentation |
| **Public Routes** | http://localhost:3000/v1/public/* | Authentication endpoints |
| **Private Routes** | http://localhost:3000/v1/private/* | Protected endpoints (JWT required) |

## 🎯 Key Features

- ✅ **JWT Authentication** with refresh tokens
- ✅ **Role-based Access Control** (Admin/User)
- ✅ **File Upload Support** for documents
- ✅ **PostgreSQL Database** with Sequelize ORM
- ✅ **Request Rate Limiting** and security middleware
- ✅ **Comprehensive Error Handling** with tracing
- ✅ **API Documentation** with Swagger
- ✅ **Docker Support** for easy deployment
- ✅ **Input Validation** with Joi and class-validator
- ✅ **Internationalization** (i18n) support

## 🏗️ Project Structure

```
yapague-backend/
├── src/
│   ├── modules/          # Feature modules (auth, users)
│   ├── common/           # Shared utilities, guards, interceptors
│   ├── models/           # Database models
│   ├── config/           # Configuration files
│   └── uploads/          # File upload storage
├── dist/                 # Compiled JavaScript output
├── logs/                 # Application logs
└── docker-compose.yml    # Docker services
```

## 🚀 Available Scripts

```bash
npm run dev         # Start development server with hot reload
npm run build       # Build for production
npm start           # Start production server
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
```
## 📱 Testing the API

### 1. Register a new user
```bash
POST /v1/public/auth/register
```

### 2. Login
```bash
POST /v1/public/auth/login
```

### 3. Access protected endpoints
```bash
GET /v1/private/user/profile
Authorization: Bearer <your-jwt-token>
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📞 Support

- **Documentation**: Check the guides in the project root
- **API Testing**: Use the Swagger interface at `/docs`
- **Issues**: Create an issue in the repository

---

**Made with ❤️ using NestJS, PostgreSQL, and Docker**
