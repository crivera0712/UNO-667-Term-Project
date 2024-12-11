// src/core/card.ts

// Define possible card colors and types
export type CardColor = 'Red' | 'Yellow' | 'Green' | 'Blue' | 'Wild';
export type CardType = 'Number' | 'Skip' | 'Reverse' | 'Draw Two' | 'Wild' | 'Wild Draw Four';

// Interface for a Card
export interface ICard {
    color: CardColor;
    value: number | string; // Numbers 0-9 or special types
    type: CardType;
}

// Class implementation (optional)
export class Card implements ICard {
    color: CardColor;
    value: number | string;
    type: CardType;

    constructor(color: CardColor, value: number | string, type: CardType) {
        this.color = color;
        this.value = value;
        this.type = type;
    }

    // Optional: String representation for debugging
    toString(): string {
        return `${this.color} ${this.value}`;
    }
}
