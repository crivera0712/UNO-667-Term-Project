export interface Card {
    color: string | null;
    value: string;
    type: 'number' | 'special' | 'wild';
}

export interface Player {
    id: string;
    name: string;
    host: boolean;
    cards: Card[];
}

export interface Game {
    id: string;
    players: Player[];
    status: 'waiting' | 'playing' | 'finished';
    currentPlayer: string | null;
    direction: number;
    deck: Card[];
    discardPile: Card[];
    lastCard: Card | null;
    currentColor: string | null;
}

export interface GameState {
    players: Array<{
        id: string;
        name: string;
        cardCount: number;
        cards: Card[] | null;
    }>;
    currentPlayer: string | null;
    direction: number;
    topCard: Card | null;
    currentColor: string | null;
    status: Game['status'];
}