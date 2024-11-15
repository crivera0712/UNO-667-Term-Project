import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const router = Router();

// Page routes
router.get('/login', (req, res) => res.render('auth/login'));
router.get('/signup', (req, res) => res.render('auth/signup'));

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

export default router;
