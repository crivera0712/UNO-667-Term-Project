export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export class Card {
    constructor(
        public color: CardColor,
        public type: CardType,
        public value?: number
    ) {}

    canPlayOn(topCard: Card): boolean {
        // Wild cards can be played on anything
        if (this.color === 'wild') return true;

        // Same color or same value/type can be played
        return this.color === topCard.color ||
               (this.type === topCard.type && this.value === topCard.value);
    }

    toString(): string {
        if (this.type === 'number') {
            return `${this.color} ${this.value}`;
        }
        return `${this.color} ${this.type}`;
    }
}

export class Deck {
    private cards: Card[] = [];

    constructor() {
        this.initialize();
    }

    private initialize() {
        const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];

        // Add number cards (0-9)
        colors.forEach(color => {
            // One 0 card per color
            this.cards.push(new Card(color, 'number', 0));

            // Two of each number 1-9
            for (let i = 1; i <= 9; i++) {
                this.cards.push(new Card(color, 'number', i));
                this.cards.push(new Card(color, 'number', i));
            }

            // Action cards (two of each)
            ['skip', 'reverse', 'draw2'].forEach(type => {
                this.cards.push(new Card(color, type as CardType));
                this.cards.push(new Card(color, type as CardType));
            });
        });

        // Add wild cards
        for (let i = 0; i < 4; i++) {
            this.cards.push(new Card('wild', 'wild'));
            this.cards.push(new Card('wild', 'wild4'));
        }

        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(): Card | undefined {
        return this.cards.pop();
    }

    addCard(card: Card) {
        this.cards.push(card);
    }

    isEmpty(): boolean {
        return this.cards.length === 0;
    }
}