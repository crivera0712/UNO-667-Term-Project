import { Socket } from 'socket.io';
import { Deck } from '../game/deck';
import { Card } from '../game/card';
import { Rules } from '../game/rules';

interface Game {
    id: string;
    passcode: string;
    players: Player[];
    status: 'waiting' | 'playing' | 'finished';
    createdAt: Date;
    deck: Deck;
    topCard: Card | null; // Card currently on the discard pile
    isReversed: boolean;  // Tracks the play direction
}

interface Player {
    id: string;
    userId?: number;
    username: string;
    socket: Socket;
    connected?: boolean;
}

class GamesService {
    private static instance: GamesService;
    private games: Map<string, Game> = new Map();

    private constructor() {}

    public static getInstance(): GamesService {
        if (!GamesService.instance) {
            GamesService.instance = new GamesService();
        }
        return GamesService.instance;
    }

    createGame(passcode: string, creator: Player): Game {
        console.log(`Attempting to create game with passcode: ${passcode}`);
        // Validate passcode format (4 digits)
        if (!/^\d{4}$/.test(passcode)) {
            throw new Error('Passcode must be exactly 4 digits');
        }

        // Check if game with passcode already exists
        if (this.games.has(passcode)) {
            throw new Error('A game with this passcode already exists');
        }

        const deck = new Deck();
        const firstCard = deck.drawCard(); // Draw the first card to start the game

        const game: Game = {
            id: Math.random().toString(36).substring(2, 15),
            passcode,
            players: [{
                ...creator,
                connected: true
            }],
            status: 'waiting',
            createdAt: new Date(),
            deck,
            topCard: firstCard,
            isReversed: false
        };

        // Store the game using both passcode and ID
        this.games.set(passcode, game);
        this.games.set(game.id, game);

        console.log('Game successfully created');

        return game;
    }

    getGame(identifier: string): Game | undefined {
        console.log(`Fetching game with identifier: ${identifier}`);
        const game = this.games.get(identifier);
        if (game) return game;

        for (const existingGame of this.games.values()) {
            if (existingGame.id === identifier) {
                return existingGame;
            }
        }
        return undefined; // No matching game found
    }

    getGameById(id: string): Game | undefined {
        return Array.from(this.games.values()).find(game => game.id === id);
    }

    joinGame(passcode: string, player: Player): Game {
        console.log(`Player attempting to join game with passcode: ${passcode}`);
        const game = this.getGame(passcode);

        if (!game) {
            throw new Error('Game not found');
        }

        if (game.status !== 'waiting') {
            throw new Error('Game has already started');
        }

        if (game.players.length >= 10) {
            throw new Error('Game is full');
        }

        const existingPlayerIndex = game.players.findIndex(p => p.userId === player.userId);
        if (existingPlayerIndex !== -1) {
            game.players[existingPlayerIndex].socket = player.socket;
            game.players[existingPlayerIndex].connected = true;
        } else {
            game.players.push({
                ...player,
                connected: true
            });
        }

        console.log(`Player joined game: ${game.id}`);

        return game;
    }

    playCard(passcode: string, playerId: string, card: Card): void {
        const game = this.getGame(passcode);

        if (!game) {
            throw new Error('Game not found');
        }

        const player = game.players.find(p => p.id === playerId);

        if (!player) {
            throw new Error('Player not found in this game');
        }

        if (!game.topCard) {
            throw new Error('Game has not started yet');
        }

        if (!Rules.isValidMove(card, game.topCard)) {
            throw new Error('Invalid move');
        }

        const effect = Rules.handleSpecialCard(card, {
            isReversed: game.isReversed,
            drawPile: []
        });

        // Update game state based on effect
        game.isReversed = effect.skipTurn ? game.isReversed : game.isReversed;
        game.topCard = card;

        console.log(`${player.username} played ${card.toString()}`);
    }

    drawCard(passcode: string, playerId: string): Card {
        const game = this.getGame(passcode);

        if (!game) {
            throw new Error('Game not found');
        }

        const player = game.players.find(p => p.id === playerId);

        if (!player) {
            throw new Error('Player not found in this game');
        }

        const drawnCard = game.deck.drawCard();
        if (!drawnCard) {
            throw new Error('No cards left in the deck');
        }

        console.log(`${player.username} drew a card`);
        return drawnCard;
    }

    removePlayerFromGame(gameId: string, playerId: string): boolean {
        const game = this.getGameById(gameId);
        if (!game) {
            return false;
        }

        const initialLength = game.players.length;
        game.players = game.players.filter(p => p.id !== playerId);

        if (game.players.length === 0 && game.status === 'finished') {
            this.games.delete(game.passcode);
            this.games.delete(game.id);
        } else {
            this.games.set(game.passcode, game);
            this.games.set(game.id, game);
        }

        return game.players.length < initialLength;
    }

    getAllGames(): Game[] {
        return Array.from(this.games.entries())
            .filter(([key, game]) => key === game.passcode)
            .map(([_, game]) => game);
    }

    removeGame(passcode: string): boolean {
        const game = this.games.get(passcode);
        if (game) {
            this.games.delete(game.id);
            return this.games.delete(passcode);
        }
        return false;
    }
    getGamePlayers(gameId: string): Player[] {
        const game = this.getGameById(gameId);
        if (!game) {
            throw new Error(`Game with ID ${gameId} not found.`);
        }
        return game.players;
    }
}

export const gamesService = GamesService.getInstance();
