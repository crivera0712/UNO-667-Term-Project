// Sound management
const SoundManager = {
    sounds: {
        hover: new Audio('/sounds/hover.mp3'),
        click: new Audio('/sounds/click.mp3'),
        success: new Audio('/sounds/success.mp3')
    },

    play(soundName) {
        this.sounds[soundName]?.play().catch(() => {});
    }
};

// Game state management
const GameManager = {
    startGame(mode) {
        SoundManager.play('success');
        console.log(`Starting ${mode} player game...`);
        // Add game start logic here
    },

    quitGame() {
        if (confirm('Are you sure you want to quit?')) {
            window.close();
        }
    }
};

// Modal management
const ModalManager = {
    show(modalId) {
        SoundManager.play('click');
        document.getElementById(modalId).style.display = 'block';
    },

    hide(modalId) {
        document.getElementById(modalId).style.display = 'none';
    },

    init() {
        // Close modals when clicking outside
        window.onclick = (event) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (event.target === modal) {
                    this.hide(modal.id);
                }
            });
        };
    }
};

// Settings management
const SettingsManager = {
    save() {
        const settings = {
            sound: document.getElementById('soundVolume').value,
            music: document.getElementById('musicVolume').value,
            theme: document.getElementById('theme').value
        };
        localStorage.setItem('unoSettings', JSON.stringify(settings));
    },

    load() {
        const settings = JSON.parse(localStorage.getItem('unoSettings')) || {};
        if (settings.sound) document.getElementById('soundVolume').value = settings.sound;
        if (settings.music) document.getElementById('musicVolume').value = settings.music;
        if (settings.theme) document.getElementById('theme').value = settings.theme;
    }
};

// Leaderboard management
const LeaderboardManager = {
    async loadLeaderboard() {
        // Simulate loading leaderboard data
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    { name: 'Player 1', score: 1500 },
                    { name: 'Player 2', score: 1200 },
                    { name: 'Player 3', score: 1000 }
                ]);
            }, 1000);
        });
    },

    async displayLeaderboard() {
        ModalManager.show('leaderboardModal');
        const leaderboardData = await this.loadLeaderboard();

        const medals = ['🏆', '🥈', '🥉'];
        const leaderboardHTML = leaderboardData.map((player, index) => `
            <div class="leaderboard-item">
                <div class="medal medal-${index + 1}">${medals[index]}</div>
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                </div>
                <div class="player-score">${player.score} pts</div>
            </div>
        `).join('');

        document.getElementById('leaderboardContent').innerHTML = `
            <div class="leaderboard-list">
                ${leaderboardHTML}
            </div>
        `;
    }
};

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add hover sound to buttons
    document.querySelectorAll('.menu-button, .mode-card').forEach(button => {
        button.addEventListener('mouseenter', () => {
            SoundManager.play('hover');
        });
    });

    // Initialize modal handling
    ModalManager.init();

    // Load settings
    SettingsManager.load();

    // Add settings save listener
    document.querySelectorAll('#soundVolume, #musicVolume, #theme').forEach(element => {
        element.addEventListener('change', () => SettingsManager.save());
    });
});