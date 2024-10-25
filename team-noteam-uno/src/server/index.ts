import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import httpErrors from "http-errors";
import morgan from "morgan";
import * as path from "path";
import rootRoutes from "./routes/root";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(process.cwd(), "src",
    "public")));
app.use(cookieParser());
app.set("views", path.join(process.cwd(), "src", "server",
    "views"));
app.set("view engine", "ejs");
app.use("/", rootRoutes);

// This middleware function should be defined before starting the server
// It is used to handle 404 errors
app.use((_request, _response, next) => {
    const notFoundError = new httpErrors.NotFound();
    next(notFoundError);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});