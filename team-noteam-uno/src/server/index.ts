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
import { gamesService } from "../services/games.service";

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
                    players: game.players.map(p => ({
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
                        const gameState = {
                            hand: player.hand,
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
                        };
                        console.log('Sending game state:', gameState);
                        socket.emit('game_state', gameState);
                    }
                }

                callback({ success: true });
            });
            // Debug socket session
            const session = (socket.request as any).session;
            console.log('Socket session on connect:', session);
            console.log('A user connected');

            // Send initial games list to newly connected client
            const initialGames = gamesService.getAllGames().map(g => ({
                id: g.id,
                passcode: g.passcode,
                status: g.status,
                players: g.players.map(p => ({ id: p.id, username: p.username, connected: p.connected }))
            }));
            console.log('Sending initial games list to new connection:', initialGames);
            socket.emit('games_update', initialGames);

            // Handle explicit games list request
            socket.on('get_games', (_data: any, callback: (response: any) => void) => {
                const games = gamesService.getAllGames().map(g => ({
                    id: g.id,
                    passcode: g.passcode,
                    status: g.status,
                    players: g.players.map(p => ({ id: p.id, username: p.username, connected: p.connected }))
                }));
                console.log('Sending games list in response to request:', games);
                callback({ games });
            });
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

                    // Notify others about game creation
                    socket.emit('game_created', {
                        id: game.id,
                        passcode: game.passcode,
                        players: game.players.map(player => ({
                            id: player.id,
                            username: player.username,
                            connected: player.connected,
                            handSize: player.hand.length
                        })),
                        status: game.status,
                        topCard: game.topCard ? { color: game.topCard.color, value: game.topCard.value } : null,
                        isReversed: game.isReversed
                    });
                    const gamesList = gamesService.getAllGames().map(g => ({
                        id: g.id,
                        passcode: g.passcode,
                        status: g.status,
                        players: g.players.map(p => ({
                            id: p.id,
                            username: p.username,
                            connected: p.connected
                        }))
                    }));
                    console.log('Broadcasting updated games list:', gamesList);
                    io.emit('games_update', gamesList);
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

                    callback({ success: true, gameId: game.id });
                } catch (error: any) {
                    console.error('Error joining game:', error);
                    callback({ error: error.message });
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

            // Handle playing a card
            socket.on('play_card', (data: { gameId: string, cardIndex: number }, callback: (response: any) => void) => {
                try {
                    const result = gamesService.playCard(data.gameId, socket.data.userId.toString(), data.cardIndex);
                    if (result.success) {
                        const game = gamesService.getGameById(data.gameId);
                        if (game) {
                            // Notify all players about the card being played
                            io.to(`game:${data.gameId}`).emit('card_played', {
                                playerId: socket.data.userId,
                                username: socket.data.username,
                                topCard: game.topCard,
                                currentPlayerIndex: game.currentPlayerIndex
                            });

                            // Send updated game state to all players
                            game.players.forEach(p => {
                                const playerSocket = p.socket;
                                if (playerSocket) {
                                    playerSocket.emit('game_state', {
                                        hand: p.hand,
                                        topCard: game.topCard,
                                        currentPlayerIndex: game.currentPlayerIndex,
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
                        }
                        callback({ success: true });
                    } else {
                        callback({ success: false, error: result.error });
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
                    if (result.success) {
                        // Send the drawn card only to the player who drew it
                        callback({ success: true, card: result.card });

                        const game = gamesService.getGameById(data.gameId);
                        if (game) {
                            // Send updated game state to all players
                            game.players.forEach(p => {
                                const playerSocket = p.socket;
                                if (playerSocket) {
                                    playerSocket.emit('game_state', {
                                        hand: p.hand,
                                        topCard: game.topCard,
                                        currentPlayerIndex: game.currentPlayerIndex,
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
                        }
                    } else {
                        callback({ success: false, error: result.error });
                    }
                } catch (error: any) {
                    console.error('Error drawing card:', error);
                    callback({ success: false, error: error.message });
                }
            });

            // Handle game start
            socket.on('start_game', (data: { gameId: string }, callback: (response: any) => void) => {
                try {
                    const game = gamesService.getGameById(data.gameId);
                    if (!game) {
                        return callback({ error: 'Game not found' });
                    }

                    console.log('Starting game:', {
                        id: game.id,
                        players: game.players.map(p => ({
                            id: p.id,
                            username: p.username,
                            connected: p.connected,
                            handSize: p.hand.length
                        }))
                    });

                    // Update game status and ensure all players are marked as connected
                    game.status = 'playing';
                    game.players.forEach(player => {
                        if (player.socket && player.socket.connected) {
                            player.connected = true;
                        }
                    });

                    // Update game state in service
                    gamesService.updateGame(game);

                    // Get fresh game state after update
                    const updatedGame = gamesService.getGameById(data.gameId);
                    if (!updatedGame) {
                        throw new Error('Game state lost after update');
                    }

                    console.log('Game started with state:', {
                        id: updatedGame.id,
                        status: updatedGame.status,
                        players: updatedGame.players.map(p => ({
                            id: p.id,
                            username: p.username,
                            connected: p.connected,
                            handSize: p.hand.length
                        }))
                    });

                    // Send updated game state to all players
                    updatedGame.players.forEach(p => {
                        if (p.socket && p.socket.connected) {
                            p.socket.emit('game_state', {
                                hand: p.hand,
                                topCard: updatedGame.topCard,
                                currentPlayerIndex: updatedGame.currentPlayerIndex,
                                opponents: updatedGame.players
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

                    // Notify all players in the game room
                    io.to(`game:${updatedGame.id}`).emit('game_started', {
                        gameId: updatedGame.id,
                        status: 'playing'
                    });

                    callback({ success: true });
                } catch (error: any) {
                    console.error('Error starting game:', error);
                    callback({ error: error.message });
                }
            });
            socket.on('leave_game', (data: { gameId: string }, callback?: (response: any) => void) => {
                try {
                    console.log('Player leaving game:', {
                        gameId: data.gameId,
                        userId: socket.data.userId,
                        username: socket.data.username
                    });

                    const wasRemoved = gamesService.removePlayerFromGame(data.gameId, socket.data.userId.toString());
                    if (wasRemoved) {
                        socket.leave(`game:${data.gameId}`);
                        const game = gamesService.getGameById(data.gameId);
                        if (game) {
                            // Notify remaining players
                            io.to(`game:${data.gameId}`).emit('player_left', {
                                playerId: socket.data.userId,
                                username: socket.data.username,
                                players: game.players.map(p => ({
                                    id: p.id,
                                    username: p.username,
                                    connected: p.connected,
                                    handSize: p.hand.length
                                }))
                            });

                            // Update games list for everyone
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
                        }
                    }
                    if (callback) {
                        callback({ success: true });
                    }
                } catch (error: any) {
                    console.error('Error leaving game:', error);
                    if (callback) {
                        callback({ success: false, error: error.message });
                    }
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log('A user disconnected');
                // Mark player as disconnected in all games they're in
                const games = gamesService.getAllGames();
                games.forEach(game => {
                    const player = game.players.find(p => p.userId === socket.data.userId);
                    if (player) {
                        player.connected = false;
                        io.to(`game:${game.id}`).emit('player_left', {
                            playerId: socket.data.userId,
                            username: socket.data.username,
                            players: game.players.map(p => ({
                                id: p.id,
                                username: p.username,
                                connected: p.connected,
                                handSize: p.hand.length
                            }))
                        });
                    }
                });
            });
        });

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
};

// Bootstrap the application
startServer();