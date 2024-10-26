import express from "express";
const router = express.Router();

// Home page route
router.get("/", (_req, res) => {
    res.render("home", {
        title: "Welcome",
        message: "Welcome to the application"
    });
});

export default router;