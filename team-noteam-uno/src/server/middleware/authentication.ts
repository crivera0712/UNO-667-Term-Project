/**
 * Authentication Middleware
 * This module provides middleware functions for handling user authentication
 * and session management in the application.
 */

import { Request, Response, NextFunction } from 'express';
import { Session, SessionData } from 'express-session';
/**
 * Custom request interface that extends Express Request
 * Adds typing for session data and flash messages
 *
 * @interface AuthenticatedRequest
 * @extends {Request}
 */
interface AuthenticatedRequest extends Request {
    session: Session & {
        /** User ID stored in session */
        userId?: number;
        /** User object stored in session */
        user?: {
            /** Unique identifier for the user */
            id: number;
            /** Username of the authenticated user */
            username: string;
            /** Email address of the authenticated user */
            email: string;
        };
    };
    /**
     * Flash message functionality
     * @param message - Optional message to retrieve all flash messages
     * @param event - Event name for the flash message
     * @param message - Message content to be flashed
     */
    flash: {
        (message?: string): { [key: string]: string[] };
        (event: string, message: string | string[]): any;
    };
}

/**
 * Session Middleware
 * Makes the authenticated user's data available to all views/templates
 * This allows templates to access user information via response.locals.user
 *
 * @param {AuthenticatedRequest} request - Express request object with session data
 * @param {Response} response - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export const sessionMiddleware = (
    request: Request,
    response: Response,
    next: NextFunction
): void => {
    // Type assertion since we know the session will have our custom properties
    const req = request as AuthenticatedRequest;
    response.locals.user = req.session?.user || null;
    next();
};

/**
 * Protected Route Middleware
 * Ensures that routes can only be accessed by authenticated users
 * Redirects to login page if user is not authenticated
 *
 * @param {AuthenticatedRequest} request - Express request object with session data
 * @param {Response} response - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export const requireAuth = (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction
): void => {
    if (!request.session?.userId) {
        request.flash('error', 'You must be logged in to access this page');
        return response.redirect('/auth/login');
    }
    next();
};

/**
 * Guest-Only Route Middleware
 * Ensures that certain routes (like login/register) can only be accessed
 * by non-authenticated users. Redirects to home page if user is already
 * authenticated.
 *
 * @param {AuthenticatedRequest} request - Express request object with session data
 * @param {Response} response - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
export const requireGuest = (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction
): void => {
    if (request.session?.userId) {
        return response.redirect('/');
    }
    next();
};
