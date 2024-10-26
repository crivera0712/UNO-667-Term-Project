import express from "express";
const router = express.Router();

// Health check endpoint
router.get("/health", (_req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString()
    });
});

export default router;