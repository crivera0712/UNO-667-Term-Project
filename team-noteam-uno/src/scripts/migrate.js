require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'uno_dev',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function createMigrationsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function getExecutedMigrations() {
    const result = await pool.query('SELECT name FROM migrations ORDER BY id');
    return result.rows.map(row => row.name);
}

async function markMigrationAsExecuted(migrationName) {
    await pool.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
}

async function executeMigration(migrationPath, migrationName) {
    console.log(`Executing migration: ${migrationName}`);
    const migration = require(migrationPath);

    try {
        await pool.query('BEGIN');
        await migration.up({ runSql: async (sql) => {
            await pool.query(sql);
        }});
        await markMigrationAsExecuted(migrationName);
        await pool.query('COMMIT');
        console.log(`✓ Migration successful: ${migrationName}`);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`✗ Migration failed: ${migrationName}`);
        throw error;
    }
}

async function migrate() {
    try {
        await createMigrationsTable();

        const executedMigrations = await getExecutedMigrations();
        const migrationsDir = path.join(__dirname, '../../migrations');
        const migrationFiles = await fs.readdir(migrationsDir);

        // Sort migration files to ensure correct order
        migrationFiles.sort();

        for (const file of migrationFiles) {
            if (!file.endsWith('.js')) continue;

            if (!executedMigrations.includes(file)) {
                await executeMigration(path.join(migrationsDir, file), file);
            } else {
                console.log(`Migration already executed: ${file}`);
            }
        }

        console.log('All migrations executed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
