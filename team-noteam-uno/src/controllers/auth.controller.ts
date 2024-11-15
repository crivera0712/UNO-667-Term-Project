import { Request, Response } from 'express';
import { usersService } from '../services/users.service';

/**
 * Defines the structure for user session data
 * Contains user identification and basic profile information
 */
type CustomSession = {
    userId: number;
    user: {
        id: number;
        username: string;
        email: string;
    };
}

/**
 * Extends the express-session module's SessionData interface
 * Makes our custom session properties available throughout the application
 */
declare module 'express-session' {
    interface SessionData extends Partial<CustomSession> {}
}

/**
 * Extended Request interface that includes our custom session properties
 * Ensures proper typing for requests that include authentication data
 */
interface AuthenticatedRequest extends Request {
    session: Request['session'] & Partial<CustomSession>;
}

/**
 * Authentication Controller
 * Handles all authentication-related operations including registration, login, and logout
 */
export const authController = {
    /**
     * Handles user registration
     * @param req - Express request object with registration data
     * @param res - Express response object
     *
     * Process:
     * 1. Validates required fields (username, email, password)
     * 2. Attempts to register user via users service
     * 3. Creates user session on success
     * 4. Handles errors and provides feedback
     */
    async register(req: AuthenticatedRequest, res: Response) {
        try {
            const { username, email, password } = req.body;

            if (!username || !email || !password) {
                req.flash('error', 'All fields are required');
                return res.redirect('/auth/signup');
            }

            const user = await usersService.register(username, email, password);
            req.session.userId = user.id;
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email
            };

            req.flash('success', 'Registration successful!');
            res.redirect('/');
        } catch (error: any) {
            console.error('Registration error:', error);
            req.flash('error', error.message || 'Registration failed');
            res.redirect('/auth/signup');
        }
    },

    /**
     * Handles user login
     * @param req - Express request object with login credentials
     * @param res - Express response object
     *
     * Process:
     * 1. Validates credentials presence
     * 2. Attempts authentication via users service
     * 3. Creates user session on success
     * 4. Handles failed attempts and provides feedback
     */
    async login(req: AuthenticatedRequest, res: Response) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                req.flash('error', 'Username and password are required');
                return res.redirect('/auth/login');
            }

            const user = await usersService.login(username, password);

            if (!user) {
                req.flash('error', 'Invalid username or password');
                return res.redirect('/auth/login');
            }

            req.session.userId = user.id;
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email
            };

            req.flash('success', 'Login successful!');
            res.redirect('/');
        } catch (error: any) {
            console.error('Login error:', error);
            req.flash('error', error.message || 'Login failed');
            res.redirect('/auth/login');
        }
    },

    /**
     * Handles user logout
     * @param req - Express request object
     * @param res - Express response object
     *
     * Process:
     * 1. Destroys the user's session
     * 2. Redirects to home page
     * 3. Logs any errors that occur during logout
     */
    logout(req: AuthenticatedRequest, res: Response) {
        req.session.destroy((error: Error | null) => {
            if (error) {
                console.error('Logout error:', error);
            }
            res.redirect('/');
        });
    }
};
