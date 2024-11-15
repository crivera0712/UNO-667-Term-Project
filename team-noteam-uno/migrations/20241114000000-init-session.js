'use strict';

exports.up = function (db) {
  return db.runSql(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    );
    
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);
};

exports.down = function (db) {
  return db.runSql(`
    DROP INDEX IF EXISTS "IDX_session_expire";
    DROP TABLE IF EXISTS "session";
  `);
};

exports._meta = {
  "version": 1
};
