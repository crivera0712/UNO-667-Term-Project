import { Card, Deck } from './Card';

export interface Player {
    id: string;
    name: string;
    cards: Card[];
    score: number;
}

export class Game {
    private deck: Deck;
    private players: Map<string, Player>;
    private currentPlayerIndex: number;
    private direction: 1 | -1;
    private topCard?: Card;
    private gameStarted: boolean;
    private lastAction?: string;

    constructor() {
        this.deck = new Deck();
        this.players = new Map();
        this.currentPlayerIndex = 0;
        this.direction = 1;
        this.gameStarted = false;
    }

    addPlayer(id: string, name: string): void {
        if (this.gameStarted) {
            throw new Error('Game has already started');
        }
        this.players.set(id, {
            id,
            name,
            cards: [],
            score: 0
        });
    }

    removePlayer(id: string): void {
        this.players.delete(id);
    }

    startGame(): void {
        if (this.players.size < 2) {
            throw new Error('Need at least 2 players to start');
        }

        this.gameStarted = true;
        this.deck = new Deck();

        // Deal 7 cards to each player
        this.players.forEach(player => {
            player.cards = [];
            for (let i = 0; i < 7; i++) {
                const card = this.deck.draw();
                if (card) player.cards.push(card);
            }
        });

        // Set initial top card
        let initialCard = this.deck.draw();
        while (initialCard?.type === 'wild' || initialCard?.type === 'wild4') {
            this.deck.addCard(initialCard);
            this.deck.shuffle();
            initialCard = this.deck.draw();
        }
        this.topCard = initialCard;
    }

    playCard(playerId: string, cardIndex: number, declaredColor?: string): boolean {
        const player = this.players.get(playerId);
        if (!player) return false;

        const card = player.cards[cardIndex];
        if (!card || !this.topCard || !card.canPlayOn(this.topCard)) return false;

        // Handle wild cards
        if (card.type === 'wild' || card.type === 'wild4') {
            if (!declaredColor) return false;
            card.color = declaredColor as any;
        }

        // Remove card from player's hand and set as top card
        player.cards.splice(cardIndex, 1);
        this.topCard = card;

        // Handle special cards
        switch (card.type) {
            case 'skip':
                this.nextTurn();
                break;
            case 'reverse':
                this.direction *= -1;
                break;
            case 'draw2':
                this.drawCards(this.getNextPlayerId(), 2);
                this.nextTurn();
                break;
            case 'wild4':
                this.drawCards(this.getNextPlayerId(), 4);
                this.nextTurn();
                break;
        }

        this.nextTurn();
        return true;
    }

    drawCard(playerId: string): Card | undefined {
        const player = this.players.get(playerId);
        if (!player) return undefined;

        const card = this.deck.draw();
        if (card) {
            player.cards.push(card);
        }
        return card;
    }

    private drawCards(playerId: string, count: number): void {
        const player = this.players.get(playerId);
        if (!player) return;

        for (let i = 0; i < count; i++) {
            const card = this.deck.draw();
            if (card) player.cards.push(card);
        }
    }

    private nextTurn(): void {
        const playerIds = Array.from(this.players.keys());
        this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + playerIds.length) % playerIds.length;
    }

    private getNextPlayerId(): string {
        const playerIds = Array.from(this.players.keys());
        const nextIndex = (this.currentPlayerIndex + this.direction + playerIds.length) % playerIds.length;
        return playerIds[nextIndex];
    }

    getCurrentPlayer(): Player | undefined {
        const playerIds = Array.from(this.players.keys());
        return this.players.get(playerIds[this.currentPlayerIndex]);
    }

    getGameState() {
        return {
            players: Array.from(this.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                cardCount: player.cards.length,
                score: player.score
            })),
            currentPlayer: this.getCurrentPlayer()?.id,
            topCard: this.topCard,
            direction: this.direction,
            lastAction: this.lastAction
        };
    }

    isGameOver(): boolean {
        return Array.from(this.players.values()).some(player => player.cards.length === 0);
    }
}