import WebSocket from 'ws';

interface Player {
    id: string;
    name: string;
    socket: WebSocket;
    cards: Card[];
}

interface Card {
    color: string;
    type: string;
    value?: number;
}

interface GameSession {
    id: string;
    players: Player[];
    currentPlayerIndex: number;
    deck: Card[];
    discardPile: Card[];
    direction: 1 | -1;
    status: 'waiting' | 'playing' | 'finished';
    currentColor: string;
}

class GameServer {
    private sessions: Map<string, GameSession> = new Map();

    createGame(hostPlayer: Player): string {
        const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const session: GameSession = {
            id: gameId,
            players: [hostPlayer],
            currentPlayerIndex: 0,
            deck: this.createDeck(),
            discardPile: [],
            direction: 1,
            status: 'waiting',
            currentColor: ''
        };
        this.sessions.set(gameId, session);
        this.broadcastGameState(session);
        return gameId;
    }

    joinGame(gameId: string, player: Player): boolean {
        const session = this.sessions.get(gameId);
        if (!session || session.status !== 'waiting' || session.players.length >= 4) {
            return false;
        }
        session.players.push(player);
        if (session.players.length >= 2) {
            this.startGame(session);
        } else {
            this.broadcastGameState(session);
        }
        return true;
    }

    private startGame(session: GameSession) {
        session.status = 'playing';
        this.shuffleDeck(session.deck);

        // Deal 7 cards to each player
        session.players.forEach(player => {
            player.cards = session.deck.splice(0, 7);
        });

        // Place first card
        let firstCard = session.deck.pop();
        while (firstCard && (firstCard.type === 'wild' || firstCard.type === 'wild4')) {
            session.deck.unshift(firstCard);
            firstCard = session.deck.pop();
        }
        if (firstCard) {
            session.discardPile = [firstCard];
            session.currentColor = firstCard.color;
        }

        this.broadcastGameState(session);
    }

    handlePlayerAction(gameId: string, playerId: string, action: any) {
        const session = this.sessions.get(gameId);
        if (!session || session.status !== 'playing') return;

        const playerIndex = session.players.findIndex(p => p.id === playerId);
        if (playerIndex !== session.currentPlayerIndex) return;

        switch (action.type) {
            case 'playCard':
                this.handlePlayCard(session, playerIndex, action);
                break;
            case 'drawCard':
                this.handleDrawCard(session, playerIndex);
                break;
        }
    }

    private handlePlayCard(session: GameSession, playerIndex: number, action: any) {
        const player = session.players[playerIndex];
        const card = player.cards[action.cardIndex];

        if (!this.isValidPlay(card, session.discardPile[0], session.currentColor)) {
            return;
        }

        // Remove card from player's hand
        player.cards.splice(action.cardIndex, 1);

        // Add card to discard pile
        session.discardPile.unshift(card);

        // Handle special cards
        if (card.type === 'reverse') {
            session.direction *= -1;
        } else if (card.type === 'skip') {
            session.currentPlayerIndex = this.getNextPlayerIndex(session);
        } else if (card.type === 'draw2') {
            const nextPlayer = session.players[this.getNextPlayerIndex(session)];
            nextPlayer.cards.push(...session.deck.splice(0, 2));
            session.currentPlayerIndex = this.getNextPlayerIndex(session);
        } else if (card.type === 'wild4') {
            const nextPlayer = session.players[this.getNextPlayerIndex(session)];
            nextPlayer.cards.push(...session.deck.splice(0, 4));
            session.currentPlayerIndex = this.getNextPlayerIndex(session);
            session.currentColor = action.declaredColor;
        } else if (card.type === 'wild') {
            session.currentColor = action.declaredColor;
        }

        // Check for winner
        if (player.cards.length === 0) {
            session.status = 'finished';
            this.broadcastGameState(session);
            return;
        }

        // Move to next player
        session.currentPlayerIndex = this.getNextPlayerIndex(session);
        this.broadcastGameState(session);
    }

    private handleDrawCard(session: GameSession, playerIndex: number) {
        const player = session.players[playerIndex];
        if (session.deck.length === 0) {
            this.reshuffleDeck(session);
        }
        if (session.deck.length > 0) {
            player.cards.push(session.deck.pop()!);
        }
        session.currentPlayerIndex = this.getNextPlayerIndex(session);
        this.broadcastGameState(session);
    }

    private getNextPlayerIndex(session: GameSession): number {
        const nextIndex = (session.currentPlayerIndex + session.direction + session.players.length) % session.players.length;
        return nextIndex;
    }

    private isValidPlay(card: Card, topCard: Card, currentColor: string): boolean {
        if (card.type === 'wild' || card.type === 'wild4') return true;
        return card.color === currentColor ||
               (card.type === topCard.type) ||
               (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value);
    }

    private createDeck(): Card[] {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const deck: Card[] = [];

        // Number cards
        colors.forEach(color => {
            // One 0 card per color
            deck.push({ color, type: 'number', value: 0 });
            // Two of each number 1-9 per color
            for (let i = 1; i <= 9; i++) {
                deck.push({ color, type: 'number', value: i });
                deck.push({ color, type: 'number', value: i });
            }
            // Two of each action card per color
            ['skip', 'reverse', 'draw2'].forEach(type => {
                deck.push({ color, type });
                deck.push({ color, type });
            });
        });

        // Wild cards
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'black', type: 'wild' });
            deck.push({ color: 'black', type: 'wild4' });
        }

        return deck;
    }

    private shuffleDeck(deck: Card[]) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    private reshuffleDeck(session: GameSession) {
        const topCard = session.discardPile.shift();
        this.shuffleDeck(session.discardPile);
        session.deck = session.discardPile;
        session.discardPile = topCard ? [topCard] : [];
    }

    private broadcastGameState(session: GameSession) {
        session.players.forEach(player => {
            const playerState = this.getPlayerGameState(session, player.id);
            player.socket.send(JSON.stringify({
                type: 'gameState',
                state: playerState
            }));
        });
    }

    private getPlayerGameState(session: GameSession, playerId: string) {
        const playerIndex = session.players.findIndex(p => p.id === playerId);
        return {
            gameId: session.id,
            players: session.players.map(p => ({
                id: p.id,
                name: p.name,
                cardCount: p.cards.length,
                cards: p.id === playerId ? p.cards : []
            })),
            currentPlayer: session.players[session.currentPlayerIndex].id,
            topCard: session.discardPile[0],
            deckCount: session.deck.length,
            currentColor: session.currentColor,
            status: session.status
        };
    }

    removePlayer(gameId: string, playerId: string) {
        const session = this.sessions.get(gameId);
        if (!session) return;

        const playerIndex = session.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        session.players.splice(playerIndex, 1);
        if (session.players.length === 0) {
            this.sessions.delete(gameId);
        } else {
            if (session.currentPlayerIndex >= session.players.length) {
                session.currentPlayerIndex = 0;
            }
            this.broadcastGameState(session);
        }
    }
}

export default GameServer;