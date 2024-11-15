/**
 * Authentication Routes Module
 * Handles all authentication-related routes including login, signup, and logout.
 * All routes are prefixed with /auth when mounted in the main application.
 */

import express from "express";
import { authController } from "../../controllers/auth.controller";
import { requireGuest } from "../middleware/authentication";

/**
 * Express router instance to handle authentication routes
 */
const router = express.Router();

/**
 * Login Page Route
 * GET /auth/login
 *
 * Renders the login page for users to authenticate.
 * Protected by requireGuest middleware to prevent authenticated users from accessing.
 *
 * @route GET /auth/login
 * @middleware requireGuest - Ensures only non-authenticated users can access
 * @renders auth/login - The login page template
 */
router.get("/login", requireGuest, (_req, res) => {
    res.render("auth/login", { title: "Login" });
});

/**
 * Login Processing Route
 * POST /auth/login
 *
 * Handles user login form submission.
 * Authenticates user credentials and establishes a session.
 *
 * @route POST /auth/login
 * @middleware requireGuest - Ensures only non-authenticated users can access
 * @body {string} username - User's username
 * @body {string} password - User's password
 */
router.post("/login", requireGuest, authController.login);

/**
 * Signup Page Route
 * GET /auth/signup
 *
 * Renders the signup page for new user registration.
 * Protected by requireGuest middleware to prevent authenticated users from accessing.
 *
 * @route GET /auth/signup
 * @middleware requireGuest - Ensures only non-authenticated users can access
 * @renders auth/signup - The signup page template
 */
router.get("/signup", requireGuest, (_req, res) => {
    res.render("auth/signup", { title: "Sign Up" });
});

/**
 * User Registration Route
 * POST /auth/register
 *
 * Handles new user registration form submission.
 * Creates new user account and establishes a session.
 *
 * @route POST /auth/register
 * @middleware requireGuest - Ensures only non-authenticated users can access
 * @body {string} username - Desired username
 * @body {string} email - User's email address
 * @body {string} password - Desired password
 */
router.post("/register", requireGuest, authController.register);

/**
 * Logout Route
 * POST /auth/logout
 *
 * Terminates the user's session and redirects to home page.
 * No middleware required as it's safe for both authenticated and non-authenticated users.
 *
 * @route POST /auth/logout
 */
router.post("/logout", authController.logout);

export default router;
