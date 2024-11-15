import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connection = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'uno_dev',
    port: parseInt(process.env.DB_PORT || '5432'),
};

// Create a pool for sessions
export const sessionPool = new Pool(connection);

// Add event listeners for pool errors
sessionPool.on('error', (err) => {
    console.error('Unexpected error on session pool idle client', err);
    process.exit(-1);
});
