/**
 * Leaderboard Routes Module
 * Handles the display of player rankings, statistics, and achievements.
 * These routes are prefixed with /leaderboard when mounted in the main application.
 */

import express from "express";

/**
 * Express router instance to handle leaderboard routes
 */
const router = express.Router();

/**
 * Player Statistics Interface
 * Defines the structure of player statistics data
 */
interface PlayerStats {
    /** Player's username */
    username: string;
    /** Total points accumulated across all games */
    total_points: number;
    /** Number of games won */
    games_won: number;
    /** Total number of games played */
    games_played: number;
    /** Win percentage (0-100) */
    win_rate: number;
    /** Current consecutive wins */
    current_win_streak: number;
    /** Highest score achieved in a single game */
    highest_score: number;
}

/**
 * Leaderboard Page Route
 * GET /leaderboard
 *
 * Renders the leaderboard page showing player rankings and statistics.
 * Currently uses placeholder data - will be replaced with database queries.
 *
 * @route GET /leaderboard
 * @renders leaderboard - The leaderboard page template
 * @param {Object} data - Template data
 * @param {PlayerStats[]} data.players - Full list of players and their stats
 * @param {PlayerStats[]} data.topPlayers - Top 3 players for special display
 */
router.get("/", (req, res) => {
    // Static placeholder data for the leaderboard
    const placeholderPlayers: PlayerStats[] = [
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

    // Render the leaderboard view with player data
    res.render("leaderboard", {
        players: placeholderPlayers,
        topPlayers: placeholderPlayers.slice(0, 3)  // Get top 3 players
    });
});

export default router;
