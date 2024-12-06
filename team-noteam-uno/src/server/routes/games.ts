import express, { Request } from "express";
import { gamesService } from "../../services/games.service";

interface AuthenticatedRequest extends Request {
    session: Request['session'] & {
        userId?: number;
    };
}

const router = express.Router();

router.get("/", (_request, response) => {
    response.render("gameLobby", { title: "Game Lobby" });
});

router.get("/waiting/:gameId", (request: AuthenticatedRequest, response) => {
    console.log('Accessing waiting room with gameId:', request.params.gameId);

    // Try to find game by ID first
    let game = gamesService.getGameById(request.params.gameId);

    // If not found by ID, try as passcode
    if (!game) {
        game = gamesService.getGame(request.params.gameId);
    }

    if (!game) {
        console.log('Game not found, redirecting to lobby');
        return response.redirect('/games');
    }

    const isCreator = game.players[0].userId === request.session.userId;
    console.log('Game found:', {
        id: game.id,
        passcode: game.passcode,
        players: game.players.map(p => ({ id: p.id, username: p.username })),
        isCreator
    });

    response.render("gameWaitingRoom", {
        title: "Game Waiting Room",
        gameId: game.id,
        gameCode: game.passcode,
        isCreator
    });
});

// Add new route for the game view
router.get("/play/:gameId", (request: AuthenticatedRequest, response) => {
    const game = gamesService.getGameById(request.params.gameId);

    if (!game) {
        return response.redirect('/games');
    }

    if (game.status !== 'playing') {
        return response.redirect(`/games/waiting/${game.id}`);
    }

    response.render("game", {
        title: "UNO Game",
        gameId: game.id,
        gameCode: game.passcode
    });
});
export default router;
