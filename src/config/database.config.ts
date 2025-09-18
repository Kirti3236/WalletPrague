import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { models } from '../models';

export const getDatabaseConfig = (configService: ConfigService): SequelizeModuleOptions => {
  const isProduction = configService.get('app.nodeEnv') === 'production';
  const dbLogging = configService.get('database.logging');

  return {
    dialect: 'postgres',
    host: configService.get('database.host'),
    port: configService.get('database.port'),
    username: configService.get('database.username'),
    password: configService.get('database.password'),
    database: configService.get('database.name'),
    models: models,
    synchronize: configService.get('database.synchronize'),
    logging: dbLogging ? (sql: string) => {
      console.log(`🗄️  [DB Query]: ${sql}`);
    } : false,
    dialectOptions: isProduction ? {
      ssl: { rejectUnauthorized: false }
    } : {},
    pool: {
      max: 5,        // Maximum connections
      min: 1,        // Keep at least 1 connection alive
      acquire: 10000, // 10 seconds to acquire connection
      idle: 30000,    // 30 seconds before closing idle connections
    },
    define: {
      underscored: true,
      paranoid: true,
      timestamps: true,
    },
    // Add retry configuration
    retry: {
      max: 3,
      match: [
        /ECONNREFUSED/,
        /EHOSTUNREACH/,
        /ENOTFOUND/,
        /ENETUNREACH/,
        /EAI_AGAIN/
      ]
    },
  };
};
// For Sequelize CLI
export const sequelizeConfig = {
  development: {
    dialect: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'yapague_user',
    password: process.env.DB_PASSWORD || 'yapague_password',
    database: process.env.DB_NAME || 'yapague_db',
    models: models,
    synchronize: true,
    logging: process.env.DB_LOGGING === 'true',
  },
  production: {
    dialect: 'postgres' as const,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: false,     
    ssl: { rejectUnauthorized: false },
  },
};
