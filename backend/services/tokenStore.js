// Token storage service for PostgreSQL
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

/* Save a user's token details to the database */
async function saveUserToken({ user_id, access_token, refresh_token, expires_in, scope, token_type }) {
    try {
        const query = `
        INSERT INTO user_tokens (user_id, access_token, refresh_token, expires_in, scope, token_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_in = EXCLUDED.expires_in,
          scope = EXCLUDED.scope,
          token_type = EXCLUDED.token_type,
          created_at = NOW()
        RETURNING user_id, access_token, refresh_token, expires_in, scope, token_type, created_at;
      `;
        const values = [user_id, access_token, refresh_token, expires_in, scope, token_type];
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (error) {

        throw error;
    }
};

/* Get the most recent token for a user from the database */
async function getUserToken(user_id) {
    try {
        // Get the most recent token for a user
        const query = 'SELECT user_id, access_token, refresh_token, expires_in, scope, token_type, created_at FROM user_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1';
        const values = [user_id];
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    } catch (error) {

        throw error;
    }

};

/* Fetch a valid access token for a user, refreshing if expired */
async function fetchOrRefreshAccessToken(user_id) {
    try {
        const tokenRow = await getUserToken(user_id);
        if (!tokenRow) return null;
        // Parse JWT to get iat/exp
        function parseJwt(token) {
            try {
                const payload = token.split('.')[1];
                const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
                return JSON.parse(decoded);
            } catch (e) {
                return null;
            }
        }
        const jwt = parseJwt(tokenRow.access_token);
        let expiryTime, issuedAt;
        if (jwt && jwt.exp && jwt.iat) {
            issuedAt = jwt.iat * 1000;
            expiryTime = jwt.exp * 1000;
        } else {
            // fallback to DB
            issuedAt = new Date(tokenRow.created_at).getTime();
            expiryTime = issuedAt + Number(tokenRow.expires_in) * 1000;
        }
        const now = Date.now();
        const bufferMs = 30 * 1000; // 30 seconds buffer

        if (now < expiryTime - bufferMs) {

            return tokenRow.access_token;
        } else {

            // Token expired, refresh it
            try {
                const response = await axios.post('https://auth.truelayer-sandbox.com/connect/token',
                    new URLSearchParams({
                        grant_type: 'refresh_token',
                        refresh_token: tokenRow.refresh_token,
                        client_id: process.env.TL_CLIENT_ID,
                        client_secret: process.env.TL_CLIENT_SECRET,
                        redirect_uri: process.env.TL_REDIRECT_URI
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );
                // Save new tokens
                await saveUserToken({
                    user_id,
                    access_token: response.data.access_token,
                    refresh_token: response.data.refresh_token,
                    expires_in: response.data.expires_in,
                    scope: response.data.scope,
                    token_type: response.data.token_type
                });

                return response.data.access_token;
            } catch (error) {

                return null;
            }
        }
    } catch (error) {

        return null;
    }
};

module.exports = { saveUserToken, getUserToken, fetchOrRefreshAccessToken };
