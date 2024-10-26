import { Card, Game, Player, GameState } from '../types/game';

export class GameManager {
    private games: Map<string, Game>;
    private players: Map<string, { id: string; name: string; gameId: string }>;

    constructor() {
        this.games = new Map();
        this.players = new Map();
    }

    getAllGames(): Game[] {
        return Array.from(this.games.values());
    }

    getGame(gameId: string): Game | undefined {
        return this.games.get(gameId);
    }

    getGameState(gameId: string, playerId: string): GameState | null {
        const game = this.games.get(gameId);
        if (!game) return null;

        return {
            players: game.players.map(p => ({
                id: p.id,
                name: p.name,
                cardCount: p.cards.length,
                cards: p.id === playerId ? p.cards : null
            })),
            currentPlayer: game.currentPlayer,
            direction: game.direction,
            topCard: game.lastCard,
            currentColor: game.currentColor,
            status: game.status
        };
    }

    createGame(gameId: string, hostId: string, hostName: string): Game {
        const game: Game = {
            id: gameId,
            players: [{
                id: hostId,
                name: hostName,
                host: true,
                cards: []
            }],
            status: 'waiting',
            currentPlayer: null,
            direction: 1,
            deck: [],
            discardPile: [],
            lastCard: null,
            currentColor: null
        };

        this.games.set(gameId, game);
        this.players.set(hostId, { id: hostId, name: hostName, gameId });

        return game;
    }

    joinGame(gameId: string, playerId: string, playerName: string): Game | null {
        const game = this.games.get(gameId);
        if (!game || game.status !== 'waiting' || game.players.length >= 4) {
            return null;
        }

        game.players.push({
            id: playerId,
            name: playerName,
            host: false,
            cards: []
        });

        this.players.set(playerId, { id: playerId, name: playerName, gameId });
        return game;
    }

    startGame(gameId: string): Game | null {
        const game = this.games.get(gameId);
        if (!game || game.players.length < 2) {
            return null;
        }

        // Initialize and shuffle deck
        game.deck = this.createDeck();
        this.shuffleDeck(game.deck);

        // Deal 7 cards to each player
        game.players.forEach(player => {
            player.cards = [];
            for (let i = 0; i < 7; i++) {
                const card = game.deck.pop();
                if (card) {
                    player.cards.push(card);
                }
            }
        });

        // Draw initial card for discard pile
        let initialCard = null;
        do {
            initialCard = game.deck.pop();
            // If we get a Wild card, put it back and try again
            if (initialCard && initialCard.type === 'wild') {
                game.deck.unshift(initialCard);
                this.shuffleDeck(game.deck);
                initialCard = null;
            }
        } while (!initialCard);

        // Set up game state
        game.discardPile = [initialCard];
        game.lastCard = initialCard;
        game.currentColor = initialCard.color;
        game.currentPlayer = game.players[0].id;
        game.status = 'playing';
        game.direction = 1;

        return game;
    }

    private createDeck(): Card[] {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const deck: Card[] = [];

        // Add number cards (0-9)
        colors.forEach(color => {
            // One zero per color
            deck.push({ color, value: '0', type: 'number' });

            // Two of each 1-9
            for (let i = 1; i <= 9; i++) {
                deck.push({ color, value: i.toString(), type: 'number' });
                deck.push({ color, value: i.toString(), type: 'number' });
            }

            // Two of each special card per color
            ['skip', 'reverse', 'draw2'].forEach(value => {
                deck.push({ color, value, type: 'special' });
                deck.push({ color, value, type: 'special' });
            });
        });

        // Add wild cards (4 of each)
        for (let i = 0; i < 4; i++) {
            deck.push({ color: null, value: 'wild', type: 'wild' });
            deck.push({ color: null, value: 'wild4', type: 'wild' });
        }

        return deck;
    }

    private shuffleDeck(deck: Card[]): void {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    playCard(gameId: string, playerId: string, cardIndex: number, chosenColor?: string): boolean {
        const game = this.games.get(gameId);
        if (!game || game.currentPlayer !== playerId || game.status !== 'playing') {
            return false;
        }

        const player = game.players.find(p => p.id === playerId);
        if (!player || !player.cards[cardIndex]) {
            return false;
        }

        const card = player.cards[cardIndex];
        const lastCard = game.lastCard;
        if (!lastCard || !this.isValidPlay(card, lastCard, game.currentColor)) {
            return false;
        }

        // Remove card from player's hand
        player.cards.splice(cardIndex, 1);

        // Update game state
        game.lastCard = card;
        game.discardPile.push(card);

        // Handle special cards and color changes
        this.handleSpecialCard(game, card, chosenColor);

        // Check for winner
        if (player.cards.length === 0) {
            game.status = 'finished';
        }

        return true;
    }

    private isValidPlay(card: Card, lastCard: Card, currentColor: string | null): boolean {
        if (card.type === 'wild') return true;
        return card.color === currentColor ||
               card.value === lastCard.value ||
               (card.type === lastCard.type && card.type === 'special');
    }

    private handleSpecialCard(game: Game, card: Card, chosenColor?: string): void {
        // Handle color change
        if (card.type === 'wild') {
            game.currentColor = chosenColor || card.color;
        } else {
            game.currentColor = card.color;
        }

        const nextPlayerId = this.getNextPlayerId(game);

        // Handle special card effects
        switch (card.value) {
            case 'reverse':
                game.direction *= -1;
                break;
            case 'skip':
                this.moveToNextPlayer(game);
                break;
            case 'draw2':
                this.drawCards(game, nextPlayerId, 2);
                this.moveToNextPlayer(game);
                break;
            case 'wild4':
                this.drawCards(game, nextPlayerId, 4);
                this.moveToNextPlayer(game);
                break;
            default:
                this.moveToNextPlayer(game);
        }
    }

    private drawCards(game: Game, playerId: string, count: number): void {
        const player = game.players.find(p => p.id === playerId);
        if (!player) return;

        for (let i = 0; i < count; i++) {
            if (game.deck.length === 0) {
                this.reshuffleDeck(game);
            }
            const card = game.deck.pop();
            if (card) {
                player.cards.push(card);
            }
        }
    }

    private reshuffleDeck(game: Game): void {
        const topCard = game.discardPile.pop();
        game.deck = [...game.discardPile];
        game.discardPile = topCard ? [topCard] : [];
        this.shuffleDeck(game.deck);
    }

    private getNextPlayerId(game: Game): string {
        const currentIndex = game.players.findIndex(p => p.id === game.currentPlayer);
        const nextIndex = (currentIndex + game.direction + game.players.length) % game.players.length;
        return game.players[nextIndex].id;
    }

    private moveToNextPlayer(game: Game): void {
        game.currentPlayer = this.getNextPlayerId(game);
    }

    drawCard(gameId: string, playerId: string): Card | null {
        const game = this.games.get(gameId);
        if (!game || game.currentPlayer !== playerId || game.status !== 'playing') {
            return null;
        }

        const player = game.players.find(p => p.id === playerId);
        if (!player) return null;

        if (game.deck.length === 0) {
            this.reshuffleDeck(game);
        }

        const card = game.deck.pop();
        if (card) {
            player.cards.push(card);
            const lastCard = game.lastCard;
            if (lastCard && !this.isValidPlay(card, lastCard, game.currentColor)) {
                this.moveToNextPlayer(game);
            }
            return card;
        }

        return null;
    }

    getPlayerInfo(playerId: string): { id: string; name: string; gameId: string } | undefined {
        return this.players.get(playerId);
    }
}