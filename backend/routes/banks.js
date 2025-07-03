const express = require("express");
const { getLinkUrlForUser, exchangeCodeForToken } = require("../services/bankService");
const { saveUserToken, fetchOrRefreshAccessToken } = require("../services/tokenStore");
const { param, validationResult } = require('express-validator');
const { authenticateJWT } = require('../middleware/jwt');
const { balances, accounts, transactions, allTransactions, income, incomeByYear, incomeByMonth, transactionsByMonth, extendConnectionController } = require('../controllers/banksController');

const router = express.Router();


// Route to get the bank account linking URL for the authenticated user.
router.get('/link', authenticateJWT, async (req, res, next) => {
    try {
        const { url, codeVerifier, redirectUri } = await getLinkUrlForUser(req.user.id);
        req.session.codeVerifier = codeVerifier;
        req.session.codeExchangeDone = false; // Reset flag for new flow
        req.session.save?.(); // Ensure session is saved
        res.json({ url });
    } catch (err) {
        next(err);
    }
})


// Route to handle the OAuth callback and exchange code for tokens.
router.get('/callback', authenticateJWT, async (req, res, next) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing code' });
    if (!req.session?.codeVerifier) {
        return res.status(400).json({ error: 'Missing PKCE code_verifier in session. Please restart the bank linking process.' });
    }
    if (req.session.codeExchangeDone) {
        return res.status(400).json({ error: 'This authorization code has already been used. Please restart the bank linking process.' });
    }
    try {
        const result = await exchangeCodeForToken(code, process.env.TL_REDIRECT_URI, req.session.codeVerifier);
        // Save tokens to DB
        await saveUserToken({
            user_id: req.user.id,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            expires_in: result.expires_in,
            scope: result.scope,
            token_type: result.token_type
        });
        req.session.codeExchangeDone = true; // Prevent re-use
        req.session.save?.();
        console.log('Token exchange result:', result);
        return res.json({ success: true, tokens: result });
    } catch (err) {
        console.error('Error in /banks/callback:', err);
        return res.status(400).json({ error: 'Token exchange failed', details: err.response?.data || err.message });
    }
});

// Route to get all linked bank accounts for the authenticated user.
router.get('/accounts', authenticateJWT, async (req, res, next) => {
    try {
        const accessToken = await fetchOrRefreshAccessToken(req.user.id);
        if (accessToken) {
            req.user.access_token = accessToken;
            await accounts(req, res, next);
        } else {
            res.status(401).json({
                error: "Authorisation expired. Please re-link your bank account.",
                relink_url: "/link"
            });
        }
    } catch (error) {
        next(error);
    }
});

// Route to get transactions for a specific account by account_id.
router.get('/transactions/:account_id',
    [
        param('account_id').isString().notEmpty().withMessage('Account ID is required')
    ],
    authenticateJWT,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    async (req, res, next) => {
        try {
            const accessToken = await fetchOrRefreshAccessToken(req.user.id);
            if (accessToken) {
                req.user.access_token = accessToken;
                await transactions(req, res, next);
            } else {
                res.status(401).json({
                    error: "Authorisation expired. Please re-link your bank account.",
                    relink_url: "/link"
                });
            }
        } catch (error) {
            next(error);
        }
    });

// Route to get all transactions for all accounts.
router.get('/transactions', authenticateJWT, async (req, res, next) => {
    try {
        const accessToken = await fetchOrRefreshAccessToken(req.user.id);
        if (!accessToken) {
            return res.status(401).json({
                error: "Authorisation expired. Please re-link your bank account.",
                relink_url: "/link"
            });
        }
        req.user.access_token = accessToken;
        await allTransactions(req, res, next);
    } catch (error) {
        next(error);
    }
});

// Route to get balances for all linked accounts.
router.get('/balances', authenticateJWT, async (req, res, next) => {
    try {
        const accessToken = await fetchOrRefreshAccessToken(req.user.id);
        if (accessToken) {
            req.user.access_token = accessToken;
            await balances(req, res, next);
        } else {
            res.status(401).json({
                error: "Authorisation expired. Please re-link your bank account.",
                relink_url: "/link"
            });
        }
    } catch (error) {
        next(error);
    }
});

// Route to get all income transactions for the authenticated user.
router.get('/income', authenticateJWT, async (req, res, next) => {
    try {
        const accessToken = await fetchOrRefreshAccessToken(req.user.id);
        if (accessToken) {
            req.user.access_token = accessToken;
            await income(req, res, next);
        } else {
            res.status(401).json({
                error: "Authorisation expired. Please re-link your bank account.",
                relink_url: "/link"
            });
        }
    } catch (error) {
        next(error);
    }
});

// Get income for a specific year
router.get('/income/year/:year',
    [param('year').isInt({ min: 1900, max: 2100 }).withMessage('Year must be a valid integer')],
    authenticateJWT,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    async (req, res, next) => {
        try {
            const accessToken = await fetchOrRefreshAccessToken(req.user.id);
            if (accessToken) {
                req.user.access_token = accessToken;
                await incomeByYear(req, res, next);
            } else {
                res.status(401).json({
                    error: "Authorisation expired. Please re-link your bank account.",
                    relink_url: "/link"
                });
            }
        } catch (error) {
            next(error);
        }
    });

// Get income for a specific year and month
router.get('/income/month/:year/:month',
    [
        param('year').isInt({ min: 1900, max: 2100 }).withMessage('Year must be a valid integer'),
        param('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12')
    ],
    authenticateJWT,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    async (req, res, next) => {
        try {
            const accessToken = await fetchOrRefreshAccessToken(req.user.id);
            if (accessToken) {
                req.user.access_token = accessToken;
                await incomeByMonth(req, res, next);
            } else {
                res.status(401).json({
                    error: "Authorization expired. Please re-link your bank account.",
                    relink_url: "/link"
                });
            }
        } catch (error) {
            next(error);
        }
    });

// Get transactions for a specific year and month
router.get('/transactions/month/:year/:month',
    [
        param('year').isInt({ min: 1900, max: 2100 }).withMessage('Year must be a valid integer'),
        param('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12')
    ],
    authenticateJWT,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
    async (req, res, next) => {
        try {
            const accessToken = await fetchOrRefreshAccessToken(req.user.id);
            if (accessToken) {
                req.user.access_token = accessToken;
                await transactionsByMonth(req, res, next);
            } else {
                res.status(401).json({
                    error: "Authorisation expired. Please re-link your bank account.",
                    relink_url: "/link"
                });
            }
        } catch (error) {
            next(error);
        }
    });

// POST /banks/extend-connection
router.post('/extend-connection', authenticateJWT, async (req, res, next) => {
    try {
        // Attach access_token to req.user if available
        const accessToken = await fetchOrRefreshAccessToken(req.user.id);
        if (!accessToken) {
            return res.status(401).json({
                error: "Authorisation expired. Please re-link your bank account.",
                relink_url: "/link"
            });
        }
        req.user.access_token = accessToken;
        await extendConnectionController(req, res, next);
    } catch (error) {
        next(error);
    }
});


module.exports = router;