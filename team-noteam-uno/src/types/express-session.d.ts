/**
 * Type definitions for express-session
 * This module extends the default express-session types with custom session data
 * specific to our UNO game application.
 */

import 'express-session';

declare module 'express-session' {
    interface SessionData {
        userId?: number;
        user?: {
            id: number;
            username: string;
            email: string;
        };
        authenticated?: boolean;
    }
}
