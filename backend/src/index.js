require('dotenv').config({ path: '../.env' });
const express = require('express');
const session = require('express-session');
const { port } = require('../src/config');
const banksRouter = require('../routes/banks');
const authRouter = require('../routes/auth');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.set('trust proxy', 1); // Trust the React dev server proxy for correct rate limiting
const dbPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    xssFilter: true,
    noSniff: true,
    ieNoOpen: true,
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4000", // Allow frontend dev server
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
}));

// Set up session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true on Render (HTTPS), false locally
        httpOnly: true, // prevents JS access to cookies
        sameSite: 'lax', // Lax for local dev, strict for prod
        maxAge: 1000 * 60 * 60 * 2 // 2 hours
    }
}));

// parse JSON bodies
app.use(express.json());

// mount feature routers
app.use('/banks', banksRouter);
app.use('/auth', authRouter);

app.get('/db-health', async (req, res) => {
    try {
        const { rows } = await dbPool.query('SELECT NOW()');
        res.json({ status: 'ok', time: rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Listening on port ${port}`);
        console.log('envsssss', process.env.TL_REDIRECT_URI);
        console.log('BANKS routes:', banksRouter.stack.map(r => r.route.path));
    });
}

module.exports = app;