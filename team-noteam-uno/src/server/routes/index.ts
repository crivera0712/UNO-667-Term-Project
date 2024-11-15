/**
 * Routes Index Module
 * Central hub for exporting all route modules in the application.
 * This module aggregates and re-exports all route handlers for easier imports
 * in the main application file.
 */

/**
 * Authentication Routes
 * Handles user authentication, registration, and session management
 * Routes: /auth/login, /auth/signup, /auth/register, /auth/logout
 */
export { default as auth } from "./auth";

/**
 * Game Routes
 * Handles game-related functionality including creation and gameplay
 * Routes: /games, /games/:id
 */
export { default as games } from "./games";

/**
 * Home Routes
 * Handles the main landing page of the application
 * Routes: /
 */
export { default as home } from "./home";

/**
 * Leaderboard Routes
 * Handles the display of player rankings and statistics
 * Routes: /leaderboard
 */
export { default as leaderboard } from "./leaderboard";

/**
 * Message Test Routes
 * Handles the test messaging functionality
 * Routes: /messagetest
 */
export { default as messagetest } from "./messagetest";

/**
 * Game Rules Routes
 * Handles the display of UNO game rules and instructions
 * Routes: /rules
 */
export { default as rules } from "./rules";
