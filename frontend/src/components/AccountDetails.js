import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from './LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { WalletIcon, TrendingUpIcon, TrendingDownIcon } from './DashboardIcons';
import { SidebarContent } from './ResponsiveNav';
import BottomNav from "./BottomNav";
import TransactionListMobile from "./TransactionListMobile";
import ResponsiveNav from './ResponsiveNav';

const AccountDetails = ({ handleConsentError }) => {
    const { accountId } = useParams();
    const [account, setAccount] = useState(null);
    const [income, setIncome] = useState(0);
    const [expenses, setExpenses] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [visibleCount, setVisibleCount] = useState(25);
    const [txError, setTxError] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterMonth, setFilterMonth] = useState('ALL');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sort, setSort] = useState('desc');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();


    /* Logs the user out by removing the token and redirecting to the homepage */
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };



    useEffect(() => {

        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        /* Fetches all account balances from the backend and selects the one
         matching the current accountId from the URL using useParams() */

        /* Fetch all balances and find the one for this account */
        const fetchBalance = async () => {
            try {
                const res = await fetch(`${process.env.REACT_APP_API_URL}/banks/balances`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (Array.isArray(data.balances)) {
                    const found = data.balances.find(acc => acc.account_id === accountId); // Find the account matching the accountId
                    setAccount(found);
                }
            } catch (err) {
                setAccount(null);
                setError('Could not fetch account details');
            }
        };
        fetchBalance();

        // Fetch transactions for this account only
        const fetchTransactions = async () => {
            try {

                const res = await fetch(`${process.env.REACT_APP_API_URL}/banks/transactions/${accountId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    if (handleConsentError) handleConsentError();
                    return;
                }
                const data = await res.json();

                // Process transaction data 
                if (Array.isArray(data.results)) {
                    setTransactions(data.results); // Set all transactions to state 
                    const totalIncome = data.results.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0); // If a positive amount in transactions its income 
                    const totalExpenses = data.results.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0); // if a negative amount its an expense
                    setIncome(totalIncome); // Set income
                    setExpenses(Math.abs(totalExpenses)); // Set expenses as a positive value to totalExpenses
                } else {
                    setTxError('Could not fetch transactions');
                    setError('Could not fetch transactions');
                }
            } catch (err) {
                if (handleConsentError) handleConsentError();
                setIncome(0);
                setExpenses(0);
                setTxError('Network error');
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [accountId, navigate, handleConsentError]);


    /*  Infinite scroll: Observes the account-tx-load-trigger element at the bottom of the transaction list.
        When the trigger enters the viewport and there are more transactions to show, increases visibleCount to load more.
        Cleans up the observer on dependency change or unmount. */
    useEffect(() => {
        const observer = new window.IntersectionObserver(entries => {
            const target = entries[0];
            if (target.isIntersecting && visibleCount < transactions.length) {
                setVisibleCount(prev => prev + 25);
            }
        });
        const trigger = document.getElementById('account-tx-load-trigger');
        if (trigger) observer.observe(trigger);
        return () => observer.disconnect();
    }, [transactions, visibleCount]);



    // Get unique categories from transactions
    const categories = Array.from(new Set(transactions.map(tx => tx.transaction_category).filter(Boolean)));
    // Get unique months (YYYY-MM) from transactions
    const months = Array.from(new Set(transactions.map(tx => tx.timestamp ? new Date(tx.timestamp).toISOString().slice(0, 7) : null).filter(Boolean)));

    /* Filtering logic */
    const filteredTransactions = transactions.filter(tx => {
        // Type filter: If filtering for 'income', exclude transactions with amount <= 0 not income.
        if (filterType === 'income' && tx.amount <= 0) return false;
        // Type filter: If filtering for 'outgoing', exclude transactions with amount > 0 not outgoing.
        if (filterType === 'outgoing' && tx.amount > 0) return false;

        // Category filter: If a specific category is selected exclude transactions that don't match.
        if (filterCategory !== 'ALL' && tx.transaction_category !== filterCategory) return false;

        // Month filter: If a specific month is selected exclude transactions not in that month.
        if (filterMonth !== 'ALL') {
            // Convert timestamp to 'YYYY-MM' format for comparison.
            const txMonth = tx.timestamp ? new Date(tx.timestamp).toISOString().slice(0, 7) : '';
            if (txMonth !== filterMonth) return false;
        }

        // Search filter: If a search term is entered exclude transactions that don't match any field.
        if (searchTerm.trim() !== '') {
            // Prepare search term and fields for case-insensitive comparison.
            const term = searchTerm.trim().toLowerCase();
            const desc = (tx.description || '').toLowerCase();
            const merchant = (tx.merchant_name || '').toLowerCase();
            const category = (tx.transaction_category || '').toLowerCase();
            const amount = String(tx.amount);
            // Exclude if search term not found in any relevant field.
            if (!desc.includes(term) && !merchant.includes(term) && !category.includes(term) && !amount.includes(term)) {
                return false;
            }
        }

        // If transaction passes all filters, include it in the result.
        return true;
    });

    // Apply search after filters
    const searchedTransactions = filteredTransactions.filter(tx =>
        (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.merchant_name && tx.merchant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.amount && tx.amount.toString().includes(searchTerm))
    );

    // Sort by date according to sort state
    const sortedTransactions = sort === "asc"
        ? [...searchedTransactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        : [...searchedTransactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Formats a number as GBP currency or return ... if invalid
    const formatGBP = (amount) => {
        if (typeof amount !== 'number' || isNaN(amount)) return '...';
        return amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
    };

    /* Groups transactions by month and calculates total income and outgoings for each month */
    function getMonthlyIncomeExpenses(transactions) {
        const monthly = {};
        transactions.forEach(tx => {
            // Skip if transaction has no timestamp or invalid amount
            if (!tx.timestamp || typeof tx.amount !== 'number') return;

            // Get month and year as a string e.g., "June 2025"
            const month = new Date(tx.timestamp).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
            // Initialize the month entry if it doesn't exist
            if (!monthly[month]) {
                monthly[month] = { month, income: 0, outgoings: 0 };
            }
            // Add to income if amount is positive, otherwise add to outgoings
            if (tx.amount > 0) {
                monthly[month].income += tx.amount;
            } else if (tx.amount < 0) {
                monthly[month].outgoings += Math.abs(tx.amount);
            }
        });
        // Return an array of monthly summaries sorted by month name
        return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
    }
    const monthlyData = getMonthlyIncomeExpenses(transactions);


    /* Back to top button visibility */
    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 200);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    /* Card data for account */
    const cards = [
        {
            key: 'balance',
            title: 'Total Balance',
            value: formatGBP(account?.balance?.available),
            icon: <WalletIcon />,
            sublabel: account?.currency ? `In ${account.currency}` : '',
        },
        {
            key: 'income',
            title: 'Income',
            value: formatGBP(income),
            icon: <TrendingUpIcon />,
            sublabel: 'This account',
        },
        {
            key: 'expenses',
            title: 'Expenses',
            value: formatGBP(expenses),
            icon: <TrendingDownIcon />,
            sublabel: 'This account',
        },
    ];

    if (loading) {
        return <LoadingSpinner message="Loading account details..." />;
    }
    if (error) {
        return <div className="alert alert-danger text-center my-5" role="alert">{error}</div>;
    }

    return (
        <div className="container-fluid min-vh-100 ">
            <ResponsiveNav navigate={navigate} handleLogout={handleLogout} />
            <div className="row">
                {/* Sidebar using React Pro Sidebar, visible only at xxl and above */}
                <div className="col-xxl-2 d-none d-xxl-block px-0 custom-sidebar">
                    <SidebarContent onNavigate={navigate} onLogout={handleLogout} />
                </div>
                {/* Main Content using Bootstrap grid */}
                <main className="col-12 col-xxl-10 ms-auto px-4 py-4">
                    {/* Topbar */}
                    <div className="d-flex justify-content-center align-items-center mb-4 text-center">
                        <div>
                            <h1 className="h3">Account Details</h1>
                            <p className="text-muted">Detailed view of your selected account.</p>
                        </div>
                    </div>
                    {/* Cards */}
                    <div className="row mb-4">
                        {cards.map(card => (
                            <div key={card.key} className="col-12 col-sm-6 col-lg-4 mb-3">
                                <div className="card h-100 shadow-sm border-0">
                                    <div className="card-body d-flex align-items-center gap-3">
                                        <div className={`icon-circle icon-${card.key}`}>{card.icon}</div>
                                        <div>
                                            <div className="text-muted small">{card.title}</div>
                                            <div className="h4 fw-bold mb-0">{card.value}</div>
                                            {card.sublabel && <div className="small text-secondary">{card.sublabel}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Monthly Income & Outgoings Chart */}
                    <div className="card mb-4 shadow-sm border-0 dashboard-chart-card">
                        <div className="card-header bg-white border-0 d-flex align-items-center" style={{ minHeight: 56 }}>
                            <h2 className="h6 mb-0 fw-bold" style={{ color: '#00C896', letterSpacing: '0.01em' }}>Monthly Income & Outgoings</h2>
                        </div>
                        <div className="p-3" style={{ width: '100%', height: 260, background: '#fff', borderRadius: 12 }}>
                            <ResponsiveContainer>
                                <BarChart data={monthlyData} barSize={28} style={{ fontFamily: 'inherit' }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#6c757d', fontWeight: 500 }} />
                                    <YAxis tick={{ fontSize: 13, fill: '#6c757d', fontWeight: 500 }} />
                                    <Tooltip
                                        wrapperClassName="chart-tooltip-style"
                                        contentStyle={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: 'none', color: '#222', fontSize: 14 }}
                                        formatter={(value, name) => [
                                            typeof value === 'number'
                                                ? value.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
                                                : value,
                                            name.charAt(0).toUpperCase() + name.slice(1)
                                        ]}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontWeight: 500 }} />
                                    <Bar dataKey="income" fill="url(#incomeGradient)" radius={[8, 8, 0, 0]} name="Income" />
                                    <Bar dataKey="outgoings" fill="url(#outgoingsGradient)" radius={[8, 8, 0, 0]} name="Outgoings" />
                                    <defs>
                                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#00C896" stopOpacity={0.9} />
                                            <stop offset="100%" stopColor="#e6f9f2" stopOpacity={0.7} />
                                        </linearGradient>
                                        <linearGradient id="outgoingsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#dc3545" stopOpacity={0.9} />
                                            <stop offset="100%" stopColor="#ffeaea" stopOpacity={0.7} />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="card">
                        <div className="card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                            <h2 className="h6 mb-0">Transactions</h2>
                            {/* Inline Filter Bar */}
                            <div className="d-flex flex-wrap gap-2 align-items-center mt-2 mt-md-0">
                                <input type="text" className="form-control me-2 transactions-search-bar" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                {/* Sort by filter */}
                                <select className="form-select form-select-sm transactions-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                                    <option value="desc">Newest first</option>
                                    <option value="asc">Oldest first</option>
                                </select>
                                {/* Type Filter */}
                                <select className="form-select form-select-sm" style={{ width: '120px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                    <option value="ALL">All</option>
                                    <option value="income">Income</option>
                                    <option value="outgoing">Outgoing</option>
                                </select>
                                {/* Category Filter */}
                                <select className="form-select form-select-sm" style={{ width: '150px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                    <option value="ALL">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                                {/* Month Filter */}
                                <select className="form-select form-select-sm" style={{ width: '120px' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                    <option value="ALL">All Months</option>
                                    {months.map(month => (
                                        <option key={month} value={month}>{month}</option>
                                    ))}
                                </select>
                                {/* Reset Button */}
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => { setFilterType('ALL'); setFilterCategory('ALL'); setFilterMonth('ALL'); setSearchTerm(''); setSort('desc'); }}>Reset</button>
                            </div>
                        </div>
                        <div className="p-3">
                            {/* Filter Chips */}
                            <div className="mb-3 d-flex flex-wrap gap-2">
                                {filterType !== 'ALL' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Type: {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                                        <button type="button" className="btn-close btn-close-white ms-2 badge-close-btn" aria-label="Remove" onClick={() => setFilterType('ALL')}></button>
                                    </span>
                                )}
                                {filterCategory !== 'ALL' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Category: {filterCategory.replace(/_/g, ' ')}
                                        <button type="button" className="btn-close btn-close-white ms-2 badge-close-btn" aria-label="Remove" onClick={() => setFilterCategory('ALL')}></button>
                                    </span>
                                )}
                                {filterMonth !== 'ALL' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Month: {filterMonth}
                                        <button type="button" className="btn-close btn-close-white ms-2 badge-close-btn" aria-label="Remove" onClick={() => setFilterMonth('ALL')}></button>
                                    </span>
                                )}
                                {searchTerm && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Search: {searchTerm}
                                        <button type="button" className="btn-close btn-close-white ms-2 badge-close-btn" aria-label="Remove" onClick={() => setSearchTerm('')}></button>
                                    </span>
                                )}
                                {sort === 'asc' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Sort: Oldest first
                                        <button type="button" className="btn-close btn-close-white ms-2 badge-close-btn" aria-label="Remove" onClick={() => setSort('desc')}></button>
                                    </span>
                                )}
                            </div>

                            {/* Table-based Transactions Layout */}
                            {sortedTransactions.length === 0 ? (
                                <div className="text-center text-muted py-4">No transactions found.</div>
                            ) : (
                                <div className="d-none d-md-block">
                                    <div className="table-responsive">
                                        <table className="table custom-table align-middle">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Description</th>
                                                    <th>Merchant</th>
                                                    <th>Category</th>
                                                    <th>Type</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedTransactions.slice(0, visibleCount).map((tx, idx) => {
                                                    const cat = tx.transaction_category;
                                                    return (
                                                        <tr key={tx.transaction_id || idx}>
                                                            <td>{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</td>
                                                            <td className="fw-bold">{tx.description || tx.merchant_name || 'N/A'}</td>
                                                            <td>{tx.merchant_name || ''}</td>
                                                            <td>{cat ? cat.replace(/_/g, ' ') : 'N/A'}</td>
                                                            <td>{tx.amount > 0 ? 'Income' : 'Outgoing'}</td>
                                                            <td className={tx.amount > 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Desktop/tablet only: Infinite scroll trigger and loading message */}
                                    {visibleCount < transactions.length && (
                                        // Show loading message and infinite scroll trigger only on desktop/tablet. Mobile handled in TransactionListMobile.js
                                        <div className="d-none d-md-block">
                                            <div className="text-center py-3 text-muted" id="account-tx-load-trigger">
                                                Loading more transactions...
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Mobile infinite scroll and loading handled in TransactionListMobile */}
                            <div className="d-block d-md-none">
                                <TransactionListMobile
                                    transactions={sortedTransactions.slice(0, visibleCount)}
                                    visibleCount={visibleCount}
                                    setVisibleCount={setVisibleCount}
                                    hasMore={visibleCount < sortedTransactions.length}
                                    loadingMore={loading}
                                />
                            </div>
                            {txError && <div className="text-danger text-center py-2">{txError}</div>}
                        </div>
                    </div>

                    {/* Back to Top Button */}
                    {showBackToTop && (
                        <button
                            onClick={scrollToTop}
                            className="back-to-top-btn"
                            aria-label="Back to top"
                            title="Back to top"
                        >
                            ↑
                        </button>
                    )}
                </main>
            </div >
            <BottomNav onLogout={handleLogout} navigate={navigate} />
        </div >
    );
};

export default AccountDetails;
