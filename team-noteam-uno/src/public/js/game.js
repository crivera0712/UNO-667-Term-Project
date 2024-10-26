// Sound management
const SoundManager = {
    sounds: {
        cardPlay: new Audio('/sounds/card-play.mp3'),
        cardDraw: new Audio('/sounds/card-draw.mp3'),
        turn: new Audio('/sounds/turn.mp3'),
        uno: new Audio('/sounds/uno.mp3'),
        win: new Audio('/sounds/win.mp3')
    },

    play(soundName) {
        this.sounds[soundName]?.play().catch(err => console.log('Audio play failed:', err));
    }
};

// Notification management
const NotificationManager = {
    show(message, type = 'info') {
        const notificationEl = document.getElementById('gameMessage');
        if (notificationEl) {
            notificationEl.textContent = message;
            notificationEl.className = `game-message show ${type}`;

            setTimeout(() => {
                notificationEl.classList.remove('show');
            }, 3000);
        }
    }
};

// Color picker modal management
class ColorPickerModal {
    static init() {
        const modal = document.getElementById('colorPickerModal');
        const colorButtons = modal.querySelectorAll('.color-button');

        colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                const color = button.dataset.color;
                if (this.callback) {
                    this.callback(color);
                    this.hide();
                }
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.hide();
            }
        });
    }

    static show(callback) {
        this.callback = callback;
        const modal = document.getElementById('colorPickerModal');
        modal.style.display = 'block';
    }

    static hide() {
        const modal = document.getElementById('colorPickerModal');
        modal.style.display = 'none';
        this.callback = null;
    }
}

// Main game class
class UnoGame {
    constructor(config) {
        this.config = config;
        this.gameState = null;
        this.selectedCard = null;
        this.hasCalledUno = false;
        this.initializeEventListeners();
        this.startGameStatePolling();
    }

    initializeEventListeners() {
        const drawCardBtn = document.getElementById('drawCardBtn');
        const sayUnoBtn = document.getElementById('sayUnoBtn');

        if (drawCardBtn) {
            drawCardBtn.addEventListener('click', () => this.drawCard());
        }
        if (sayUnoBtn) {
            sayUnoBtn.addEventListener('click', () => this.sayUno());
        }

        ColorPickerModal.init();
    }

    async startGameStatePolling() {
        const pollGameState = async () => {
            try {
                const response = await fetch(`/game-state/${this.config.gameId}?playerId=${this.config.playerId}`);
                const newState = await response.json();

                if (newState) {
                    this.updateGameState(newState);
                }
            } catch (error) {
                console.error('Error polling game state:', error);
            }
        };

        // Initial poll and then every 2 seconds
        await pollGameState();
        setInterval(pollGameState, 2000);
    }

    updateGameState(newState) {
        this.gameState = newState;
        this.renderGameState();

        // Check for game end
        if (newState.status === 'finished') {
            this.handleGameEnd();
        }

        // Play turn sound if it's this player's turn
        if (newState.currentPlayer === this.config.playerId) {
            SoundManager.play('turn');
        }
    }

    renderGameState() {
        this.renderPlayers();
        this.renderPlayerHand();
        this.renderDiscardPile();
        this.updateGameControls();
    }

    renderPlayers() {
        const opponents = this.gameState.players.filter(p => p.id !== this.config.playerId);
        const opponentsHtml = opponents.map(player => `
            <div class="player-info ${player.id === this.gameState.currentPlayer ? 'current-player' : ''}">
                <h3>${player.name}</h3>
                <p>Cards: ${player.cardCount}</p>
            </div>
        `).join('');
        document.getElementById('opponents').innerHTML = opponentsHtml;
    }

    renderPlayerHand() {
        const player = this.gameState.players.find(p => p.id === this.config.playerId);
        if (!player || !player.cards) return;

        const handHtml = player.cards.map((card, index) => `
            <div class="card ${card.color || 'wild'}" 
                 data-index="${index}" 
                 onclick="game.handleCardClick(${index})">
                ${this.getCardDisplay(card)}
            </div>
        `).join('');
        document.getElementById('playerHand').innerHTML = handHtml;
    }

    getCardDisplay(card) {
        if (card.type === 'number') {
            return card.value;
        }
        const icons = {
            'skip': '⊘',
            'reverse': '↺',
            'draw2': '+2',
            'wild': '★',
            'wild4': '★+4'
        };
        return icons[card.value] || card.value;
    }

    renderDiscardPile() {
        if (!this.gameState.topCard) return;

        const topCard = this.gameState.topCard;
        document.getElementById('discardPile').innerHTML = `
            <div class="card ${topCard.color || 'wild'}">
                ${this.getCardDisplay(topCard)}
            </div>
        `;
    }

    updateGameControls() {
        const isCurrentPlayer = this.gameState.currentPlayer === this.config.playerId;
        const drawCardBtn = document.getElementById('drawCardBtn');
        const sayUnoBtn = document.getElementById('sayUnoBtn');

        if (drawCardBtn) {
            drawCardBtn.disabled = !isCurrentPlayer;
        }
        if (sayUnoBtn) {
            const player = this.gameState.players.find(p => p.id === this.config.playerId);
            sayUnoBtn.disabled = !isCurrentPlayer || !player || player.cards.length !== 2 || this.hasCalledUno;
        }
    }

    async handleCardClick(index) {
        if (this.gameState.currentPlayer !== this.config.playerId) {
            NotificationManager.show("It's not your turn!", 'error');
            return;
        }

        const player = this.gameState.players.find(p => p.id === this.config.playerId);
        if (!player || !player.cards) return;

        const card = player.cards[index];
        if (card.type === 'wild') {
            this.selectedCard = index;
            ColorPickerModal.show((color) => this.playCard(index, color));
        } else {
            await this.playCard(index);
        }
    }

    async playCard(cardIndex, chosenColor = null) {
        try {
            const response = await fetch('/play-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gameId: this.config.gameId,
                    playerId: this.config.playerId,
                    cardIndex,
                    chosenColor
                })
            });

            const result = await response.json();
            if (result.success) {
                SoundManager.play('cardPlay');
                this.updateGameState(result.gameState);
            } else {
                NotificationManager.show('Invalid move!', 'error');
            }
        } catch (error) {
            console.error('Error playing card:', error);
            NotificationManager.show('Failed to play card', 'error');
        }
    }

    async drawCard() {
        if (this.gameState.currentPlayer !== this.config.playerId) {
            NotificationManager.show("It's not your turn!", 'error');
            return;
        }

        try {
            const response = await fetch('/draw-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gameId: this.config.gameId,
                    playerId: this.config.playerId
                })
            });

            const result = await response.json();
            if (result.gameState) {
                SoundManager.play('cardDraw');
                this.updateGameState(result.gameState);
            }
        } catch (error) {
            console.error('Error drawing card:', error);
            NotificationManager.show('Failed to draw card', 'error');
        }
    }

    sayUno() {
        if (this.hasCalledUno) return;

        const player = this.gameState.players.find(p => p.id === this.config.playerId);
        if (!player || player.cards.length !== 2) {
            NotificationManager.show('You can only say UNO when you have 2 cards!', 'error');
            return;
        }

        this.hasCalledUno = true;
        SoundManager.play('uno');
        NotificationManager.show('UNO!', 'success');
    }

    handleGameEnd() {
        const winner = this.gameState.players.find(p => p.cards.length === 0);
        if (winner) {
            SoundManager.play('win');
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>${winner.id === this.config.playerId ? 'Congratulations!' : 'Game Over'}</h2>
                    <p>${winner.id === this.config.playerId ? 'You won the game!' : `${winner.name} won the game!`}</p>
                    <div class="modal-buttons">
                        <button onclick="location.href='/menu'">Back to Menu</button>
                        <button onclick="location.reload()">Play Again</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
        }
    }
}

// Initialize game when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new UnoGame(gameConfig);
});