import bcrypt from 'bcrypt';
import { pool } from '../config/database';

interface User {
    id: number;
    username: string;
    email: string;
    created_at: Date;
    last_login: Date;
}

interface UserCredentials {
    username: string;
    email: string;
    password: string;
}

class AuthService {
    private static readonly SALT_ROUNDS = 10;

    async registerUser({ username, email, password }: UserCredentials): Promise<User> {
        const passwordHash = await bcrypt.hash(password, AuthService.SALT_ROUNDS);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash) 
             VALUES ($1, $2, $3) 
             RETURNING id, username, email, created_at, last_login`,
            [username, email, passwordHash]
        );

        return result.rows[0];
    }

    async loginUser(username: string, password: string): Promise<User | null> {
        const result = await pool.query(
            `SELECT id, username, email, password_hash, created_at, last_login 
             FROM users 
             WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return null;
        }

        // Update last login time
        await pool.query(
            `UPDATE users 
             SET last_login = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [user.id]
        );

        // Don't send password hash to client
        delete user.password_hash;
        return user;
    }

    async getUserById(id: number): Promise<User | null> {
        const result = await pool.query(
            `SELECT id, username, email, created_at, last_login 
             FROM users 
             WHERE id = $1`,
            [id]
        );

        return result.rows[0] || null;
    }
}

export const authService = new AuthService();
