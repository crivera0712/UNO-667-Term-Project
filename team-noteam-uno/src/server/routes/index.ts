import express from 'express';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Unauthenticated landing page
router.get('/', (req, res) => {
  res.render('landing');
});

// Authenticated landing page
router.get('/home', isAuthenticated, (req, res) => {
  res.render('home');
});

// Login page
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Register page
router.get('/register', (req, res) => {
  res.render('auth/register');
});

// Game lobby
router.get('/lobby/:id', isAuthenticated, (req, res) => {
  res.render('game/lobby', { lobbyId: req.params.id });
});

// Active game
router.get('/game/:id', isAuthenticated, (req, res) => {
  res.render('game/game', { gameId: req.params.id });
});

export default router;
