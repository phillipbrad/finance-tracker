require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { AuthAPIClient } = require('truelayer-client');
const pkceChallenge = require('pkce-challenge').default;
const { randomUUID } = require('crypto');
const querystring = require('querystring');
const axios = require('axios');

const codeStore = new Map(); // User ID verifier


/* initialize TrueLayer client once */
const authClient = new AuthAPIClient({
    client_id: process.env.TL_CLIENT_ID,
    client_secret: process.env.TL_CLIENT_SECRET,
    environment: 'sandbox',
});


/* Generate a TrueLayer OAuth URL for a specific user */
async function getLinkUrlForUser(userId) {
    const redirect_uri = process.env.TL_REDIRECT_URI;
    if (!redirect_uri) throw new Error("Missing TL_REDIRECT_URI");

    const { code_verifier, code_challenge } = await pkceChallenge();


    codeStore.set(userId, code_verifier);
    // For sandbox, change when going live
    const params = {
        response_type: 'code',
        client_id: process.env.TL_CLIENT_ID,
        redirect_uri,
        scope: 'accounts transactions balance',
        code_challenge,
        code_challenge_method: 'S256',
        nonce: randomUUID(),
        providers: 'uk-cs-mock ul-ob-all uk-oauth-all'
    };

    return { url: `https://auth.truelayer-sandbox.com/?${querystring.stringify(params)}`, codeVerifier: code_verifier };
};


/* Exchange an authorization code for an access token with TrueLayer */
async function exchangeCodeForToken(code, redirect_uri, verifier) {
    try {
        const response = await axios.post('https://auth.truelayer-sandbox.com/connect/token',
            {
                grant_type: 'authorization_code',
                client_id: process.env.TL_CLIENT_ID,
                client_secret: process.env.TL_CLIENT_SECRET,
                redirect_uri: redirect_uri,
                code: code,
                code_verifier: verifier
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return response.data;
    } catch (error) {
        throw error;
    }
}


/* Retrieve all accounts for a user from TrueLayer using the access token */
async function getAccounts(access_token) {
    try {
        const url = "https://api.truelayer-sandbox.com/data/v1/accounts";
        const headers = {
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/json'
        }
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        throw error;
    }
}


/* Retrieve all transactions for a specific account from TrueLayer */
async function getTransactions(access_token, account_id) {
    try {
        const url = `https://api.truelayer-sandbox.com/data/v1/accounts/${account_id}/transactions`;
        const headers = {
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/json'
        }
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        throw error;
    }
}


/* Fetch balances for all accounts using the access token */
async function getBalances(access_token) {
    try {
        const url = "https://api.truelayer-sandbox.com/data/v1/accounts";
        const headers = {
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/json'
        };

        const response = await axios.get(url, { headers });

        const accounts = response.data.results || [];

        // Fetch balances for each account
        const balances = await Promise.all(accounts.map(async (acc) => {
            try {
                const balUrl = `https://api.truelayer-sandbox.com/data/v1/accounts/${acc.account_id}/balance`;
                const balRes = await axios.get(balUrl, { headers });

                return {
                    account_id: acc.account_id,
                    account_type: acc.account_type,
                    currency: acc.currency,
                    balance: balRes.data.results[0] // TrueLayer returns an array
                };
            } catch (err) {

                return {
                    account_id: acc.account_id,
                    account_type: acc.account_type,
                    currency: acc.currency,
                    balance: null
                };
            }
        }));

        return balances;
    } catch (error) {
        throw error;
    }
}


/* Extend TrueLayer connection (reconfirmation of consent) */
async function extendConnection(access_token, user_has_reconfirmed_consent = true) {
    try {
        const url = 'https://api.truelayer-sandbox.com/data/v1/connections/extend';
        const headers = {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };
        const body = {
            user_has_reconfirmed_consent
        };
        const response = await axios.post(url, body, { headers });
        return response.data;
    } catch (error) {
        throw error;
    }
}

// Export for use elsewhere
module.exports = {
    getLinkUrlForUser,
    exchangeCodeForToken,
    getAccounts,
    getTransactions,
    getBalances,
    extendConnection
}