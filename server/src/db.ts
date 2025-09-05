import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'skytravel-db',         // 'db' = nome servizio docker
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'postgers',
  database: process.env.DB_NAME || 'SkyTravelDb',
  max: 10,
  idleTimeoutMillis: 30000,
});