import session from 'express-session';
import { Pool } from 'pg';

declare module 'connect-pg-simple' {
    interface PgStoreOptions {
        pool: Pool;
        tableName?: string;
        schemaName?: string;
        ttl?: number;
        createTableIfMissing?: boolean;
        pruneSessionInterval?: number;
        errorLog?: (error: Error) => void;
    }

    interface PgStore extends session.Store {
        new (options: PgStoreOptions): session.Store;
    }

    function ConnectPgSimple(connect: typeof session): {
        new (options: PgStoreOptions): session.Store;
    };

    export = ConnectPgSimple;
}

declare module 'express-session' {
    interface SessionData {
        userId?: number;
        username?: string;
        authenticated?: boolean;
    }
}
