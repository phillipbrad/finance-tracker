require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    db: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        pass: process.env.DB_PASS,
        name: process.env.DB_NAME,
    },
    truelayer: {
        clientId: process.env.TL_CLIENT_ID,
        clientSecret: process.env.TL_CLIENT_SECRET,
        redirectUri: process.env.TL_REDIRECT_URI,
    },
};
