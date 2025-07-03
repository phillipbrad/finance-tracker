const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, updateUserEmail, updateUserPassword } = require('../models/userModel');
const JWT_SECRET = process.env.JWT_SECRET;

/* Registers a new user with the given email and password, throws if email is already registered */
async function registerUser(email, password) {
    const existing = await findUserByEmail(email);
    // Use a generic error message to prevent user enumeration
    if (existing) throw new Error('Registration failed');
    const user = await createUser({ email, password });
    return { id: user.id, email: user.email };
}

/* Authenticates a user and returns a JWT if credentials are valid, throws on failure */
async function authenticateUser(email, password) {
    const user = await findUserByEmail(email);
    if (!user) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid credentials');
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
    return token;
}

/* Changes the user's email, throws if new email is already registered */
async function changeEmail(userId, newEmail) {
    const existing = await findUserByEmail(newEmail);
    if (existing) throw new Error('Change email failed');
    const user = await updateUserEmail(userId, newEmail);
    return { id: user.id, email: user.email };
}

/* Changes the user's password after verifying the current password, throws on failure */
async function changePassword(userId, currentPassword, newPassword) {
    const user = await findUserByEmail(userId);
    if (!user) throw new Error('User not found');
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new Error('Current password incorrect');
    await updateUserPassword(userId, newPassword);
    return true;
}

module.exports = { registerUser, authenticateUser, changeEmail, changePassword };
