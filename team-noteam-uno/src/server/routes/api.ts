/**
 * API Routes Module
 * Defines the API endpoints for the application's health monitoring
 * and system status checks.
 */

import express from "express";

/**
 * Express router instance to handle API routes
 * This router can be mounted on any path in the main application
 */
const router = express.Router();

/**
 * Health Check Endpoint
 * GET /health
 *
 * Provides basic system health information for monitoring and uptime checks.
 * Returns a JSON response with:
 * - status: Current system status ("OK" when functioning)
 * - timestamp: ISO string of when the request was processed
 *
 * @route GET /api/health
 * @returns {Object} JSON response with status and timestamp
 */
router.get("/health", (_req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString()
    });
});

export default router;
