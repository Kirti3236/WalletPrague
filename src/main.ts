import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
  BadRequestException,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { getConnectionToken } from '@nestjs/sequelize';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  try {
    // Create the Nest application with minimal logging
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: ['error', 'warn'], // Only show errors and warnings, hide verbose logs
    });

    // Get the configuration service from the app
    const configService = app.get(ConfigService);

    // Security middleware
    app.use(helmet());
    app.use(cookieParser());

    // CORS configuration
    app.enableCors({
      origin:
        configService.get('app.nodeEnv') === 'development'
          ? true // Allow all origins in development
          : configService.get('cors.origin') || ['http://localhost:3000'],
      credentials: configService.get('cors.credentials'),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Trace-Id',
        'Accept',
        'Origin',
      ],
      optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    });

    // Get API version from configuration and ensure it's just the number
    const apiVersionNumber = configService.get('app.apiVersion') || '1';
    
    // Ensure apiVersionNumber is just the number (remove 'v' if present)
    const cleanVersion = apiVersionNumber.replace(/^v/i, '');

    const apiVersion = `v${cleanVersion}`; // Create full version string for display

    // API versioning (NestJS adds 'v' automatically to the number)
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: cleanVersion, // Use just '1', NestJS will make it 'v1'
    });

    // Global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false, // Allow additional properties for Joi validation
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          // Get the first error message from the first validation error
          const firstError = errors[0];
          const firstConstraint = Object.values(
            firstError.constraints || {},
          )[0];
          throw new BadRequestException(firstConstraint);
        },
      }),
    );

    // Serve static files from uploads directory
    app.useStaticAssets(join(process.cwd(), 'src', 'uploads'), {
      prefix: '/uploads/',
    });

    // Global interceptors (filter is configured in app.module.ts)
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    const port = configService.get('app.port') || 3000;

    // Swagger documentation
    if (configService.get('swagger.enabled')) {
      const config = new DocumentBuilder()
        .setTitle('YaPague! Payment Management System API')
        .setDescription(
          `
## 🏗️ API Architecture Overview

### 📍 Route Structure
The API follows a clean approach with **public** and **private** route categories:

- **🌐 Public Routes**: \`/${apiVersion}/public/*\` - No authentication required
- **🔐 Private Routes**: \`/${apiVersion}/private/*\` - JWT authentication required

### 🔐 Authentication Guide

**For Private Endpoints:**
1. First, login using \`POST /${apiVersion}/public/auth/login\`
2. Copy the JWT token from response
3. Click the **🔓 Authorize** button above
4. Enter: \`Bearer <your-jwt-token>\`
5. Click **Authorize** to enable access to private endpoints

### 📊 Endpoint Categories

#### 🌐 Public Routes (No Auth Required)
- User registration and authentication
- Password recovery flows
- Public information endpoints

#### 🔐 Private Routes (JWT Required)
- User profile management
- Account operations
- Protected data access

**Icon Legend:**
- 🌐 = Public/Global endpoints
- 🔐 = Private/Secured endpoints
        `,
        )
        .setVersion('1.0')
        .addServer(`http://localhost:${port}/${apiVersion}`, 'Development server')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token obtained from login endpoint',
            in: 'header',
          },
          'JWT-auth',
        )
        // High-level groups used across modules
        .addTag(
          '🌐 Authentication',
          'Public authentication endpoints (no token required)',
        )
        .addTag(
          '🔐 Users',
          'Private user management endpoints (JWT token required)',
        )
        .addTag('🔐 Wallets', 'Wallet overview and balances')
        .addTag('🔐 Payment Methods', 'Cards and bank accounts (mock)')
        .addTag('🔐 Deposits', 'Deposit funds from card or bank (mock)')
        .addTag(
          '🔐 Payments',
          'Payment requests, QR codes and redemptions (mock)',
        )
        .addTag('🔐 Withdrawals', 'Withdraw funds (mock)')
        .addTag('🔐 Transfers', 'Peer-to-peer transfers')
        .addTag('🔐 Transactions', 'Transaction history and search')
        .addTag('banks', 'Public bank directory lookups')
        .build();

      // Create Swagger document with proper version handling
      // NestJS versioning already adds /v1/ prefix to routes, so we don't need to add it again
      const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey: string, methodKey: string) =>
          methodKey,
      });
      SwaggerModule.setup(
        configService.get('swagger.path') || 'docs',
        app,
        document,
        {
          swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
            docExpansion: 'list',
            filter: true,
            showRequestHeaders: true,
          },
          customSiteTitle: 'YaPague! API Documentation',
          customfavIcon: '/favicon.ico',
          customJs: [
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
          ],
        },
      );
    }

    // Start the server
    await app.listen(port);

    console.log(`🚀 YaPague! Server started.`);
    console.log(`🌐 Server: http://localhost:${port}`);
    console.log(
      `📚 Swagger: http://localhost:${port}/${configService.get('swagger.path') || 'docs'}`,
    );
    console.log(
      `🔑 Public routes: http://localhost:${port}/${apiVersion}/public/*`,
    );
    console.log(
      `🔒 Private routes: http://localhost:${port}/${apiVersion}/private/*`,
    );

    // Test database connection
    try {
      const sequelize = app.get(getConnectionToken());
      await sequelize.authenticate();
      console.log('🗄️  Database connected successfully.');
      // Sync models with alter: true to auto-update tables
      await sequelize.sync({ alter: true });
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      console.log('⚠️  Server will continue without database connection');
    }
  } catch (error) {
    console.error('💥 Failed to start server:', error.message);
    console.error('🔍 Error details:', error);
    process.exit(1);
  }
}

// Start the application with global error handling
bootstrap().catch((error) => {
  console.error('💥 Critical error during application startup:', error);
  process.exit(1);
});
