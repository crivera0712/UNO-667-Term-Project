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
    currentPlayerIndex: number; // Add this to track whose turn it is
}

interface Player {
    id: string;
    userId?: number;
    username: string;
    socket: Socket;
    connected?: boolean;
    hand: Card[];
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
        const firstCard = deck.drawCard();

        // Deal 7 cards to the creator
        const creatorHand = deck.drawCards(7);

        const game: Game = {
            id: Math.random().toString(36).substring(2, 15),
            passcode,
            players: [{
                ...creator,
                id: creator.userId?.toString() || creator.id,
                connected: true,
                hand: creatorHand  // Add the drawn cards to creator's hand
            }],
            status: 'waiting',
            createdAt: new Date(),
            deck,
            topCard: firstCard,
            isReversed: false,
            currentPlayerIndex: 0
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
        const game = this.games.get(id);
        if (game) return game;

        // If not found by direct lookup, try finding in all games
        for (const [_, existingGame] of this.games) {
            if (existingGame.id === id) {
                return existingGame;
            }
        }
        return undefined;
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
            // Update existing player's connection but keep their hand
            const existingPlayer = game.players[existingPlayerIndex];
            existingPlayer.socket = player.socket;
            existingPlayer.connected = true;
            console.log('Reconnecting existing player with hand:', existingPlayer.hand);
        } else {
            // Deal 7 cards to the new player
            const playerHand = game.deck.drawCards(7);
            console.log('Dealing new hand to player:', playerHand);
            game.players.push({
                ...player,
                id: player.userId?.toString() || player.id,
                connected: true,
                hand: playerHand
            });
        }

        // Update the game in both maps
        this.games.set(passcode, game);
        this.games.set(game.id, game);

        return game;
    }
    playCard(gameId: string, playerId: string, cardIndex: number): { success: boolean; error?: string } {
        const game = this.getGameById(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        const playerIndex = game.players.findIndex(p => p.id === playerId || p.userId?.toString() === playerId);
        if (playerIndex === -1) {
            return { success: false, error: 'Player not found' };
        }

        const player = game.players[playerIndex];
        if (playerIndex !== game.currentPlayerIndex) {
            return { success: false, error: 'Not your turn' };
        }

        const card = player.hand[cardIndex];
        if (!card) {
            return { success: false, error: 'Invalid card' };
        }

        if (!game.topCard || !Rules.isValidMove(card, game.topCard)) {
            return { success: false, error: 'Invalid move' };
        }

        // Remove the card from player's hand
        player.hand.splice(cardIndex, 1);

        // Place card on top
        game.topCard = card;

        // Handle special card effects
        const effect = Rules.handleSpecialCard(card, {
            isReversed: game.isReversed,
            drawPile: []
        });

        // Update game state
        if (card.type === 'Reverse') {
            game.isReversed = !game.isReversed;
        }

        // Move to next player
        game.currentPlayerIndex = Rules.getNextPlayerIndex(
            game.currentPlayerIndex,
            game.players.length,
            game.isReversed
        );

        return { success: true };
    }

    drawCard(gameId: string, playerId: string): { success: boolean; card?: Card; error?: string } {
        const game = this.getGameById(gameId);
        if (!game) {
            return { success: false, error: 'Game not found' };
        }

        const playerIndex = game.players.findIndex(p => p.id === playerId || p.userId?.toString() === playerId);
        if (playerIndex === -1) {
            return { success: false, error: 'Player not found' };
        }

        if (playerIndex !== game.currentPlayerIndex) {
            return { success: false, error: 'Not your turn' };
        }

        const card = game.deck.drawCard();
        if (!card) {
            return { success: false, error: 'No cards left in deck' };
        }

        // Add card to player's hand
        game.players[playerIndex].hand.push(card);

        // Move to next player
        game.currentPlayerIndex = Rules.getNextPlayerIndex(
            game.currentPlayerIndex,
            game.players.length,
            game.isReversed
        );

        return { success: true, card };
    }

    removePlayerFromGame(gameId: string, playerId: string): boolean {
        const game = this.getGameById(gameId);
        if (!game) {
            return false;
        }

        // Don't remove players if game is playing
        if (game.status === 'playing') {
            console.log('Game is playing, marking player as disconnected instead of removing');
            const player = game.players.find(p => p.id === playerId || p.userId?.toString() === playerId);
            if (player) {
                player.connected = false;
                this.updateGame(game);
                return true;
            }
            return false;
        }

        const initialLength = game.players.length;
        const playerToRemove = game.players.find(p => p.id === playerId || p.userId?.toString() === playerId);

        if (!playerToRemove) {
            return false;
        }

        // Create updated game state with the player removed
        const updatedGame = {
            ...game,
            players: game.players.filter(p => p !== playerToRemove)
        };

        // If game is empty or finished, remove it
        if (updatedGame.players.length === 0 || game.status === 'finished') {
            this.games.delete(game.passcode);
            this.games.delete(game.id);
        } else {
            // Update game state while preserving socket references
            updatedGame.players = updatedGame.players.map(player => ({
                ...player,
                socket: player.socket,  // Maintain socket reference
                hand: [...player.hand]  // Create new array for hand
            }));

            this.games.set(game.passcode, updatedGame);
            this.games.set(game.id, updatedGame);
        }

        return updatedGame.players.length < initialLength;
    }

    getAllGames(): Game[] {
        // Get unique games by filtering out duplicate entries (where key === game.id)
        const uniqueGames = new Set<Game>();
        this.games.forEach((game) => {
            uniqueGames.add(game);
        });
        return Array.from(uniqueGames);
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

    updateGame(game: Game): void {
        if (game) {
            // Create a deep copy while preserving socket references and connection status
            const gameCopy = {
                ...game,
                players: game.players.map(player => ({
                    ...player,
                    socket: player.socket,  // Maintain socket reference
                    connected: player.connected,  // Maintain connection status
                    hand: [...player.hand]  // Create new array for hand
                })),
                deck: game.deck,  // Deck is already a separate instance
                topCard: game.topCard  // Card is immutable
            };

            // Update both entries in the map
            this.games.set(game.passcode, gameCopy);
            this.games.set(game.id, gameCopy);

            console.log('Game updated:', {
                id: game.id,
                passcode: game.passcode,
                status: game.status,
                players: game.players.map(p => ({
                    id: p.id,
                    username: p.username,
                    connected: p.connected,
                    handSize: p.hand.length
                }))
            });
        }
    }
}

export const gamesService = GamesService.getInstance();