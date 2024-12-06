/**
 * Database Configuration Module
 * This module sets up and exports a PostgreSQL connection pool for the application.
 */

import { Pool } from 'pg';      // PostgreSQL client for Node.js
import dotenv from 'dotenv';    // Environment variable loader

// Load environment variables from .env file
dotenv.config();

/**
 * PostgreSQL Connection Pool
 *
 * Creates a connection pool for PostgreSQL database access with the following features:
 * - Manages multiple database connections efficiently
 * - Handles connection lifecycle automatically
 * - Provides connection pooling for better performance
 * - Uses environment variables for secure configuration
 *
 * Environment Variables Required:
 * - DB_USER: Database user name
 * - DB_HOST: Database host address
 * - DB_NAME: Database name
 * - DB_PASSWORD: Database password
 * - DB_PORT: Database port (defaults to 5432 if not specified)
 */
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',          // Database user from environment
    host: process.env.DB_HOST || 'localhost',          // Database host from environment
    database: process.env.DB_NAME || 'uno_dev',      // Database name from environment
    password: process.env.DB_PASSWORD || 'postgres',  // Database password from environment
    port: parseInt(process.env.DB_PORT || '5432'),  // Port with fallback to 5432
});

// Export the pool for use in other modules
export { pool };
