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

export default router;
