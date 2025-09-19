# 🐳 Docker Setup Guide

Complete guide for running YaPague! backend using Docker and Docker Compose for development and production environments.

## 🎯 Prerequisites

### Required Software
- **Docker** (v20.0.0 or higher)
  ```bash
  docker --version
  ```
- **Docker Compose** (v2.0.0 or higher)
  ```bash
  docker-compose --version
  ```

### Installation

#### On Ubuntu/Debian:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin
```

#### On macOS:
```bash
# Install Docker Desktop
brew install --cask docker

# Or download from: https://www.docker.com/products/docker-desktop
```

#### On Windows:
Download Docker Desktop from [Docker official website](https://www.docker.com/products/docker-desktop)

## 📁 Project Structure

```
yapague-backend/
├── docker-compose.yml          # Main compose configuration
├── Dockerfile                  # Application container
├── .dockerignore              # Files to ignore in Docker build
├── .env                       # Environment variables
└── database/
    └── init/                  # Database initialization scripts
```

## 🚀 Docker Commands

### Quick Start (Development)
```bash

# Create buils in development mode
docker-compose up --build

# Start all services in development mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Individual Service Management

#### Start Services
```bash
# Start database only
docker-compose up -d yapague-postgres

# Start application (depends on database)
docker-compose up -d yapague-backend

# Start all services
docker-compose up -d
```

#### View Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs yapague-backend
docker-compose logs yapague-postgres

# Follow logs in real-time
docker-compose logs -f yapague-backend
```

#### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This deletes database data)
docker-compose down -v

# Stop specific service
docker-compose stop yapague-backend
```

### Development Workflow

#### 1. Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd yapague-backend

# Copy environment file
cp .env.example .env
# Edit .env with Docker settings (see above)

# Build and start services
docker-compose up -d --build
```

#### 2. Development with Hot Reload
```bash
# Start in development mode (with file watching)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Or use the development profile
docker-compose --profile dev up -d
```

#### 3. View Service Status
```bash
# Check service status
docker-compose ps

# Check resource usage
docker stats
```

#### 4. Database Operations
```bash
# Connect to PostgreSQL container
docker-compose exec yapague-postgres psql -U your_username -d your_database_name

# Backup database
docker-compose exec yapague-postgres pg_dump -U your_username your_database_name > backup.sql

# Restore database
docker-compose exec -T yapague-postgres psql -U your_username -d your_database_name < backup.sql
```

#### 5. Application Container Operations
```bash
# Execute commands in running container
docker-compose exec yapague-backend npm run lint
docker-compose exec yapague-backend npm run build

# Access container shell
docker-compose exec yapague-backend bash

# View container file system
docker-compose exec yapague-backend ls -la
```

## 🔧 Docker Compose Services

### Service Overview
```yaml
services:
  yapague-postgres:    # PostgreSQL database
    ports: "5433:5432"  # Host:Container
  
  yapague-backend:     # NestJS application
    ports: "3000:3000"  # Host:Container
    depends_on: yapague-postgres
```

### Network Configuration
- **Internal Network**: Services communicate using service names
- **External Access**: Services are accessible via localhost ports
- **Database**: `yapague-postgres:5432` (internal) / `localhost:5433` (external)
- **Backend**: `yapague-backend:3000` (internal) / `localhost:3000` (external)

## 📊 Monitoring and Debugging

### Health Checks
```bash
# Check if services are healthy
docker-compose ps

# Check specific service health
docker inspect yapague-backend-yapague-backend-1 --format='{{.State.Health.Status}}'
```

### Resource Monitoring
```bash
# Monitor resource usage
docker stats

# View detailed container info
docker-compose exec yapague-backend cat /proc/meminfo
docker-compose exec yapague-backend df -h
```

### Debugging

#### Access Application Logs
```bash
# View recent logs
docker-compose logs --tail=100 yapague-backend

# Follow logs with timestamps
docker-compose logs -f -t yapague-backend

# Search logs
docker-compose logs yapague-backend | grep "ERROR"
```

#### Debug Database Issues
```bash
# Check database connection
docker-compose exec yapague-backend npm run test:db

# View database logs
docker-compose logs yapague-postgres

# Connect to database directly
docker-compose exec yapague-postgres psql -U your_username -d your_database_name -c "SELECT version();"
```

#### Debug Network Issues
```bash
# Test connectivity between services
docker-compose exec yapague-backend ping yapague-postgres

# Check port binding
docker-compose port yapague-backend 3000
docker-compose port yapague-postgres 5432
```

## 🧪 Testing with Docker

### Run Tests in Container
```bash
# Run unit tests
docker-compose exec yapague-backend npm run test

# Run linting
docker-compose exec yapague-backend npm run lint

# Run specific test files
docker-compose exec yapague-backend npm run test -- auth.service.spec.ts
```

### API Testing
```bash
# Test API endpoints
curl http://localhost:3000/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user_DNI_number": "YOUR_TEST_ID", "user_password": "YourSecurePassword123!"}'

# Test Swagger documentation
curl http://localhost:3000/docs
```

## 🚀 Production Deployment

### 1. Production Build
```bash
# Build for production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 2. Environment Variables for Production
```env
NODE_ENV=production
DB_SYNC=false               # Never auto-sync in production
DB_LOGGING=false            # Disable SQL logging
LOG_LEVEL=warn              # Reduce log verbosity
SWAGGER_ENABLED=false       # Disable Swagger in production

# Use strong, unique secrets
JWT_SECRET=your-production-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-production-refresh-secret-minimum-32-characters
SESSION_SECRET=your-production-session-secret-minimum-32-characters
ENCRYPTION_KEY=your-production-32-character-encryption-key
ENCRYPTION_IV=your-production-16-character-iv
```

### 3. Security Considerations
```bash
# Run security scan
docker scan yapague-backend:latest

# Update base images regularly
docker-compose pull
docker-compose up -d --build
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :5433

# Change ports in docker-compose.yml
services:
  yapague-backend:
    ports:
      - "3001:3000"  # Use different host port
```

#### Database Connection Issues
```bash
# Check database service status
docker-compose ps yapague-postgres

# Restart database service
docker-compose restart yapague-postgres

# Check database logs
docker-compose logs yapague-postgres

# Test database connection manually
docker-compose exec yapague-postgres psql -U postgres -d yapague_db -c "SELECT 1;"
```

#### Container Build Issues
```bash
# Clean build cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check Dockerfile syntax
docker build --no-cache -t yapague-backend .
```

#### Volume Permission Issues
```bash
# Fix upload directory permissions
docker-compose exec yapague-backend chown -R node:node /app/src/uploads
docker-compose exec yapague-backend chmod -R 755 /app/src/uploads
```

#### Memory Issues
```bash
# Check Docker resource limits
docker system df
docker system events

# Increase Docker memory limit in Docker Desktop settings
# Or add memory limits to docker-compose.yml:
services:
  yapague-backend:
    mem_limit: 1g
    memswap_limit: 1g
```

### Reset Everything
```bash
# Stop all services and remove volumes (WARNING: Deletes all data)
docker-compose down -v

# Remove all images
docker rmi $(docker images "yapague-backend*" -q)

# Clean system
docker system prune -a

# Rebuild from scratch
docker-compose up -d --build
```

## 📝 Docker Compose Profiles

### Development Profile
```bash
# Start development services (with hot reload)
docker-compose --profile dev up -d

# Includes:
# - Volume mounting for live code changes
# - Development environment variables
# - Debug logging enabled
```

### Production Profile
```bash
# Start production services
docker-compose --profile prod up -d

# Includes:
# - Optimized build
# - Production environment variables
# - Security hardening
```

## 🔗 Useful Commands Reference

```bash
# Quick commands cheatsheet
docker-compose up -d                    # Start all services
docker-compose down                     # Stop all services
docker-compose logs -f yapague-backend  # Follow backend logs
docker-compose exec yapague-backend bash # Access backend shell
docker-compose restart yapague-backend  # Restart backend only
docker-compose pull                     # Update base images
docker-compose build --no-cache         # Clean rebuild
docker system prune -a                  # Clean Docker system
```

---

✅ **Docker Setup Complete!** Your YaPague! backend is now running in containers with full database integration.
