const { getBalances, getAccounts, getTransactions, extendConnection } = require('../services/bankService');
const { body, validationResult } = require('express-validator');



/* Returns all linked bank accounts for the authenticated user. */
async function accounts(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.id) return res.status(401).json({ error: 'Unauthorised' });
        const access_token = user.access_token;
        if (!access_token) return res.status(403).json({ error: 'No linked bank account for user' });
        const accounts = await getAccounts(access_token);
        res.json(accounts);
    } catch (err) {
        next(err);
    }
}

/* Returns transactions for a specific account for the authenticated user. */
async function transactions(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.id) return res.status(401).json({ error: 'Unauthorised' });

        const access_token = user.access_token;
        if (!access_token) return res.status(403).json({ error: 'No linked bank account for user' });

        const account_id = req.params.account_id;
        // Fetch only this account's transactions from TrueLayer
        const transactions = await getTransactions(access_token, account_id);



        res.json({ status: 'Succeeded', results: Array.isArray(transactions.results) ? transactions.results : [] });
    } catch (err) {
        next(err);
    }
}

/* Returns balances for all linked accounts, including account type and provider info. */
async function balances(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.id) return res.status(401).json({ error: 'Unauthorised' });
        const access_token = user.access_token;
        if (!access_token) return res.status(403).json({ error: 'No linked bank account for user' });
        const balancesArr = await getBalances(access_token);
        // Also fetch accounts to get type info
        const accountsData = await getAccounts(access_token);
        const accounts = accountsData.results || [];
        // Join balances with account type, name, and provider info
        const balancesWithType = balancesArr.map(balanceObj => {
            // Try to match by account_id
            const account = accounts.find(acc => acc.account_id === balanceObj.account_id);
            return {
                ...balanceObj,
                type: account ? account.type : undefined,
                name: account ? account.display_name || account.account_name : undefined,
                display_name: account ? account.display_name : undefined,
                account_number: account ? account.account_number : undefined,
                provider: account ? account.provider : undefined // <-- add provider info
            };
        });
        // Calculate total balance 
        const total = balancesWithType.reduce((sum, acc) => {
            // Extracts the available/current balance or 0 from each account and sums them for the total balance.
            const amount =
                acc.balance && typeof acc.balance.available === 'number'
                    ? acc.balance.available
                    : acc.balance && typeof acc.balance.current === 'number'
                        ? acc.balance.current
                        : typeof acc.balance === 'number'
                            ? acc.balance
                            : 0;
            return sum + amount;
        }, 0);
        res.json({ status: 'Succeeded', total, balances: balancesWithType });
    } catch (err) {
        next(err);
    }
}

/* Returns all transactions across all linked accounts for the authenticated user. */
async function allTransactions(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.id) return res.status(401).json({ error: 'Unauthorised' });
        const access_token = user.access_token;
        if (!access_token) return res.status(403).json({ error: 'No linked bank account for user' });
        // Get all accounts
        const accountsData = await getAccounts(access_token);
        const accounts = accountsData.results || [];
        // Fetch transactions for all accounts in parallel
        const transactionsArrays = await Promise.all(
            accounts.map(async (account) => {
                const txData = await getTransactions(access_token, account.account_id);
                return (txData.results || []).map(tx => ({ ...tx, account_id: account.account_id }));
            })
        );
        // Flatten and sort
        const allTransactions = transactionsArrays.flat();
        allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json({ status: 'Succeeded', results: allTransactions });
    } catch (err) {
        next(err);
    }
}
/* Fetches and flattens all transactions across every linked account for the given access token. */
async function getAllUserTransactions(access_token) {
    const accountsData = await getAccounts(access_token);
    const accounts = accountsData.results || [];
    const transactionsArrays = await Promise.all(
        accounts.map(async (account) => {
            const txData = await getTransactions(access_token, account.account_id);
            return (txData.results || []).map(tx => ({ ...tx, account_id: account.account_id }));
        })
    );
    return transactionsArrays.flat();
}

/* Returns all income transactions (amount > 0) for the authenticated user. */
async function income(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.id) return res.status(401).json({ error: 'Unauthorised' });
        const access_token = user.access_token;
        if (!access_token) return res.status(403).json({ error: 'No linked bank account for user' });
        const allTransactions = await getAllUserTransactions(access_token);
        const incomeTransactions = allTransactions.filter(tx => typeof tx.amount === 'number' && tx.amount > 0);
        const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        res.json({ status: 'Succeeded', totalIncome, incomeTransactions });
    } catch (err) {
        next(err);
    }
}

/* Returns all income transactions for a specific year for the authenticated user. */
async function incomeByYear(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.id) return res.status(401).json({ error: 'Unauthorised' });
        const access_token = user.access_token;
        if (!access_token) return res.status(403).json({ error: 'No linked bank account for user' });
        const year = parseInt(req.params.year, 10);
        if (isNaN(year)) return res.status(400).json({ error: 'Invalid year' });
        const allTransactions = await getAllUserTransactions(access_token);
        const incomeTransactions = allTransactions.filter(tx => {
            if (typeof tx.amount !== 'number' || tx.amount <= 0) return false;
            if (!tx.timestamp) return false;
            const txYear = new Date(tx.timestamp).getFullYear();
            return txYear === year;
        });
        const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        res.json({ status: 'Succeeded', year, totalIncome, incomeTransactions });
    } catch (err) {
        next(err);
    }
}

/* Returns all income transactions for a specific month and year for the authenticated user. */
async function incomeByMonth(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.id) return res.status(401).json({ error: 'Unauthorised' });
        const access_token = user.access_token;
        if (!access_token) return res.status(403).json({ error: 'No linked bank account for user' });
        const year = parseInt(req.params.year, 10);
        const month = parseInt(req.params.month, 10); // 1-based (1=Jan, 12=Dec)
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid month' });
        }
        const allTransactions = await getAllUserTransactions(access_token);
        const incomeTransactions = allTransactions.filter(tx => {
            if (typeof tx.amount !== 'number' || tx.amount <= 0) return false;
            if (!tx.timestamp) return false;
            const date = new Date(tx.timestamp);
            return date.getFullYear() === year && (date.getMonth() + 1) === month;
        });
        const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        res.json({ status: 'Succeeded', year, month, totalIncome, incomeTransactions });
    } catch (err) {
        next(err);
    }
}

/* Returns all transactions for a specific month and year for the authenticated user. */
async function transactionsByMonth(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.id) return res.status(401).json({ error: 'Unauthorised' });
        const access_token = user.access_token;
        if (!access_token) return res.status(403).json({ error: 'No linked bank account for user' });
        const year = parseInt(req.params.year, 10);
        const month = parseInt(req.params.month, 10); // 1-based (1=Jan, 12=Dec)
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid year or month' });
        }
        const allTransactions = await getAllUserTransactions(access_token);
        const filteredTransactions = allTransactions.filter(tx => {
            if (!tx.timestamp) return false;
            const date = new Date(tx.timestamp);
            return date.getFullYear() === year && (date.getMonth() + 1) === month;
        });
        res.json({ status: 'Succeeded', year, month, results: filteredTransactions });
    } catch (err) {
        next(err);
    }
}

/* Extends the user's bank connection after reconfirming consent. */
async function extendConnectionController(req, res, next) {
    try {
        const user = req.user;
        if (!user || !user.id) return res.status(401).json({ error: 'Unauthorised' });
        const access_token = user.access_token;
        if (!access_token) return res.status(403).json({ error: 'No linked bank account for user' });
        const { user_has_reconfirmed_consent } = req.body;
        if (typeof user_has_reconfirmed_consent !== 'boolean') {
            return res.status(400).json({ error: 'user_has_reconfirmed_consent must be boolean' });
        }
        const result = await extendConnection(access_token, user_has_reconfirmed_consent);
        res.json({ status: 'Succeeded', result });
    } catch (err) {
        // If TrueLayer returns a 4xx/5xx, forward the error and status
        if (err.response && err.response.data) {
            return res.status(err.response.status).json({ error: err.response.data });
        }
        next(err);
    }
}

module.exports = {
    balances,
    accounts,
    transactions,
    allTransactions,
    income,
    incomeByYear,
    incomeByMonth,
    transactionsByMonth,
    extendConnectionController
};