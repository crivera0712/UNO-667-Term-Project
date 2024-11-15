'use strict';

exports.up = function(db) {
  return db.runSql(`
    CREATE TABLE games (
      id SERIAL PRIMARY KEY,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      winner_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP WITH TIME ZONE,
      ended_at TIMESTAMP WITH TIME ZONE,
      
      CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))
    );

    CREATE TABLE game_players (
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      points INTEGER DEFAULT 0,
      position INTEGER,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      PRIMARY KEY (game_id, user_id),
      CONSTRAINT valid_position CHECK (position >= 0)
    );

    CREATE INDEX idx_games_status ON games(status);
    CREATE INDEX idx_games_winner ON games(winner_id);
    CREATE INDEX idx_game_players_user ON game_players(user_id);
  `);
};

exports.down = function(db) {
  return db.runSql(`
    DROP TABLE IF EXISTS game_players;
    DROP TABLE IF EXISTS games;
  `);
};

exports._meta = {
  version: 1
};
