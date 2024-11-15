import express, { Request, Response, NextFunction } from "express";
import path from "path";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import logger from "morgan";
import dotenv from "dotenv";
import connectLivereload from "connect-livereload";
import livereload from "livereload";

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set("views", path.join(process.cwd(), "src", "views"));
app.set("view engine", "ejs");

// Middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static files
const staticPath = path.join(process.cwd(), "src", "public");
app.use(express.static(staticPath));

// LiveReload setup for development
if (process.env.NODE_ENV === "development") {
  try {
    const liveReloadPort = 35729; // Default LiveReload port
    const reloadServer = livereload.createServer({
      port: liveReloadPort
    });
    reloadServer.watch(staticPath);
    reloadServer.server.once("connection", () => {
      setTimeout(() => {
        reloadServer.refresh("/");
      }, 100);
    });
    app.use(connectLivereload({
      port: liveReloadPort
    }));
    console.log(`LiveReload server running on port ${liveReloadPort}`);
  } catch (error: any) {
    console.warn("LiveReload server failed to start:", error.message);
  }
}

// Routes
import routes from './routes';
app.use('/', routes);

// 404 Handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(createError(404));
});

// Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  // set locals, only providing error in development
  res.locals = {
    message: err.message,
    error: req.app.get("env") === "development" ? err : {}
  };

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
