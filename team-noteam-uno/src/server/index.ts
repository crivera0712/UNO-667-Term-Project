import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import createError from "http-errors";
import morgan from "morgan";
import * as path from "path";
import apiRoutes from "./routes/api";
import webRoutes from "./routes/web";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(process.cwd(), "src", "public")));

// View engine setup
app.set("views", path.join(process.cwd(), "src", "server", "views"));
app.set("view engine", "ejs");

// Routes
app.use("/", webRoutes);
app.use("/api", apiRoutes);

// 404 Handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(createError(404));
});

// Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    res.status(err.status || 500);
    res.render("error");
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});