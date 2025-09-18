import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/sequelize';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  try {
    // Create the Nest application with minimal logging
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn'], // Only show errors and warnings, hide verbose logs
    });

    // Get the configuration service from the app
    const configService = app.get(ConfigService);

    // Security middleware
    app.use(helmet());
    app.use(cookieParser());

    // CORS configuration
    app.enableCors({
      origin: configService.get('cors.origin') || ['http://localhost:3000'],
      credentials: configService.get('cors.credentials'),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Trace-Id',
      ],
    });

    // API versioning
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: configService.get('app.apiVersion') || 'v1',
    });

    // Global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global interceptors (filter is configured in app.module.ts)
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    // Swagger documentation
    if (configService.get('swagger.enabled')) {
      const config = new DocumentBuilder()
        .setTitle('YaPague! Payment Management System API')
        .setDescription('Payment Management System API Documentation')
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .addTag('Authentication', 'User authentication and authorization')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(
        configService.get('swagger.path') || 'docs',
        app,
        document,
        {
          swaggerOptions: {
            persistAuthorization: true,
          },
        },
      );
    }

    const port = configService.get('app.port') || 3000;

    // Start the server
    await app.listen(port);

    console.log(`🚀 YaPague! Server started.`);
    console.log(`🌐 Server: http://localhost:${port}`);
    console.log(
      `📚 Swagger: http://localhost:${port}/${configService.get('swagger.path') || 'docs'}`,
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
