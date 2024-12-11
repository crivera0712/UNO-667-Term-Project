// src/core/deck.ts
import { Card, CardColor, CardType } from './card';

export class Deck {
    private cards: Card[] = [];
    private discardPile: Card[] = [];

    constructor() {
        this.initializeDeck();
        this.shuffleDeck();
    }

    // Initialize a standard UNO deck
    private initializeDeck(): void {
        const colors: CardColor[] = ['Red', 'Yellow', 'Green', 'Blue'];
        const numbers = [...Array(10).keys()]; // 0 to 9
        const specialCards: CardType[] = ['Skip', 'Reverse', 'Draw Two'];
        const wildCards: { type: CardType; value: string }[] = [
            { type: 'Wild', value: 'Wild' },
            { type: 'Wild Draw Four', value: 'Wild Draw Four' },
        ];

        // Add numbered and special cards for each color
        for (const color of colors) {
            // Add 0 (only one per color)
            this.cards.push(new Card(color, 0, 'Number'));

            // Add 1-9 twice for each color
            for (const number of numbers.slice(1)) {
                this.cards.push(new Card(color, number, 'Number'));
                this.cards.push(new Card(color, number, 'Number'));
            }

            // Add special cards (two of each type per color)
            for (const special of specialCards) {
                this.cards.push(new Card(color, special, special));
                this.cards.push(new Card(color, special, special));
            }
        }

        // Add wild cards (four of each type)
        for (const wild of wildCards) {
            for (let i = 0; i < 4; i++) {
                this.cards.push(new Card('Wild', wild.value, wild.type));
            }
        }
    }

    // Shuffle the deck using Fisher-Yates algorithm
    shuffleDeck(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    // Draw a card from the deck
    drawCard(): Card | null {
        if (this.cards.length === 0) {
            this.reshuffleDiscardPile();
        }
        return this.cards.length > 0 ? this.cards.pop() || null : null;
    }

    // Draw multiple cards for a player
    drawCards(count: number): Card[] {
        const drawnCards: Card[] = [];
        for (let i = 0; i < count; i++) {
            const card = this.drawCard();
            if (card) {
                drawnCards.push(card);
            } else {
                break;
            }
        }
        return drawnCards;
    }

    // Add a card to the discard pile
    addToDiscardPile(card: Card): void {
        this.discardPile.push(card);
    }

    // Reshuffle discard pile into the deck when it's empty
    private reshuffleDiscardPile(): void {
        if (this.discardPile.length === 0) return;
        this.cards = [...this.discardPile];
        this.discardPile = [];
        this.shuffleDeck();
    }

    // Get the current number of cards left in the deck
    getDeckSize(): number {
        return this.cards.length;
    }
}