import { Router } from 'express';
import { requireAuth } from "../middleware/authentication";

const router = Router();

// Protect all lobby routes with authentication
router.use(requireAuth);

router.get("/", (_request, response) => {
    response.render("lobby/index", {
        title: "Game Lobby",
        user: response.locals.user
    });
});

export default router;
