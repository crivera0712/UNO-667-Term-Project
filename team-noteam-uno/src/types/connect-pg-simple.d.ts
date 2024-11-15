/**
 * Type definitions for connect-pg-simple module
 * This module provides PostgreSQL session storage for Express.js applications
 * Extends the express-session types to work with PostgreSQL backend
 */

import session from 'express-session';
import { Pool } from 'pg';

declare module 'connect-pg-simple' {
    /**
     * Configuration options for PostgreSQL session store
     *
     * @interface PgStoreOptions
     * @property {Pool} pool - PostgreSQL connection pool
     * @property {string} [tableName] - Custom session table name (default: 'session')
     * @property {string} [schemaName] - Custom schema name
     * @property {number} [ttl] - Session time-to-live in seconds
     * @property {boolean} [createTableIfMissing] - Auto-create session table if missing
     * @property {number} [pruneSessionInterval] - Interval to remove expired sessions
     * @property {function} [errorLog] - Custom error logging function
     */
    interface PgStoreOptions {
        pool: Pool;
        tableName?: string;
        schemaName?: string;
        ttl?: number;
        createTableIfMissing?: boolean;
        pruneSessionInterval?: number;
        errorLog?: (error: Error) => void;
    }

    /**
     * PostgreSQL session store interface
     * Extends the base session.Store class with PostgreSQL specific implementation
     *
     * @interface PgStore
     * @extends {session.Store}
     */
    interface PgStore extends session.Store {
        new (options: PgStoreOptions): session.Store;
    }

    /**
     * Factory function to create PostgreSQL session store
     *
     * @function ConnectPgSimple
     * @param {typeof session} connect - Express session middleware
     * @returns {function} Constructor for PostgreSQL session store
     */
    function ConnectPgSimple(connect: typeof session): {
        new (options: PgStoreOptions): session.Store;
    };

    export = ConnectPgSimple;
}

/**
 * Express Session Data Extension
 * Extends the default session data interface with custom properties
 */
declare module 'express-session' {
    /**
     * Custom session data interface
     *
     * @interface SessionData
     * @property {number} [userId] - ID of the authenticated user
     * @property {string} [username] - Username of the authenticated user
     * @property {boolean} [authenticated] - Authentication status flag
     */
    interface SessionData {
        userId?: number;
        username?: string;
        authenticated?: boolean;
    }
}
