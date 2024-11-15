import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

type CustomSession = {
    userId: number;
    user: {
        id: number;
        username: string;
        email: string;
    };
}

declare module 'express-session' {
    interface SessionData extends Partial<CustomSession> {}
}

interface AuthenticatedRequest extends Request {
    session: Request['session'] & Partial<CustomSession>;
}

export const authController = {
    async register(req: AuthenticatedRequest, res: Response) {
        try {
            const { username, email, password } = req.body;

            if (!username || !email || !password) {
                req.flash('error', 'All fields are required');
                return res.redirect('/auth/signup');
            }

            const user = await authService.registerUser({ username, email, password });
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

    async login(req: AuthenticatedRequest, res: Response) {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                req.flash('error', 'Username and password are required');
                return res.redirect('/auth/login');
            }

            const user = await authService.loginUser(username, password);

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

    logout(req: AuthenticatedRequest, res: Response) {
        req.session.destroy((error: Error | null) => {
            if (error) {
                console.error('Logout error:', error);
            }
            res.redirect('/');
        });
    }
};
