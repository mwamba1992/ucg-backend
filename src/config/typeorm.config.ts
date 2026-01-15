import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'UCG4321',
  database: process.env.DB_DATABASE || 'ucg_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development', // Only for development
  logging: false, // Disabled - use application logs instead
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// DataSource for migrations
const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'UCG4321',
  database: process.env.DB_DATABASE || 'ucg_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true, // Enable logging for migrations
};

// Log the connection details for debugging (remove password for security)
console.log('🔧 TypeORM Migration Configuration:');
console.log(`   Host: ${dataSourceOptions.host}`);
console.log(`   Port: ${dataSourceOptions.port}`);
console.log(`   Database: ${dataSourceOptions.database}`);
console.log(`   Username: ${dataSourceOptions.username}`);

export default new DataSource(dataSourceOptions);
