import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';

const router = Router();

// Auth routes
router.get('/login', (req, res) => res.render('auth/login', { messages: req.flash() }));
router.get('/signup', (req, res) => res.render('auth/signup', { messages: req.flash() }));
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

export default router;
