/**
 * Type definitions for express-session
 * This module extends the default express-session types with custom session data
 * specific to our UNO game application.
 */

import { Session } from 'express-session';
import { SessionData } from 'express-session';

/**
 * Express Session Module Extension
 * Extends the default session data interface with application-specific properties
 */
declare module 'express-session' {
    /**
     * Custom session data interface for the UNO game
     *
     * @interface SessionData
     * @property {number} [userId] - ID of the authenticated user
     * @property {Object} [user] - User object containing authenticated user details
     * @property {number} user.id - Unique identifier of the user
     * @property {string} user.username - Username of the authenticated user
     * @property {string} user.email - Email address of the authenticated user
     * @property {boolean} [authenticated] - Flag indicating authentication status
     */
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
