import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
    // Static placeholder data for the leaderboard
    const placeholderPlayers = [
        {
            username: "Player 1",
            total_points: 1500,
            games_won: 25,
            games_played: 30,
            win_rate: 83,
            current_win_streak: 5,
            highest_score: 300
        },
        {
            username: "Player 2",
            total_points: 1200,
            games_won: 20,
            games_played: 28,
            win_rate: 71,
            current_win_streak: 2,
            highest_score: 250
        },
        {
            username: "Player 3",
            total_points: 1000,
            games_won: 18,
            games_played: 25,
            win_rate: 72,
            current_win_streak: 0,
            highest_score: 220
        },
        {
            username: "Player 4",
            total_points: 800,
            games_won: 15,
            games_played: 22,
            win_rate: 68,
            current_win_streak: 1,
            highest_score: 200
        },
        {
            username: "Player 5",
            total_points: 600,
            games_won: 10,
            games_played: 18,
            win_rate: 55,
            current_win_streak: 0,
            highest_score: 180
        }
    ];

    res.render("leaderboard", {
        players: placeholderPlayers,
        topPlayers: placeholderPlayers.slice(0, 3)
    });
});

export default router;
