import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { authService } from '../../services/auth.service';

interface AuthRequest extends Request {
    session: session.Session & {
        userId?: number;
        user?: {
            id: number;
            username: string;
            email: string;
        };
    };
}

export const sessionMiddleware = (
    request: AuthRequest,
    response: Response,
    next: NextFunction
) => {
    // Make the user available to all templates
    if (request.session) {
        response.locals.user = request.session.user;
    }
    next();
};

export const requireAuth = (
    request: AuthRequest,
    response: Response,
    next: NextFunction
) => {
    if (!request.session.userId) {
        request.flash('error', 'You must be logged in to access this page');
        return response.redirect('/auth/login');
    }
    next();
};

export const requireGuest = (
    request: AuthRequest,
    response: Response,
    next: NextFunction
) => {
    if (request.session.userId) {
        return response.redirect('/');
    }
    next();
};
