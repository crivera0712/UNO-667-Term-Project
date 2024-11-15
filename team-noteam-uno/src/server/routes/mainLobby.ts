import express, { Request } from "express";
const router = express.Router();

interface AuthenticatedRequest extends Request {
    user?: any; // Replace 'any' with your actual user type
}

router.get("/", (req: AuthenticatedRequest, res) => {
    res.render("mainLobby", {
        title: "Main Lobby",
        user: req.user
    });
});

export default router;
