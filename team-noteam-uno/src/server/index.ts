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
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            secure: process.env.NODE_ENV === "production"
        }
    }));
app.use(flash()); // Flash messages support

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
    // Only send error response if headers haven't been sent
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
    const maxPort = startPort + 10; // Try up to 10 ports
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

        // Middleware to set socket data from session and check authentication
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
                callback({ success: true });
            });

            // Debug socket session
            const session = (socket.request as any).session;
            console.log('Socket session on connect:', session);
            console.log('A user connected');

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
                        connected: true
                    };
                    console.log('Player data:', { ...player, socket: undefined });

                    const game = gamesService.createGame(data.passcode, player);
                    console.log('Game created:', { ...game, players: game.players.map(p => ({ ...p, socket: undefined })) });

                    socket.join(`game:${game.id}`);

                    // Emit initial player list to the creator
                    const initialPlayers = gamesService.getGamePlayers(game.id);
                    io.to(`game:${game.id}`).emit('player_joined', {
                        playerId: player.id,
                        username: player.username,
                        players: initialPlayers
                    });

                    // Update all clients with new game list
                    io.emit('games_update', gamesService.getAllGames().map(g => ({
                        id: g.id,
                        passcode: g.passcode,
                        status: g.status,
                        players: g.players.map(p => ({ id: p.id, username: p.username, connected: p.connected }))
                    })));

                    callback({ success: true, gameId: game.id });
                } catch (error: any) {
                    console.error('Error creating game:', error);
                    callback({ error: error.message });
                }
            });

            // Handle game joining
            socket.on('join_game', async (data: { passcode: string }, callback: (response: any) => void) => {
                try {
                    console.log('Attempting to join game with passcode:', data.passcode);
                    const player = {
                        id: socket.id,
                        userId: socket.data.userId,
                        username: socket.data.username || 'Anonymous',
                        socket: socket,
                        connected: true
                    };
                    console.log('Player attempting to join:', { ...player, socket: undefined });

                    const game = gamesService.joinGame(data.passcode, player);
                    console.log('Successfully joined game:', {
                        gameId: game.id,
                        passcode: game.passcode,
                        playerCount: game.players.length
                    });

                    socket.join(`game:${game.id}`);

                    // Get updated player list with connection status
                    const updatedPlayers = gamesService.getGamePlayers(game.id);
                    console.log('Sending updated player list:', updatedPlayers);

                    // Emit to all clients in the game room
                    io.to(`game:${game.id}`).emit('player_joined', {
                        playerId: player.id,
                        username: player.username,
                        players: updatedPlayers
                    });

                    // Update all clients with new game list
                    const gamesList = gamesService.getAllGames().map(g => ({
                        id: g.id,
                        passcode: g.passcode,
                        status: g.status,
                        players: g.players.map(p => ({ id: p.id, username: p.username, connected: p.connected }))
                    }));
                    io.emit('games_update', gamesList);

                    callback({ success: true, gameId: game.id });
                } catch (error: any) {
                    console.error('Error joining game:', error);
                    callback({ error: error.message });
                }
            });

            // Handle getting game players
            socket.on('get_game_players', (data: { gameId: string }, callback: (response: any) => void) => {
                console.log('get_game_players request:', data);
                try {
                    const game = gamesService.getGameById(data.gameId);
                    console.log('Found game:', game);
                    if (game) {
                        const players = game.players.map(p => ({
                            id: p.id,
                            username: p.username,
                            connected: p.connected !== false,
                            isReady: false
                        }));
                        console.log('Sending players:', players);
                        callback({ players });
                    } else {
                        console.log('Game not found');
                        callback({ players: [] });
                    }
                } catch (error) {
                    console.error('Error getting game players:', error);
                    callback({ error: 'Failed to get players' });
                }
            });

            // Handle games list request
            socket.on('get_games', (_data: any, callback: (response: any) => void) => {
                const games = gamesService.getAllGames().map(game => ({
                    ...game,
                    players: game.players.map(p => ({ id: p.id, username: p.username }))
                }));
                callback({ games });
            });

            socket.on('chat message', (msg: any) => {
                io.emit('chat message', msg);
            });

            socket.on('leave_game', (data: { gameId: string }) => {
                const wasRemoved = gamesService.removePlayerFromGame(data.gameId, socket.id);
                if (wasRemoved) {
                    socket.leave(`game:${data.gameId}`);
                    const game = gamesService.getGameById(data.gameId);
                    if (game) {
                        io.to(`game:${data.gameId}`).emit('player_left', {
                            playerId: socket.id,
                            username: socket.data.username,
                            players: gamesService.getGamePlayers(data.gameId)
                        });
                        io.emit('games_update', gamesService.getAllGames());
                    }
                }
            });

            socket.on('disconnect', () => {
                console.log('A user disconnected');
                // Mark player as disconnected but don't remove immediately
                const games = gamesService.getAllGames();
                games.forEach(game => {
                    const player = game.players.find(p => p.id === socket.id);
                    if (player) {
                        player.connected = false;
                        io.to(`game:${game.id}`).emit('player_left', {
                            playerId: socket.id,
                            username: socket.data.username,
                            players: game.players.map(p => ({
                                id: p.id,
                                username: p.username,
                                connected: p.connected !== false,
                                isReady: false
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
