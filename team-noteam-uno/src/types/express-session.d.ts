declare module 'express-session' {
    interface SessionData {
        userId?: number;
        username?: string;
        authenticated?: boolean;
        user?: any;
        [key: string]: any;
    }
}

declare module 'connect-pg-simple' {
    import { Store, SessionOptions } from 'express-session';
    import { Pool } from 'pg';

    interface PgStoreOptions {
        pool: Pool;
        tableName?: string;
        schemaName?: string;
        ttl?: number;
        createTableIfMissing?: boolean;
        pruneSessionInterval?: number;
        errorLog?: (error: Error) => void;
    }

    class PgStore extends Store {
        constructor(options: PgStoreOptions);
    }

    function connectPgSimple(session: any): typeof PgStore;
    export = connectPgSimple;
}
