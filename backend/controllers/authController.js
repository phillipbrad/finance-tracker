// Auth controller for registration and login
const jwt = require('jsonwebtoken');
const { registerUser, authenticateUser, changeEmail, changePassword } = require('../services/authService');
const crypto = require('crypto');
const { savePasswordResetToken, findPasswordResetByToken, invalidatePasswordResetToken } = require('../models/passwordResetModel');
const { findUserByEmail, updateUserPassword } = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET;

/* Handles user registration and returns 201 on success or 409 if email is already registered. */
async function register(req, res, next) {
    try {
        const { email, password } = req.body;
        const user = await registerUser(email, password);
        res.status(201).json(user);
    } catch (err) {
        if (err.message === 'Email already registered') {
            return res.status(409).json({ error: err.message });
        }
        next(err);
    }
}
/* Authenticates user credentials and returns a JWT token, or 401 on failure. */
async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const token = await authenticateUser(email, password);
        res.json({ token });
    } catch (err) {
        // Always return generic error for login
        return res.status(401).json({ error: 'Invalid credentials' });
    }
}

/* Updates the user's email address and returns 409 if the new email is already registered. */
async function updateEmail(req, res, next) {
    try {
        const userId = req.user.id;
        const { newEmail } = req.body;
        const user = await changeEmail(userId, newEmail);
        res.json({ id: user.id, email: user.email });
    } catch (err) {
        if (err.message === 'Email already registered') {
            return res.status(409).json({ error: err.message });
        }
        next(err);
    }
}

/* Updates the user's password and returns 400 if the current password is incorrect. */
async function updatePassword(req, res, next) {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        await changePassword(userId, currentPassword, newPassword);
        res.json({ status: 'Password updated' });
    } catch (err) {
        if (err.message === 'Current password incorrect') {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
}

/*  Generates a password reset link and (for demo) logs it to the console if the user exists, without revealing user existence. */
async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;
        const user = await findUserByEmail(email);
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
            await savePasswordResetToken(user.id, token, expiresAt);
            // For real app: send email. For dev: log to console
            const resetLink = `http://localhost:4000/reset-password?token=${token}`;

        }

        res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
        next(err);
    }
}

/* Resets the user's password if the token is valid and not expired, otherwise returns a 400 error. */
async function resetPassword(req, res, next) {
    try {
        const { token, newPassword } = req.body;
        const reset = await findPasswordResetByToken(token);
        if (!reset || reset.expires_at < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        await updateUserPassword(reset.user_id, newPassword);
        await invalidatePasswordResetToken(token);
        res.json({ message: 'Password has been reset.' });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    register,
    login,
    updateEmail,
    updatePassword,
    forgotPassword,
    resetPassword,
};
