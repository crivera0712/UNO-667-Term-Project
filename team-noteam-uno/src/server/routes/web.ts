import express from "express";
const router = express.Router();

// Home page route
router.get("/", (_req, res) => {
    res.render("home", {
        title: "Welcome",
        message: "Welcome to the application"
    });
});
// Add this route for the menu
router.get("/menu", (_req, res) => {
    res.render("menu", {
        title: "UNO - Main Menu"
    });
});

export default router;