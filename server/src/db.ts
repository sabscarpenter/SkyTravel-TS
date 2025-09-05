import { Pool } from 'pg';

const url = process.env.DATABASE_URL;

export const pool = url
  ? new Pool({ connectionString: url })
  : new Pool({
      host: process.env.DB_HOST ?? 'db',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'admin',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'SkyTravelDb',
      max: 10,
      idleTimeoutMillis: 30000,
    });
