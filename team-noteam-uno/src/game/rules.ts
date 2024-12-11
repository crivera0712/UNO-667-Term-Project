// src/core/rules.ts
import { Card } from './card';

export class Rules {
    // Validate if a played card is valid based on the current top card
    static isValidMove(playedCard: Card, topCard: Card): boolean {
        // A card is valid if:
        // 1. Colors match OR
        // 2. Values match OR
        // 3. It's a Wild card
        return (
            playedCard.color === topCard.color ||
            playedCard.value === topCard.value ||
            playedCard.type === 'Wild'
        );
    }

    // Determine the next player index based on the current player and rules
    static getNextPlayerIndex(
        currentPlayerIndex: number,
        numPlayers: number,
        isReversed: boolean
    ): number {
        if (isReversed) {
            return (currentPlayerIndex - 1 + numPlayers) % numPlayers;
        } else {
            return (currentPlayerIndex + 1) % numPlayers;
        }
    }

    // Handle special card effects (e.g., Skip, Reverse, Draw Two, Wild Draw Four)
    static handleSpecialCard(
        card: Card,
        state: { isReversed: boolean; drawPile: Card[] }
    ): { skipTurn: boolean; drawCards: number } {
        const result = { skipTurn: false, drawCards: 0 };

        switch (card.type) {
            case 'Skip':
                result.skipTurn = true;
                break;
            case 'Reverse':
                state.isReversed = !state.isReversed;
                break;
            case 'Draw Two':
                result.drawCards = 2;
                break;
            case 'Wild Draw Four':
                result.drawCards = 4;
                break;
        }

        return result;
    }

    // Check if a player has won (e.g., no cards left)
    static checkWinCondition(playerCards: Card[]): boolean {
        return playerCards.length === 0;
    }
}