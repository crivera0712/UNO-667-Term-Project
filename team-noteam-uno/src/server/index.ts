/**
 * Main Application Server
 * This is the entry point for the UNO game application.
 * Configures and initializes the Express server with all necessary
 * middleware, session handling, and route configurations.
 */

import express, { Request, Response, NextFunction } from "express";
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import createError from "http-errors";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import flash from "express-flash";
import { auth, games, home, leaderboard, rules, messagetest } from "./routes";
import { sessionMiddleware } from "./middleware/authentication";
import configureLiveReload from "../config/livereload";
import { pool as sessionPool } from "../config/database";
import { gamesService, Game, Player } from "../services/games.service";

/**
 * External dependencies that don't support ES modules
 * These must be imported using require() syntax
 */

const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');

// Initialize express app
const app = express();

/**
 * View Engine Configuration
 * Sets up EJS as the template engine and configures the views directory
 */
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");

/**
 * Middleware Stack Configuration
 * Configures the order of middleware execution for incoming requests
 */
app.use(logger("dev")); // Request logging
app.use(express.json()); // JSON body parsing
app.use(express.urlencoded({ extended: false })); // URL-encoded body parsing
app.use(cookieParser()); // Cookie parsing
app.use(express.static(path.join(__dirname, "../public"))); // Static files

/**
 * Session Configuration
 * Sets up PostgreSQL-backed session storage with secure defaults
 */
const PostgresStore = connectPgSimple(session);

app.use(
    session({
        store: new PostgresStore({
            pool: sessionPool,
            tableName: "session",
            createTableIfMissing: true
        }),
        secret: process.env.SESSION_SECRET || "your_secret_key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === "production"
        }
    })
);
app.use(flash());

/**
 * Authentication Middleware
 * Makes user session data available to all views
 */
app.use(sessionMiddleware);

/**
 * Route Configuration
 * Mounts all application routes with their respective prefixes
 *
 * / - Home page and main entry point
 * /auth - Authentication routes (login, signup, logout)
 * /games - Game management and gameplay
 * /leaderboard - Player rankings and statistics
 * /rules - Game rules and documentation
 */
app.use("/", home);
app.use("/auth", auth);
app.use("/games", games);
app.use("/leaderboard", leaderboard);
app.use("/rules", rules);
app.use("/messagetest", messagetest);

/**
 * Error Handling
 * Catches 404 errors and forwards to error handler
 */
app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(createError(404));
});


/**
 * Global Error Handler
 * Processes all errors and renders the error page
 * In development mode, includes full error details
 */
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (!res.headersSent) {
        res.locals.message = err.message;
        res.locals.error = req.app.get("env") === "development" ? err : {};
        res.status(err.status || 500);
        res.render("error");
    }
});

/**
 * Server Initialization
 * Sets up and starts the HTTP server with Socket.IO integration
 */
const PORT = process.env.PORT || 3000;

const findAvailablePort = async (startPort: number): Promise<number> => {
    const maxPort = startPort + 10;
    for (let port = startPort; port <= maxPort; port++) {
        try {
            await new Promise((resolve, reject) => {
                const server = createServer();
                server.listen(port)
                    .once('listening', () => {
                        server.close();
                        resolve(port);
                    })
                    .once('error', reject);
            });
            return port;
        } catch (err) {
            continue;
        }
    }
    throw new Error('No available ports found');
};

const startServer = async (): Promise<void> => {
    try {
        await configureLiveReload(app);

        const httpServer = createServer(app);
        const io = new Server(httpServer);

        // Create a wrapper for the session middleware
        const wrap = (middleware: any) => (socket: any, next: any) => middleware(socket.request, {}, next);

        // Apply session middleware to Socket.IO
        io.use(wrap(session({
            store: new PostgresStore({
                pool: sessionPool,
                tableName: "session",
                createTableIfMissing: true
            }),
            secret: process.env.SESSION_SECRET || "your_secret_key",
            resave: false,
            saveUninitialized: false
        })));

        io.use((socket: Socket, next: Function) => {
            const session = (socket.request as any).session;
            if (session && session.user) {
                socket.data.userId = session.user.id;
                socket.data.username = session.user.username;
                next();
            } else {
                next(new Error('Authentication required'));
            }
        });

        io.on('connection', (socket: Socket) => {
            // Handle joining game room
            socket.on('join_game_room', (data: { gameId: string }, callback: (response: any) => void) => {
                console.log('Socket joining game room:', data.gameId);
                socket.join(`game:${data.gameId}`);

                // Get the game and player's hand
                const game = gamesService.getGameById(data.gameId);
                console.log('Found game:', game ? {
                    id: game.id,
                    players: game.players.map((p: Player) => ({
                        id: p.id,
                        username: p.username,
                        handSize: p.hand.length
                    }))
                } : 'null');
                if (game) {
                    const player = game.players.find(p => p.userId === socket.data.userId);
                    console.log('Found player by userId:', socket.data.userId, player ? {
                        id: player.id,
                        username: player.username,
                        handSize: player.hand.length,
                        hand: player.hand
                    } : 'null');

                    if (player) {
                        // Send the player their hand and the current game state
                        const playerPosition = game.players.findIndex(p => p.userId === socket.data.userId);
                        const gameState = {
                            hand: player.hand,
                            topCard: game.topCard,
                            currentPlayerIndex: game.currentPlayerIndex,
                            myPosition: playerPosition,
                            opponents: game.players
                                .filter(p => p.userId !== socket.data.userId)
                                .map(p => ({
                                    id: p.id,
                                    username: p.username,
                                    handSize: p.hand.length,
                                    connected: p.connected
                                }))
                        };
                        console.log('Sending game state:', gameState);
                        socket.emit('game_state', gameState);
                    }
                }

                callback({success: true});
            });
            // Debug socket session
            console.log('Socket session on connect:', (socket.request as any).session);
            console.log('A user connected');

            // Send initial games list to newly connected client
            const initialGames = gamesService.getAllGames().map((g: Game) => ({
                id: g.id,
                passcode: g.passcode,
                status: g.status,
                players: g.players.map((p: Player) => ({id: p.id, username: p.username, connected: p.connected}))
            }));
            console.log('Sending initial games list to new connection:', initialGames);
            socket.emit('games_update', initialGames);

            // Handle game creation
            socket.on('create_game', async (data: { passcode: string }, callback: (response: any) => void) => {
                try {
                    console.log('Creating game with passcode:', data.passcode);
                    const session = (socket.request as any).session;
                    console.log('Socket session:', session);

                    const player = {
                        id: socket.id,
                        userId: socket.data.userId,
                        username: socket.data.username || 'Anonymous',
                        socket: socket,
                        connected: true,
                        hand: []  // Initialize empty hand
                    };
                    console.log('Player data:', player);

                    const game = gamesService.createGame(data.passcode, player);
                    console.log('Game created:', {
                        id: game.id,
                        passcode: game.passcode,
                        players: game.players.map(p => ({ id: p.id, username: p.username, connected: p.connected })),
                        status: game.status,
                        topCard: game.topCard,
                        isReversed: game.isReversed
                    });

                    socket.join(`game:${game.id}`);

                    // Send initial game state to the creator
                    const creator = game.players[0];
                    socket.emit('game_state', {
                        hand: creator.hand,
                        topCard: game.topCard,
                        currentPlayerIndex: game.currentPlayerIndex,
                        opponents: game.players
                            .filter(p => p.userId !== socket.data.userId)
                            .map(p => ({
                                id: p.id,
                                username: p.username,
                                handSize: p.hand.length,
                                connected: p.connected
                            }))
                    });

                    // Update games list for all clients
                    io.emit('games_update', gamesService.getAllGames().map(g => ({
                        id: g.id,
                        passcode: g.passcode,
                        status: g.status,
                        players: g.players.map(p => ({
                            id: p.id,
                            username: p.username,
                            connected: p.connected,
                            handSize: p.hand.length
                        }))
                    })));

                    callback({ success: true, gameId: game.id });
                } catch (error: any) {
                    console.error('Error creating game:', error);
                    callback({ error: error.message });
                }
            });
            // Handle joining game
            socket.on('join_game', async (data: { passcode: string }, callback: (response: any) => void) => {
                try {
                    console.log('Joining game with passcode:', data.passcode);
                    const player = {
                        id: socket.id,
                        userId: socket.data.userId,
                        username: socket.data.username || 'Anonymous',
                        socket: socket,
                        connected: true,
                        hand: []  // Initialize empty hand
                    };

                    const game = gamesService.joinGame(data.passcode, player);
                    console.log('Player joined game:', {
                        id: game.id,
                        passcode: game.passcode,
                        players: game.players.map(p => ({
                            id: p.id,
                            username: p.username,
                            connected: p.connected,
                            handSize: p.hand.length
                        })),
                        status: game.status
                    });

                    socket.join(`game:${game.id}`);

                    // Find the joined player to get their hand
                    const joinedPlayer = game.players.find(p => p.userId === socket.data.userId);
                    if (joinedPlayer) {
                        // Send the initial game state to the joined player
                        socket.emit('game_state', {
                            hand: joinedPlayer.hand,
                            topCard: game.topCard,
                            currentPlayerIndex: game.currentPlayerIndex,
                            opponents: game.players
                                .filter(p => p.userId !== socket.data.userId)
                                .map(p => ({
                                    id: p.id,
                                    username: p.username,
                                    handSize: p.hand.length,
                                    connected: p.connected
                                }))
                        });
                    }

                    // Notify other players about the new player
                    io.to(`game:${game.id}`).emit('player_joined', {
                        playerId: player.id,
                        username: player.username,
                        players: game.players.map(p => ({
                            id: p.id,
                            username: p.username,
                            connected: p.connected,
                            handSize: p.hand.length
                        }))
                    });

                    // Update the games list for everyone
                    io.emit('games_update', gamesService.getAllGames().map(g => ({
                        id: g.id,
                        passcode: g.passcode,
                        status: g.status,
                        players: g.players.map(p => ({
                            id: p.id,
                            username: p.username,
                            connected: p.connected,
                            handSize: p.hand.length
                        }))
                    })));

                    callback({success: true, gameId: game.id});
                } catch (error: any) {
                    console.error('Error joining game:', error);
                    callback({error: error.message});
                }
            });

            // Handle game chat
            socket.on('game_chat', (data: { gameId: string; message: string }) => {
                try {
                    console.log('Received chat message:', data);

                    if (!data.gameId) {
                        console.error('No gameId provided for chat message');
                        return;
                    }

                    if (!socket.data.username) {
                        console.error('No username found for socket');
                        return;
                    }

                    const game = gamesService.getGameById(data.gameId);
                    if (!game) {
                        console.error('Game not found for chat message:', data.gameId);
                        return;
                    }

                    // Verify the user is in the game
                    const isPlayerInGame = game.players.some(p => p.userId === socket.data.userId);
                    if (!isPlayerInGame) {
                        console.error('User not in game:', socket.data.userId);
                        return;
                    }

                    // Create chat message with user info
                    const chatMessage = {
                        username: socket.data.username,
                        message: data.message,
                        timestamp: new Date()
                    };
                    console.log('Emitting chat message:', chatMessage);

                    // Emit to all players in the game room
                    io.to(`game:${data.gameId}`).emit('game_chat', chatMessage);
                    console.log('Message emitted to room:', `game:${data.gameId}`);

                    // If message contains "uno" (case insensitive), emit a system message
                    if (data.message.toLowerCase().includes('uno')) {
                        io.to(`game:${data.gameId}`).emit('game_event', {
                            message: `${chatMessage.username} called UNO!`
                        });
                    }
                } catch (error) {
                    console.error('Error handling game chat:', error);
                }
            });

            socket.on('play_card', (data: { gameId: string, cardIndex: number, selectedColor?: string }, callback: (response: any) => void) => {
                try {
                    console.log('Play card request:', { gameId: data.gameId, userId: socket.data.userId, cardIndex: data.cardIndex, selectedColor: data.selectedColor });

                    const result = gamesService.playCard(data.gameId, socket.data.userId.toString(), data.cardIndex, data.selectedColor);

                    if (result.success && result.game) {
                        const game = result.game;

                        // Check if game is finished
                        if (game.status === 'finished' && game.winner) {
                            // Emit game over event to all players
                            io.to(`game:${data.gameId}`).emit('game_over', {
                                winner: game.winner,
                                players: game.players.map(p => ({
                                    id: p.id,
                                    username: p.username,
                                    handSize: p.hand.length,
                                    connected: p.connected
                                }))
                            });
                        }

                        // Notify all players about the card being played
                        io.to(`game:${data.gameId}`).emit('card_played', {
                            playerId: socket.data.userId,
                            username: socket.data.username,
                            topCard: game.topCard,
                            currentPlayerIndex: game.currentPlayerIndex,
                            opponents: game.players.length - 1
                        });

                        // Send updated game state to all players immediately
                        game.players.forEach(p => {
                            const playerSocket = p.socket;
                            if (playerSocket) {
                                const playerPosition = game.players.findIndex(player => player.userId === p.userId);
                                playerSocket.emit('game_state', {
                                    hand: p.hand,
                                    topCard: game.topCard,
                                    currentPlayerIndex: game.currentPlayerIndex,
                                    myPosition: playerPosition,
                                    opponents: game.players
                                        .filter((op: Player) => op.userId !== p.userId)
                                        .map((op: Player) => ({
                                            id: op.id,
                                            username: op.username,
                                            handSize: op.hand.length,
                                            connected: op.connected
                                        }))
                                });
                            }
                        });
                        callback({ success: true });
                    } else {
                        callback({ success: false, error: result.error || 'Failed to play card' });
                    }
                } catch (error: any) {
                    console.error('Error playing card:', error);
                    callback({ success: false, error: error.message });
                }
            });
            // Handle drawing a card
            socket.on('draw_card', (data: { gameId: string }, callback: (response: any) => void) => {
                try {
                    const result = gamesService.drawCard(data.gameId, socket.data.userId.toString());
                    if (result.success && result.card && result.game) {
                        // Get the updated game state
                        const game = result.game;

                        // Notify all players about the card being drawn
                        io.to(`game:${data.gameId}`).emit('card_drawn', {
                            playerId: socket.data.userId,
                            username: socket.data.username,
                            currentPlayerIndex: game.currentPlayerIndex,
                            opponents: game.players.length - 1
                        });

                        // Send updated game state to all players
                        game.players.forEach(p => {
                            const playerSocket = p.socket;
                            if (playerSocket) {
                                const playerPosition = game.players.findIndex(player => player.userId === p.userId);
                                playerSocket.emit('game_state', {
                                    hand: p.hand,
                                    topCard: game.topCard,
                                    currentPlayerIndex: game.currentPlayerIndex,
                                    myPosition: playerPosition,
                                    opponents: game.players
                                        .filter(op => op.userId !== p.userId)
                                        .map(op => ({
                                            id: op.id,
                                            username: op.username,
                                            handSize: op.hand.length,
                                            connected: op.connected
                                        }))
                                });
                            }
                        });

                        callback({ success: true, card: result.card });
                    } else {
                        callback({ success: false, error: result.error });
                    }
                } catch (error: any) {
                    console.error('Error drawing card:', error);
                    callback({ success: false, error: error.message });
                }
            });
            // Handle starting the game
            socket.on('start_game', (data: { gameId: string }, callback: (response: any) => void) => {
                try {
                    const game = gamesService.getGameById(data.gameId);
                    if (!game) {
                        return callback({ success: false, error: 'Game not found' });
                    }

                    // Verify the user is the game creator
                    if (game.players[0].userId !== socket.data.userId) {
                        return callback({ success: false, error: 'Only the game creator can start the game' });
                    }

                    // Ensure minimum number of players (2)
                    if (game.players.length < 2) {
                        return callback({ success: false, error: 'Need at least 2 players to start' });
                    }

                    // Update game status
                    game.status = 'playing';
                    gamesService.updateGame(game);

                    // Notify all players in the game room
                    io.to(`game:${game.id}`).emit('game_started', {
                        gameId: game.id,
                        status: 'playing'
                    });

                    // Send initial game state to all players
                    game.players.forEach(player => {
                        const playerSocket = player.socket;
                        if (playerSocket) {
                            playerSocket.emit('game_state', {
                                hand: player.hand,
                                topCard: game.topCard,
                                currentPlayerIndex: game.currentPlayerIndex,
                                opponents: game.players
                                    .filter(p => p.userId !== player.userId)
                                    .map(p => ({
                                        id: p.id,
                                        username: p.username,
                                        handSize: p.hand.length,
                                        connected: p.connected
                                    }))
                            });
                        }
                    });

                    callback({ success: true });
                } catch (error: any) {
                    console.error('Error starting game:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Handle rematch requests
            socket.on('request_rematch', (data: { gameId: string }, callback: (response: any) => void) => {
                try {
                    const game = gamesService.getGameById(data.gameId);
                    if (!game) {
                        return callback({ success: false, error: 'Game not found' });
                    }

                    // Create a new game with the same players
                    const newGame = gamesService.createRematch(game);

                    // Notify all players about the rematch
                    io.to(`game:${game.id}`).emit('rematch_started', {
                        oldGameId: game.id,
                        newGameId: newGame.id,
                        passcode: newGame.passcode
                    });

                    callback({ success: true, gameId: newGame.id });
                } catch (error: any) {
                    console.error('Error handling rematch:', error);
                    callback({ success: false, error: error.message });
                }
            });
        }); // End of socket.io connection handler

        const availablePort = await findAvailablePort(Number(PORT));
        httpServer.listen(availablePort, () => {
            console.log(`🚀 Server running on port ${availablePort}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔒 Session security: ${process.env.NODE_ENV === 'production' ? 'Secure' : 'Development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}; // End of startServer function

// Bootstrap the application
startServer();