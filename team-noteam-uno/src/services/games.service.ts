import { Socket } from 'socket.io';
import { Deck } from '../game/deck';
import { Card, CardColor } from '../game/card';
import { Rules } from '../game/rules';

export interface Game {
    id: string;
    passcode: string;
    players: Player[];
    status: 'waiting' | 'playing' | 'finished';
    createdAt: Date;
    deck: Deck;
    topCard: Card | null;
    isReversed: boolean;
    currentPlayerIndex: number;
    accumulatedDrawCards: number;
    mustPlayDrawCard: boolean;
    winner?: {
        userId?: number;
        username: string;
    };
}

export interface Player {
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
        if (!/^\d{4}$/.test(passcode)) {
            throw new Error('Passcode must be exactly 4 digits');
        }

        if (this.games.has(passcode)) {
            throw new Error('A game with this passcode already exists');
        }

        const deck = new Deck();
        const firstCard = deck.drawCard();
        const creatorHand = deck.drawCards(7);

        const game: Game = {
            id: Math.random().toString(36).substring(2, 15),
            passcode,
            players: [{
                ...creator,
                id: creator.userId?.toString() || creator.id,
                connected: true,
                hand: creatorHand
            }],
            status: 'waiting',
            createdAt: new Date(),
            deck,
            topCard: firstCard,
            isReversed: false,
            currentPlayerIndex: 0,
            accumulatedDrawCards: 0,
            mustPlayDrawCard: false
        };

        this.games.set(passcode, game);
        this.games.set(game.id, game);

        return game;
    }

    getGame(identifier: string): Game | undefined {
        const game = this.games.get(identifier);
        if (game) return game;

        for (const existingGame of this.games.values()) {
            if (existingGame.id === identifier) {
                return existingGame;
            }
        }
        return undefined;
    }

    getGameById(id: string): Game | undefined {
        return this.getGame(id);
    }

    joinGame(passcode: string, player: Player): Game {
        const game = this.getGame(passcode);
        if (!game) throw new Error('Game not found');
        if (game.status !== 'waiting') throw new Error('Game has already started');
        if (game.players.length >= 10) throw new Error('Game is full');

        const existingPlayerIndex = game.players.findIndex(p => p.userId === player.userId);
        if (existingPlayerIndex !== -1) {
            const existingPlayer = game.players[existingPlayerIndex];
            existingPlayer.socket = player.socket;
            existingPlayer.connected = true;
        } else {
            const playerHand = game.deck.drawCards(7);
            game.players.push({
                ...player,
                id: player.userId?.toString() || player.id,
                connected: true,
                hand: playerHand
            });
        }

        this.games.set(passcode, game);
        this.games.set(game.id, game);
        return game;
    }

    playCard(gameId: string, playerId: string, cardIndex: number, selectedColor?: string): { success: boolean; error?: string; game?: Game } {
        console.log('Attempting to play card:', { gameId, playerId, cardIndex, selectedColor });

        const game = this.getGameById(gameId);
        if (!game) {
            console.log('Game not found');
            return { success: false, error: 'Game not found' };
        }

        // Find player's index in the game
        const playerIndex = game.players.findIndex(p => p.userId?.toString() === playerId);
        console.log('Player index:', playerIndex, 'Current player index:', game.currentPlayerIndex);

        if (playerIndex === -1) {
            console.log('Player not found');
            return { success: false, error: 'Player not found' };
        }
        if (playerIndex !== game.currentPlayerIndex) {
            console.log('Not player\'s turn');
            return { success: false, error: 'Not your turn' };
        }

        const player = game.players[playerIndex];
        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            console.log('Invalid card index');
            return { success: false, error: 'Invalid card index' };
        }

        const cardToPlay = player.hand[cardIndex];
        console.log('Card to play:', cardToPlay);
        console.log('Top card:', game.topCard);

        // For wild cards, we need a color selection
        if ((cardToPlay.type === 'Wild' || cardToPlay.type === 'Wild Draw Four') && !selectedColor) {
            console.log('Wild card played without color selection');
            return { success: false, error: 'Must select a color for wild card' };
        }

        // Check if the move is valid
        if (game.topCard && !Rules.isValidMove(cardToPlay, game.topCard)) {
            console.log('Invalid move - card doesn\'t match top card');
            return { success: false, error: 'Invalid move - card must match color or value' };
        }

        // Remove card from player's hand
        player.hand.splice(cardIndex, 1);
        console.log('Card removed from hand');

        // Add current top card to discard pile if it exists
        if (game.topCard) {
            game.deck.addToDiscardPile(game.topCard);
            console.log('Previous top card added to discard pile');
        }

        // Set the new top card, handling wild cards specially
        if (cardToPlay.type === 'Wild' || cardToPlay.type === 'Wild Draw Four') {
            console.log('Setting new top card with selected color:', selectedColor);
            game.topCard = new Card(selectedColor as CardColor, cardToPlay.value, cardToPlay.type);
        } else {
            game.topCard = cardToPlay;
        }

        // Handle special card effects
        const effect = Rules.handleSpecialCard(cardToPlay, {
            isReversed: game.isReversed,
            drawPile: []
        });

        // Update game state based on card type
        if (cardToPlay.type === 'Reverse') {
            game.isReversed = !game.isReversed;
        }

        // Handle draw card stacking (only for Draw Two cards)
        if (cardToPlay.type === 'Draw Two') {
            game.accumulatedDrawCards += effect.drawCards;
            game.mustPlayDrawCard = true;

            // Check if next player has a +2 card
            const nextPlayerIndex = Rules.getNextPlayerIndex(
                game.currentPlayerIndex,
                game.players.length,
                game.isReversed
            );
            const nextPlayer = game.players[nextPlayerIndex];
            const hasDrawTwo = nextPlayer.hand.some(card => card.type === 'Draw Two');

            // If next player doesn't have a +2, they draw cards immediately
            if (!hasDrawTwo) {
                const drawnCards = game.deck.drawCards(game.accumulatedDrawCards);
                nextPlayer.hand.push(...drawnCards);
                game.accumulatedDrawCards = 0;
                game.mustPlayDrawCard = false;
            }
        } else if (cardToPlay.type === 'Wild Draw Four') {
            game.accumulatedDrawCards = 4;  // No stacking for +4
            game.mustPlayDrawCard = false;  // Next player must draw immediately

            // Next player draws 4 cards immediately
            const nextPlayerIndex = Rules.getNextPlayerIndex(
                game.currentPlayerIndex,
                game.players.length,
                game.isReversed
            );
            const nextPlayer = game.players[nextPlayerIndex];
            const drawnCards = game.deck.drawCards(4);
            nextPlayer.hand.push(...drawnCards);
            game.accumulatedDrawCards = 0;
        } else {
            game.accumulatedDrawCards = 0;
            game.mustPlayDrawCard = false;
        }

        // Update current player index
        game.currentPlayerIndex = Rules.getNextPlayerIndex(
            game.currentPlayerIndex,
            game.players.length,
            game.isReversed,
            effect.skipTurn
        );

        // Check for win condition
        if (player.hand.length === 0) {
            game.status = 'finished';
            game.winner = {
                userId: player.userId,
                username: player.username
            };
        }

        // Update game state in storage
        this.games.set(game.passcode, game);
        this.games.set(game.id, game);
        return { success: true, game };
    }

    drawCard(gameId: string, playerId: string): { success: boolean; error?: string; game?: Game; card?: Card } {
        const game = this.getGameById(gameId);
        if (!game) return { success: false, error: 'Game not found' };

        const playerIndex = game.players.findIndex(p => p.id === playerId || p.userId?.toString() === playerId);
        if (playerIndex === -1) return { success: false, error: 'Player not found' };
        if (playerIndex !== game.currentPlayerIndex) return { success: false, error: 'Not your turn' };

        let drawnCard: Card | null = null;

        // Handle accumulated draw cards
        if (game.accumulatedDrawCards > 0) {
            const drawnCards = game.deck.drawCards(game.accumulatedDrawCards);
            game.players[playerIndex].hand.push(...drawnCards);
            drawnCard = drawnCards[0]; // Return the first card for display purposes

            game.accumulatedDrawCards = 0;
            game.mustPlayDrawCard = false;
        } else {
            // Normal draw
            drawnCard = game.deck.drawCard();
            if (!drawnCard) return { success: false, error: 'No cards left in deck' };
            game.players[playerIndex].hand.push(drawnCard);
        }

        // Move to next player
        game.currentPlayerIndex = Rules.getNextPlayerIndex(
            game.currentPlayerIndex,
            game.players.length,
            game.isReversed
        );

        this.games.set(game.passcode, game);
        this.games.set(game.id, game);

        return { success: true, game, card: drawnCard };
    }

    removePlayerFromGame(gameId: string, playerId: string): boolean {
        const game = this.getGameById(gameId);
        if (!game) return false;

        if (game.status === 'playing') {
            const player = game.players.find(p => p.id === playerId || p.userId?.toString() === playerId);
            if (player) {
                player.connected = false;
                this.games.set(game.passcode, game);
                this.games.set(game.id, game);
                return true;
            }
            return false;
        }

        const initialLength = game.players.length;
        game.players = game.players.filter(p => p.id !== playerId && p.userId?.toString() !== playerId);

        if (game.players.length === 0 || game.status === 'finished') {
            this.games.delete(game.passcode);
            this.games.delete(game.id);
        } else {
            this.games.set(game.passcode, game);
            this.games.set(game.id, game);
        }

        return game.players.length < initialLength;
    }

    getAllGames(): Game[] {
        const uniqueGames = new Set<Game>();
        this.games.forEach(game => uniqueGames.add(game));
        return Array.from(uniqueGames);
    }

    getGamePlayers(gameId: string): Player[] {
        const game = this.getGameById(gameId);
        if (!game) throw new Error(`Game with ID ${gameId} not found.`);
        return game.players;
    }

    updateGame(game: Game): void {
        if (game) {
            this.games.set(game.passcode, game);
            this.games.set(game.id, game);
        }
    }

    createRematch(oldGame: Game): Game {
        // Generate a new passcode
        const newPasscode = Math.floor(1000 + Math.random() * 9000).toString();

        // Create a new game with the same players but reset hands
        const newGame: Game = {
            id: Math.random().toString(36).substring(2, 15),
            passcode: newPasscode,
            players: oldGame.players.map(p => ({
                ...p,
                hand: [] // Reset hands
            })),
            status: 'waiting',
            createdAt: new Date(),
            deck: new Deck(), // New shuffled deck
            topCard: null,
            isReversed: false,
            currentPlayerIndex: 0,
            accumulatedDrawCards: 0,
            mustPlayDrawCard: false
        };

        // Deal initial cards to all players
        newGame.players.forEach(player => {
            player.hand = newGame.deck.drawCards(7);
        });

        // Set initial top card
        newGame.topCard = newGame.deck.drawCard();

        // Store the new game
        this.games.set(newPasscode, newGame);
        this.games.set(newGame.id, newGame);

        return newGame;
    }
}

export const gamesService = GamesService.getInstance();