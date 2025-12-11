import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_VERSION: Joi.string().required(),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').optional(),
  DB_NAME: Joi.string().required(),
  DB_SYNC: Joi.boolean().default(true),
  DB_LOGGING: Joi.boolean().default(true),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Security
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),
  SESSION_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_KEY: Joi.string().custom((value, helpers) => {
    // Allow raw 32-character string
    if (value.length === 32) {
      return value;
    }
    // Allow base64-encoded string that decodes to 32 bytes
    try {
      const decoded = Buffer.from(value, 'base64');
      if (decoded.length === 32) {
        return value;
      }
    } catch (e) {
      // Not valid base64, will fail validation below
    }
    return helpers.error('string.encryptionKey');
  }, 'encryption key validation').required().messages({
    'string.encryptionKey': 'ENCRYPTION_KEY must be 32 characters or base64-encoded 32 bytes',
  }),
  ENCRYPTION_IV: Joi.string().custom((value, helpers) => {
    // Allow raw 16-character string
    if (value.length === 16) {
      return value;
    }
    // Allow base64-encoded string that decodes to 16 bytes
    try {
      const decoded = Buffer.from(value, 'base64');
      if (decoded.length === 16) {
        return value;
      }
    } catch (e) {
      // Not valid base64, will fail validation below
    }
    return helpers.error('string.encryptionIv');
  }, 'encryption IV validation').required().messages({
    'string.encryptionIv': 'ENCRYPTION_IV must be 16 characters or base64-encoded 16 bytes',
  }),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_LIMIT: Joi.number().default(100),

  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  LOG_FILE_PATH: Joi.string().default('./logs'),

  // Retention
  LOG_RETENTION_DAYS: Joi.number().default(90),
  TRANSACTION_RETENTION_DAYS: Joi.number().default(2555),
  SESSION_RETENTION_DAYS: Joi.number().default(30),

  // External Services
  WEBHOOK_SECRET: Joi.string().optional(),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().optional(),

  // Development
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('docs'),
});

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT || '3000', 10),
    apiVersion: process.env.API_VERSION,
    baseUrl:
      process.env.BASE_URL || `http://localhost:${process.env.PORT || '3000'}`,
  },
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET,
    encryptionKey: process.env.ENCRYPTION_KEY,
    encryptionIv: process.env.ENCRYPTION_IV,
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_LIMIT || '100', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  logging: {
    level: process.env.LOG_LEVEL,
    filePath: process.env.LOG_FILE_PATH,
  },
  retention: {
    logs: parseInt(process.env.LOG_RETENTION_DAYS || '90', 10),
    transactions: parseInt(
      process.env.TRANSACTION_RETENTION_DAYS || '2555',
      10,
    ),
    sessions: parseInt(process.env.SESSION_RETENTION_DAYS || '30', 10),
  },
  external: {
    webhookSecret: process.env.WEBHOOK_SECRET,
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL,
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH,
  },
});
