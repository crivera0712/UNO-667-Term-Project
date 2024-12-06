require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db/config');

async function runMigration() {
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, '../db/migrations/001_initial_setup.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Run the migration
        await pool.query(migrationSQL);
        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Execute the migration
runMigration();
