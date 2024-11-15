'use strict';

exports.up = function(db) {
  return db.runSql(`
    -- Create a function to calculate player ranking
    CREATE OR REPLACE FUNCTION calculate_player_rank() RETURNS TRIGGER AS $$
    BEGIN
      NEW.rank = (
        SELECT COUNT(*) + 1 
        FROM game_players gp2 
        WHERE gp2.total_points > NEW.total_points 
        OR (gp2.total_points = NEW.total_points AND gp2.games_won > NEW.games_won)
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create a materialized view for better performance
    CREATE MATERIALIZED VIEW leaderboard AS
    SELECT 
      u.id,
      u.username,
      COUNT(DISTINCT gp.game_id) as games_played,
      COUNT(DISTINCT CASE WHEN g.winner_id = u.id THEN g.id END) as games_won,
      COUNT(DISTINCT CASE WHEN g.winner_id != u.id AND g.status = 'completed' THEN g.id END) as games_lost,
      SUM(gp.points) as total_points,
      COALESCE(ROUND(AVG(gp.points), 2), 0) as avg_points_per_game,
      ROUND(COUNT(DISTINCT CASE WHEN g.winner_id = u.id THEN g.id END)::decimal / 
            NULLIF(COUNT(DISTINCT CASE WHEN g.status = 'completed' THEN g.id END), 0) * 100, 2) as win_rate,
      MAX(gp.points) as highest_score,
      COUNT(DISTINCT CASE WHEN g.status = 'completed' AND gp.points > 200 THEN g.id END) as high_score_games,
      COALESCE(
        json_object_agg(
          DISTINCT CASE WHEN g.winner_id = u.id THEN g.id END,
          json_build_object(
            'points', gp.points,
            'date', g.ended_at
          )
        ) FILTER (WHERE g.winner_id = u.id),
        '{}'::json
      ) as winning_games_history,
      -- Current Win Streak
      (
        SELECT COUNT(*)
        FROM (
          SELECT 
            g2.id,
            ROW_NUMBER() OVER (ORDER BY g2.ended_at DESC) as rn,
            LAG(g2.winner_id) OVER (ORDER BY g2.ended_at DESC) as prev_winner
          FROM games g2
          JOIN game_players gp2 ON g2.id = gp2.game_id
          WHERE gp2.user_id = u.id AND g2.status = 'completed'
          ORDER BY g2.ended_at DESC
        ) streak
        WHERE streak.prev_winner = u.id OR (streak.rn = 1 AND EXISTS (
          SELECT 1 FROM games g3
          WHERE g3.id = streak.id AND g3.winner_id = u.id
        ))
      ) as current_win_streak
    FROM users u
    LEFT JOIN game_players gp ON u.id = gp.user_id
    LEFT JOIN games g ON gp.game_id = g.id AND g.status = 'completed'
    GROUP BY u.id, u.username
    ORDER BY total_points DESC, games_won DESC, win_rate DESC;

    -- Create index for better query performance
    CREATE INDEX idx_leaderboard_total_points ON leaderboard(total_points DESC);
    CREATE INDEX idx_leaderboard_games_won ON leaderboard(games_won DESC);
    CREATE INDEX idx_leaderboard_win_rate ON leaderboard(win_rate DESC);

    -- Create a function to refresh the materialized view
    CREATE OR REPLACE FUNCTION refresh_leaderboard()
    RETURNS TRIGGER AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- Create triggers to automatically refresh the leaderboard
    CREATE TRIGGER refresh_leaderboard_on_game_complete
    AFTER UPDATE OF status ON games
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION refresh_leaderboard();

    CREATE TRIGGER refresh_leaderboard_on_points_update
    AFTER UPDATE OF points ON game_players
    FOR EACH ROW
    EXECUTE FUNCTION refresh_leaderboard();
  `);
};

exports.down = function(db) {
  return db.runSql(`
    DROP TRIGGER IF EXISTS refresh_leaderboard_on_points_update ON game_players;
    DROP TRIGGER IF EXISTS refresh_leaderboard_on_game_complete ON games;
    DROP FUNCTION IF EXISTS refresh_leaderboard();
    DROP FUNCTION IF EXISTS calculate_player_rank();
    DROP MATERIALIZED VIEW IF EXISTS leaderboard;
    DROP INDEX IF EXISTS idx_leaderboard_total_points;
    DROP INDEX IF EXISTS idx_leaderboard_games_won;
    DROP INDEX IF EXISTS idx_leaderboard_win_rate;
  `);
};

exports._meta = {
  version: 1
};
