import express, { Request, Response, Router } from "express";
import { v4 as uuidv4 } from 'uuid';
import { GameManager } from '../game/GameManager';
import { Game } from '../types/game';
import { ParamsDictionary } from 'express-serve-static-core';

const router: Router = express.Router();
const gameManager = new GameManager();

// Type definitions for request bodies
interface CreateGameBody {
    playerName: string;
}

interface JoinGameBody {
    gameId: string;
    playerName: string;
}

interface GameActionBody {
    gameId: string;
    playerId: string;
    cardIndex?: number;
    chosenColor?: string;
}

// Type definitions for route parameters
interface GameParams extends ParamsDictionary {
    gameId: string;
}

interface GameQuery {
    playerId?: string;
}

// Apply JSON body parser to specific routes
const jsonParser = express.json();

// Home page route - redirects to menu
router.get("/", (_req: Request, res: Response): void => {
    res.redirect('/menu');
});

// Menu route
router.get("/menu", (_req: Request, res: Response): void => {
    res.render("menu", {
        title: "UNO - Main Menu"
    });
});

// Create game route
router.post("/create-game", jsonParser, (req: Request<{}, any, CreateGameBody>, res: Response): void => {
    try {
        const { playerName } = req.body;

        if (!playerName) {
            res.status(400).json({ error: 'Player name is required' });
            return;
        }

        const gameId = uuidv4();
        const playerId = uuidv4();

        const game = gameManager.createGame(gameId, playerId, playerName);
        if (!game) {
            res.status(500).json({ error: 'Failed to create game' });
            return;
        }

        res.json({ gameId, playerId, redirect: `/waiting-room/${gameId}?playerId=${playerId}` });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Join game route
router.post("/join-game", jsonParser, (req: Request<{}, any, JoinGameBody>, res: Response): void => {
    try {
        const { gameId, playerName } = req.body;
        console.log('Join game request:', { gameId, playerName });

        if (!gameId || !playerName) {
            console.log('Missing required fields:', { gameId, playerName });
            res.status(400).json({ error: 'Game ID and player name are required' });
            return;
        }

        const playerId = uuidv4();
        console.log('Generated playerId:', playerId);

        const game = gameManager.joinGame(gameId, playerId, playerName);
        console.log('Join game result:', { success: !!game, gameId, playerId });

        if (!game) {
            res.status(404).json({ error: 'Game not found or cannot be joined' });
            return;
        }

        res.json({
            success: true,
            gameId,
            playerId,
            redirect: `/waiting-room/${gameId}?playerId=${playerId}`
        });
    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Lobby route
router.get("/lobby", (_req: Request, res: Response): void => {
    const games = gameManager.getAllGames()
        .filter((game: Game) => game.status === 'waiting')
        .map((game: Game) => ({
            id: game.id,
            playerCount: game.players.length,
            host: game.players.find(p => p.host)?.name
        }));

    res.render("lobby", { games });
});

// Waiting room route
router.get("/waiting-room/:gameId", (req: Request<GameParams, any, any, GameQuery>, res: Response): void => {
    const { gameId } = req.params;
    const playerId = req.query.playerId;

    if (!gameId || !playerId) {
        res.redirect('/menu?error=invalid-params');
        return;
    }

    const game = gameManager.getGame(gameId);
    if (!game) {
        res.redirect('/lobby?error=game-not-found');
        return;
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
        res.redirect('/lobby?error=player-not-found');
        return;
    }

    res.render("waiting-room", {
        gameId,
        playerId,
        playerName: player.name,
        isHost: player.host
    });
});

// Game route
router.get("/game/:gameId", (req: Request<GameParams, any, any, GameQuery>, res: Response): void => {
    const { gameId } = req.params;
    const playerId = req.query.playerId;

    if (!gameId || !playerId) {
        res.redirect('/menu?error=invalid-params');
        return;
    }

    const game = gameManager.getGame(gameId);
    if (!game) {
        res.redirect('/lobby?error=game-not-found');
        return;
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) {
        res.redirect('/lobby?error=player-not-found');
        return;
    }

    res.render("game", {
        gameId,
        playerId,
        playerName: player.name,
        isHost: player.host
    });
});

// Start game route
router.post("/start-game", jsonParser, (req: Request<{}, any, GameActionBody>, res: Response): void => {
    const { gameId, playerId } = req.body;

    if (!gameId || !playerId) {
        res.status(400).json({ error: 'Game ID and player ID are required' });
        return;
    }

    const game = gameManager.getGame(gameId);
    if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player || !player.host) {
        res.status(403).json({ error: 'Only the host can start the game' });
        return;
    }

    const startedGame = gameManager.startGame(gameId);
    if (!startedGame) {
        res.status(400).json({ error: 'Failed to start game' });
        return;
    }

    res.json({ success: true, redirect: `/game/${gameId}?playerId=${playerId}` });
});

// Game state route
router.get("/game-state/:gameId", (req: Request<GameParams, any, any, GameQuery>, res: Response): void => {
    const { gameId } = req.params;
    const playerId = req.query.playerId;
    console.log('Fetching game state:', { gameId, playerId });

    if (!gameId || !playerId) {
        console.log('Missing required parameters');
        res.status(400).json({ error: 'Game ID and player ID are required' });
        return;
    }

    const game = gameManager.getGame(gameId);
    console.log('Game found:', !!game, game?.status);

    if (!game) {
        console.log('Game not found:', gameId);
        res.status(404).json({ error: 'Game not found' });
        return;
    }

    const gameState = gameManager.getGameState(gameId, playerId);
    console.log('Game state:', gameState ? 'found' : 'not found');

    if (!gameState) {
        res.status(404).json({ error: 'Game state not available' });
        return;
    }

    res.json(gameState);
});

// Play card route
router.post("/play-card", jsonParser, (req: Request<{}, any, GameActionBody>, res: Response): void => {
    const { gameId, playerId, cardIndex, chosenColor } = req.body;

    if (!gameId || !playerId || typeof cardIndex !== 'number') {
        res.status(400).json({ error: 'Invalid request parameters' });
        return;
    }

    const success = gameManager.playCard(gameId, playerId, cardIndex, chosenColor);
    if (!success) {
        res.status(400).json({ error: 'Invalid play' });
        return;
    }

    const gameState = gameManager.getGameState(gameId, playerId);
    res.json({ success: true, gameState });
});

// Draw card route
router.post("/draw-card", jsonParser, (req: Request<{}, any, GameActionBody>, res: Response): void => {
    const { gameId, playerId } = req.body;

    if (!gameId || !playerId) {
        res.status(400).json({ error: 'Game ID and player ID are required' });
        return;
    }

    const card = gameManager.drawCard(gameId, playerId);
    if (!card) {
        res.status(400).json({ error: 'Unable to draw card' });
        return;
    }

    const gameState = gameManager.getGameState(gameId, playerId);
    res.json({ card, gameState });
});

export default router;