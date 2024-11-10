import express from "express";
const router = express.Router();

// Home/Main Menu route
router.get("/", (_req, res) => {
    res.render("landing", {
        title: "UNO Game - Main Menu",
        username: "Player" // This will be replaced with actual user data later
    });
});

// Game Routes
router.get("/play", (_req, res) => {
    res.render("gameLobby", {
        title: "Game Lobby"
    });
});

router.get("/leaderboard", (_req, res) => {
    res.render("leaderboard", {
        title: "Global Leaderboard"
    });
});

export default router;
