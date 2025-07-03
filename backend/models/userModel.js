// User model for registration/login
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Creates a new user with a hashed password and returns the new user's id and email.
async function createUser({ email, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email;`;
    const values = [email, hashedPassword];
    const { rows } = await pool.query(query, values);
    return rows[0];
}

// Finds a user by email address. Returns user object or null if not found.
async function findUserByEmail(email) {
    const query = `SELECT id, email, password FROM users WHERE email = $1 LIMIT 1;`;
    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
}

// Updates a user's email address and returns the updated user's id and email.
async function updateUserEmail(userId, newEmail) {
    const query = `UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email;`;
    const { rows } = await pool.query(query, [newEmail, userId]);
    return rows[0];
}

// Updates a user's password (hashed) and returns the updated user's id and email.
async function updateUserPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = `UPDATE users SET password = $1 WHERE id = $2 RETURNING id, email;`;
    const { rows } = await pool.query(query, [hashedPassword, userId]);
    return rows[0];
}

module.exports = { createUser, findUserByEmail, updateUserEmail, updateUserPassword };
