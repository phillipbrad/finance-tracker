import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import LoadingSpinner from './LoadingSpinner';
import { WalletIcon, TrendingUpIcon, TrendingDownIcon, PiggyBankIcon } from './DashboardIcons';
import BottomNav from './BottomNav';
import TransactionListMobile from './TransactionListMobile';
import ResponsiveNav from './ResponsiveNav';
import { SidebarContent } from './ResponsiveNav';



const Dashboard = ({ handleConsentError }) => {
    // State variables for dashboard data, loading/error status, and navigation
    const [totalBalance, setTotalBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [income, setIncome] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [expenses, setExpenses] = useState(null);
    const [accounts, setAccounts] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        // If there is no token redirect to login page 
        if (!token) {
            navigate('/');
            return;
        }

        /* Fetches account balances from the backend, handles auth errors, and updates dashboard state. */
        const fetchBalance = async () => {
            try {
                const res = await fetch(`${process.env.REACT_APP_API_URL}/banks/balances`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    // If user is authenticated but has no linked accounts, show 'No accounts linked' UI
                    setAccounts([]); // Set accounts to empty array to trigger 'No accounts linked' UI
                    setTotalBalance(0);
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                if (res.ok && typeof data.total === 'number') {
                    setTotalBalance(data.total);
                    if (Array.isArray(data.balances)) {
                        setAccounts(data.balances);
                        // If user has linked accounts, remember this
                        if (data.balances.length > 0) {
                            localStorage.setItem('hasLinkedAccounts', 'true');
                        }
                    }
                } else {
                    setError('Could not fetch balance');
                }
            } catch (err) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        fetchBalance();


        /* Fetches total income from the backend, handles auth errors, and updates income state. */
        const fetchIncome = async () => {
            try {
                const res = await fetch(`${process.env.REACT_APP_API_URL}/banks/income`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    // Only show consent modal if user has accounts
                    if (Array.isArray(accounts) && accounts.length > 0 && handleConsentError) handleConsentError();
                    return;
                }
                const data = await res.json();
                if (res.ok && typeof data.totalIncome === 'number') {
                    setIncome(data.totalIncome);
                } else {
                    setError('Could not fetch income');
                }
            } catch (err) {
                setError('Network error')
            } finally {
                setLoading(false);
            }
        };
        fetchIncome();

        /* Fetches all transactions, handles auth errors, updates transactions and expenses state. */
        const fetchTransactions = async () => {
            try {
                const res = await fetch(`${process.env.REACT_APP_API_URL}/banks/transactions`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    // Only show consent modal if user has accounts
                    if (Array.isArray(accounts) && accounts.length > 0 && handleConsentError) handleConsentError();
                    return;
                }
                const data = await res.json();
                if (res.ok && Array.isArray(data.results)) {
                    setTransactions(data.results);
                    // Calculate total expenses (sum of negative amounts)
                    const totalExpenses = data.results
                        .filter(tx => typeof tx.amount === 'number' && tx.amount < 0)
                        .reduce((sum, tx) => sum + tx.amount, 0);
                    setExpenses(Math.abs(totalExpenses));
                } else {
                    setError('Could not fetch transactions');
                }
            } catch (err) {
                setError('Network error');
            }
        };
        fetchTransactions();
    }, [navigate, handleConsentError]);


    /* Logs the user out by removing the token and redirecting to the homepage */
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    /*  Formats a number as GBP currency, or returns "..." if the value is null. */
    const formatGBP = (amount) => {
        return amount !== null ? amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' }) : '...';
    };

    /* Calculate total savings from accounts using account_type and balance.available. */
    let savingsTotal = null;
    if (Array.isArray(accounts)) {
        savingsTotal = accounts
            .filter(acc => acc.account_type && acc.account_type.toLowerCase() === 'savings' && acc.balance && typeof acc.balance.available === 'number')
            .reduce((sum, acc) => sum + acc.balance.available, 0);
    }

    /* Define cards array before return */
    const cards = [
        {
            key: 'balance',
            title: 'Total Balance',
            value: loading ? '...' : error ? error : formatGBP(totalBalance),
            icon: <WalletIcon />,
            sublabel: 'Across all accounts',
        },
        {
            key: 'income',
            title: 'Income',
            value: loading ? '...' : error ? error : formatGBP(income),
            icon: <TrendingUpIcon />,
            sublabel: 'This year',
        },
        {
            key: 'expenses',
            title: 'Expenses',
            value: loading ? '...' : error ? error : formatGBP(expenses),
            icon: <TrendingDownIcon />,
            sublabel: 'This year',
        },
        {
            key: 'savings',
            title: 'Savings',
            value: loading ? '...' : error ? error : formatGBP(savingsTotal),
            icon: <PiggyBankIcon />,
            sublabel: 'Savings accounts',
        },
    ];

    /* Groups transactions by month and calculates total income and outgoings for each month. */
    function getMonthlyIncomeExpenses(transactions) {
        // Group by month
        const monthly = {};
        transactions.forEach(tx => {
            if (!tx.timestamp || typeof tx.amount !== 'number') return;
            // Extract YYYY-MM
            const month = new Date(tx.timestamp).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
            if (!monthly[month]) {
                monthly[month] = { month, income: 0, outgoings: 0 };
            }
            if (tx.amount > 0) {
                monthly[month].income += tx.amount;
            } else if (tx.amount < 0) {
                monthly[month].outgoings += Math.abs(tx.amount);
            }
        });
        // Convert to sorted array
        return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
    }
    const monthlyData = getMonthlyIncomeExpenses(transactions);

    // Define handleLinkBank at the top level of the Dashboard component
    const handleLinkBank = async () => {
        if (window.__linkBankLoading) return; // Prevent double call
        window.__linkBankLoading = true;
        window.handleLinkBank = handleLinkBank; // Make available globally for modal
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.REACT_APP_API_URL}/banks/link`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) {
                alert('Your session has expired. Please log in again to link your bank account.');
                window.location.href = '/';
                return;
            }
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } finally {
            window.__linkBankLoading = false;
        }
    };

    if (loading) {
        return (
            <div className="container-fluid min-vh-100 bg-light">
                <div className="row">
                    <main className="col-md-10 ms-sm-auto px-4 py-4 mx-auto">
                        <LoadingSpinner message="Loading dashboard data..." />
                    </main>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid min-vh-100 bg-light">
                <div className="row">
                    <main className="col-md-10 ms-sm-auto px-4 py-4 mx-auto d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
                        <div className="card shadow-sm border-0 p-4 text-center mx-auto" style={{ maxWidth: 420 }}>
                            <div className="icon-circle icon-balance mx-auto mb-3" style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <WalletIcon />
                            </div>
                            <h2 className="h5 fw-bold mb-2">No accounts linked</h2>
                            <div className="text-muted mb-3">{(error === 'Could not fetch income' || error === 'Could not fetch balance' || error === 'Could not fetch transactions' || error === 'Network error') ? (
                                <>You haven’t linked a bank account yet or your session expired.<br />Link a bank account to get started.</>
                            ) : error}</div>
                            <button
                                className="btn btn-warning fw-bold px-4 mb-2"
                                onClick={handleLinkBank}
                                disabled={window.__linkBankLoading}
                            >
                                Link Bank Account
                            </button>
                            <div className="small text-secondary mt-2">Securely powered by TrueLayer. Your credentials are never shared.</div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // Only show the 'No accounts linked' card if not loading and not error
    if (!loading && !error && (!accounts || accounts.length === 0)) {
        return (
            <div className="container-fluid min-vh-100 bg-light">
                <div className="row">
                    <main className="col-md-10 ms-sm-auto px-4 py-4 mx-auto d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
                        <div className="card shadow-sm border-0 p-4 text-center mx-auto" style={{ maxWidth: 420 }}>
                            <div className="icon-circle icon-balance mx-auto mb-3" style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <WalletIcon />
                            </div>
                            <h2 className="h5 fw-bold mb-2">No accounts linked</h2>
                            <div className="text-muted mb-3">You haven’t linked a bank account yet.<br />Link a bank account to get started.</div>
                            <button
                                className="btn btn-warning fw-bold px-4 mb-2"
                                onClick={handleLinkBank}
                                disabled={window.__linkBankLoading}
                            >
                                Link Bank Account
                            </button>
                            <div className="small text-secondary mt-2">Securely powered by TrueLayer. Your credentials are never shared.</div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // ResponsiveNav always rendered, but sidebar only visible at xxl and above
    return (
        <div className="container-fluid min-vh-100">
            <ResponsiveNav navigate={navigate} handleLogout={handleLogout} />
            <div className="row">
                {/* Sidebar using React Pro Sidebar, visible only at xxl and above */}
                <div className="col-xxl-2 d-none d-xxl-block px-0 custom-sidebar">
                    <SidebarContent onNavigate={navigate} onLogout={handleLogout} />
                </div>
                {/* Main Content using Bootstrap grid */}
                <main className="col-12 col-xxl-10 ms-auto px-4 py-4">
                    {/* Topbar */}
                    <div className="d-flex justify-content-center align-items-center mb-4">
                        <div>
                            <h1 className="h3">Dashboard</h1>
                            <p className="text-muted">Welcome back! Here’s your financial overview of your linked bank accounts.</p>
                        </div>
                    </div>

                    {/* Link Bank Account card */}
                    <div className="dashboard-link-bank-card card shadow-sm border-0 p-2 text-center mb-4">
                        <div className="icon-circle icon-balance mb-2 mx-auto">
                            <WalletIcon style={{ width: 20, height: 20 }} />
                        </div>
                        <div className="fw-semibold mb-1" style={{ fontSize: '0.98em' }}>Link a bank account</div>
                        <button
                            className="btn btn-warning fw-bold px-2 py-1 mb-1"
                            style={{ fontSize: '0.93em', borderRadius: 5 }}
                            onClick={handleLinkBank}
                            disabled={window.__linkBankLoading}
                        >
                            Link Bank Account
                        </button>
                        <div className="small text-secondary mt-1">Securely powered by TrueLayer.</div>
                    </div>

                    {/* Cards */}
                    <div className="row mb-4 dashboard-cards-row">
                        {cards.map((card, idx) => (
                            <div key={card.key} className="col-12 col-sm-6 col-lg-3 mb-3">
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

                    {/* Monthly Income & Outgoings Chart on top */}
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


                    {/* Recent Transactions Table */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <h2 className="h6 mb-0">Recent Transactions</h2>
                        </div>
                        <div className="p-3">
                            {/* Desktop Table */}
                            <div className="d-none d-md-block">
                                {transactions.length === 0 ? (
                                    <div className="text-center text-muted py-4">No transactions found.</div>
                                ) : (
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
                                                {transactions.slice(0, 10).map((tx, idx) => (
                                                    <tr key={tx.transaction_id || idx}>
                                                        <td>{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</td>
                                                        <td className="fw-bold">{tx.description || tx.merchant_name || 'N/A'}</td>
                                                        <td>{tx.merchant_name || ''}</td>
                                                        <td>{tx.transaction_category ? tx.transaction_category.replace(/_/g, ' ') : 'N/A'}</td>
                                                        <td>{tx.amount > 0 ? 'Income' : 'Outgoing'}</td>
                                                        <td className={tx.amount > 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            {/* Mobile Cards */}
                            <TransactionListMobile transactions={transactions.slice(0, 10)} />
                        </div>
                    </div>

                </main>
            </div>
            <BottomNav onLogout={handleLogout} navigate={navigate} />
        </div>
    );
}

export default Dashboard;