const express = require('express');
const { register, login, updateEmail, updatePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateJWT } = require('../middleware/jwt');
const router = express.Router();


const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 5, // Limit each ip to 5 requests per windoMs
    message: { error: 'Too many login attempts, please try again later.' }
})


const loginMiddlewares = [loginLimiter];

/* Route for user registration with input validation for email and password. */
router.post('/register',
    [
        body('email').isEmail().withMessage('Valid email required').trim().toLowerCase(),
        body('password')
            .isString().withMessage('Password is required')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .custom(value => !/\s/.test(value)).withMessage('Password must not contain spaces')
    ], (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }, register
);


/* Route for user login with rate limiting and input validation. */
router.post('/login', ...loginMiddlewares,
    [
        body('email').isEmail().withMessage('Valid email required'),
        body('password')
            .isString().withMessage('Password is required')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')

    ], (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }, login);


// PATCH /auth/username 
/* Route for updating user email with JWT authentication and input validation. */
router.patch('/username', authenticateJWT,
    body('newEmail').isEmail().withMessage('Valid email required').trim().toLowerCase(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    updateEmail
);

// PATCH /auth/password 
/* Route for updating user password with JWT authentication and input validation. */
router.patch('/password', authenticateJWT,
    body('currentPassword').isString().withMessage('Current password required'),
    body('newPassword').isString().isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    updatePassword
);

/* Route for requesting a password reset link. */
router.post('/forgot-password', forgotPassword);

/* Route for resetting the user's password using a reset token. */
router.post('/reset-password', resetPassword);


module.exports = router;
