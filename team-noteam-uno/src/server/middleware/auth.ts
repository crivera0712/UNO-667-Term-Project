import { Request, Response, NextFunction } from 'express';

// TODO: Implement proper authentication
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Temporary authentication check
  const isAuth = req.cookies.authenticated === 'true';

  if (isAuth) {
    return next();
  }

  res.redirect('/login');
};
