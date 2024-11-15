/**
 * Main Application Server
 * This is the entry point for the UNO game application.
 * Configures and initializes the Express server with all necessary
 * middleware, session handling, and route configurations.
 */

import express, { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import flash from "express-flash";
import { auth, games, home, leaderboard, rules } from "./routes";
import { sessionMiddleware } from "./middleware/authentication";
import configureLiveReload from "../config/livereload";
import { pool as sessionPool } from "../config/database";

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
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    res.status(err.status || 500);
    res.render("error");
});

/**
 * Server Initialization
 * Starts the Express server with the configured port
 * Includes live reload support for development
 */
const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
    try {
        await configureLiveReload(app);
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
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
