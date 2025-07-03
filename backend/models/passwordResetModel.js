// Password reset Model for storing and retrieving reset tokens
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

/* Saves a password reset token and its expiry for a user in the database. */
async function savePasswordResetToken(userId, token, expiresAt) {
    await pool.query(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );
}

/* Finds a password reset token record by token value. */
async function findPasswordResetByToken(token) {
    const { rows } = await pool.query(
        'SELECT user_id, token, expires_at FROM password_resets WHERE token = $1 LIMIT 1',
        [token]
    );
    return rows[0];
}

/* Deletes (invalidates) a password reset token from the database. */
async function invalidatePasswordResetToken(token) {
    await pool.query('DELETE FROM password_resets WHERE token = $1', [token]);
}

module.exports = {
    savePasswordResetToken,
    findPasswordResetByToken,
    invalidatePasswordResetToken,
};
