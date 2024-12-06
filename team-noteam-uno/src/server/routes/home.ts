/**
 * Home Routes Module
 * Handles the main landing page and home-related routes.
 * These routes are mounted at the root path (/) in the main application.
 */

import express from "express";

/**
 * Express router instance to handle home-related routes
 */
const router = express.Router();

/**
 * Home Page Route
 * GET /
 *
 * Renders the main landing page of the application.
 * This route serves as the entry point for users.
 * Accessible to both authenticated and non-authenticated users.
 *
 * @route GET /
 * @renders home - The main landing page template
 * @param {Object} data - Template data
 * @param {string} data.title - Page title set to "Home"
 */
router.get("/", (request, response) => {
    if (!response.headersSent) {
        response.render("home", { title: "Home" });
    }
});

export default router;
