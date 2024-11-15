import express, { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import flash from "express-flash";
import { auth, games, home, mainLobby, test, leaderboard, rules } from "./routes";
import { sessionMiddleware } from "./middleware/authentication";
import configureLiveReload from "./config/livereload";
import { sessionPool } from "./db/connection";

const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');

// Initialize express app
const app = express();

// Setup view engine
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");

// Configure middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

// Configure session handling
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
app.use(flash());

// Make user data available to templates
app.use(sessionMiddleware);

// Configure routes
app.use("/", home);
app.use("/auth", auth);
app.use("/games", games);
app.use("/main-lobby", mainLobby);
app.use("/test", test);
app.use("/leaderboard", leaderboard);
app.use("/rules", rules);

// Handle 404 errors
app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(createError(404));
});

// Global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    res.status(err.status || 500);
    res.render("error");
});

// Start server
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

startServer();
