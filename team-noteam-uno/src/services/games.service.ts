import { Socket } from 'socket.io';

interface Game {
    id: string;
    passcode: string;
    players: Player[];
    status: 'waiting' | 'playing' | 'finished';
    createdAt: Date;
}

interface Player {
    id: string;
    userId?: number;
    username: string;
    socket: Socket;
    connected?: boolean;
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
        // Validate passcode format (4 digits)
        if (!/^\d{4}$/.test(passcode)) {
            throw new Error('Passcode must be exactly 4 digits');
        }

        // Check if game with passcode already exists
        if (this.games.has(passcode)) {
            throw new Error('A game with this passcode already exists');
        }

        const game: Game = {
            id: Math.random().toString(36).substring(2, 15),
            passcode,
            players: [{
                ...creator,
                connected: true
            }],
            status: 'waiting',
            createdAt: new Date()
        };
        // Store the game using both passcode and ID
        this.games.set(passcode, game);
        this.games.set(game.id, game);

        console.log('Game stored with passcode:', passcode);
        console.log('Game stored with ID:', game.id);
        console.log('Current games in Map:', Array.from(this.games.keys()));

        return game;
    }

    getGame(identifier: string): Game | undefined {
        console.log('Looking for game with identifier:', identifier);
        console.log('Current games in Map:', Array.from(this.games.entries())
            .map(([key, game]) => ({ key, gameId: game.id, passcode: game.passcode })));

        // First try to get game by passcode
        const game = this.games.get(identifier);
        if (game) {
            console.log('Found game by passcode:', game.id);
            return game;
        }

        // If not found by passcode, try to find by ID
        const gameById = Array.from(this.games.values()).find(g => g.id === identifier);
        if (gameById) {
            console.log('Found game by ID:', gameById.id);
            return gameById;
        }

        console.log('Game not found for identifier:', identifier);
        return undefined;
    }

    joinGame(passcode: string, player: Player): Game {
        console.log('Attempting to join game with passcode:', passcode);
        const game = this.getGame(passcode);

        if (!game) {
            console.log('Game not found for passcode:', passcode);
            throw new Error('Game not found');
        }

        if (game.status !== 'waiting') {
            throw new Error('Game has already started');
        }

        if (game.players.length >= 10) {
            throw new Error('Game is full');
        }

        // Check if player is already in the game
        const existingPlayerIndex = game.players.findIndex(p => p.userId === player.userId);
        if (existingPlayerIndex !== -1) {
            // Update existing player's connection
            game.players[existingPlayerIndex].socket = player.socket;
            game.players[existingPlayerIndex].connected = true;
            console.log('Player reconnected to game');
        } else {
            // Add new player
            game.players.push({
                ...player,
                connected: true
            });
            console.log('New player joined game');
        }

        // Update game in both storage locations
        this.games.set(game.passcode, game);
        this.games.set(game.id, game);

        console.log('Player joined game. Current players:', game.players.length);
        return game;
    }

    getGameById(id: string): Game | undefined {
        return Array.from(this.games.values()).find(game => game.id === id);
    }

    getGamePlayers(gameId: string): { id: string; username: string; isReady: boolean; connected: boolean }[] {
        const game = this.getGameById(gameId);
        if (!game) return [];
        return game.players.map(player => ({
            id: player.id,
            username: player.username,
            isReady: false, // TODO: Implement ready state
            connected: player.connected !== false // true by default unless explicitly set to false
        }));
    }

    removePlayerFromGame(gameId: string, playerId: string): boolean {
        console.log('Removing player from game:', { gameId, playerId });
        const game = this.getGameById(gameId);
        if (!game) {
            console.log('Game not found for removal');
            return false;
        }

        const initialLength = game.players.length;
        game.players = game.players.filter(p => p.id !== playerId);
        console.log(`Players remaining: ${game.players.length}`);

        // Only remove the game if it's been empty for a while or is finished
        if (game.players.length === 0 && game.status === 'finished') {
            console.log('Removing empty finished game');
            this.games.delete(game.passcode);
            this.games.delete(game.id);
        } else {
            // Update the game state in both locations
            this.games.set(game.passcode, game);
            this.games.set(game.id, game);
        }

        return game.players.length < initialLength;
    }

    getAllGames(): Game[] {
        // Get unique games by filtering out duplicates and only including games stored by passcode
        return Array.from(this.games.entries())
            .filter(([key, game]) => key === game.passcode)
            .map(([_, game]) => game);
    }

    removeGame(passcode: string): boolean {
        const game = this.games.get(passcode);
        if (game) {
            this.games.delete(game.id);
            return this.games.delete(passcode);
        }
        return false;
    }
}

export const gamesService = GamesService.getInstance();
