'use strict';

exports.up = function(db) {
  return db.runSql(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_users_username ON users(username);
    CREATE INDEX idx_users_email ON users(email);
  `);
};

exports.down = function(db) {
  return db.runSql(`
    DROP INDEX IF EXISTS idx_users_email;
    DROP INDEX IF EXISTS idx_users_username;
    DROP TABLE IF EXISTS users;
  `);
};

exports._meta = {
  version: 1
};
