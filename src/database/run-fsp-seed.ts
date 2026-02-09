import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedFinancialServiceProviders } from './seeds/financial-service-providers.seed';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'UCG4321',
  database: process.env.DB_DATABASE || 'ucg_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: true,
});

async function runSeed() {
  try {
    await dataSource.initialize();
    console.log('Database connected');

    await seedFinancialServiceProviders(dataSource);

    console.log('Seed completed successfully');
    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

runSeed();
