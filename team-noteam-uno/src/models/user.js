const db = require('../db/config');
const bcrypt = require('bcrypt');

class User {
    static async create({ username, email, password }) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = `
                INSERT INTO users (username, email, password_hash, last_login)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                RETURNING id, username, email, created_at, last_login;
            `;
            const result = await db.query(query, [username, email, hashedPassword]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async findByUsername(username) {
        try {
            const query = 'SELECT * FROM users WHERE username = $1';
            const result = await db.query(query, [username]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            const query = 'SELECT * FROM users WHERE email = $1';
            const result = await db.query(query, [email]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async findById(id) {
        try {
            const query = 'SELECT * FROM users WHERE id = $1';
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async updateLastLogin(id) {
        try {
            const query = `
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP 
                WHERE id = $1 
                RETURNING id, username, email, last_login;
            `;
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async verifyPassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }
}

module.exports = User;
