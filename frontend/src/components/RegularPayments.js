import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { SidebarContent } from './ResponsiveNav';
import BottomNav from "./BottomNav";
import TransactionListMobile from "./TransactionListMobile";
import ResponsiveNav from './ResponsiveNav';

const RegularPayments = ({ handleConsentError }) => {
    /* State variables for transactions, filters, sorting, loading, and navigation */
    const [transactions, setTransactions] = useState([]);
    const [error, setError] = useState('');
    const [visibleCount, setVisibleCount] = useState(25);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [filterMonth, setFilterMonth] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();


    /* Fetch regular payment transactions from the API on mount. Handle loading, errors, and session expiry */
    useEffect(() => {
        setLoading(true);
        const fetchTransactions = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/banks/transactions', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    if (handleConsentError) handleConsentError();
                    return;
                }
                const data = await res.json();
                if (res.ok && Array.isArray(data.results)) {
                    // Include direct debits, bill payments, and VRP/recurring payments
                    const regulars = data.results.filter(tx =>
                        tx.transaction_category === "DIRECT_DEBIT" ||
                        tx.transaction_category === "BILL_PAYMENT" ||
                        (tx.vrp_id || (tx.description && /vrp|variable recurring/i.test(tx.description)))
                    );
                    setTransactions(regulars);
                } else {
                    setError('Could not fetch transactions. Please try again later.');
                }
            } catch (err) {
                if (handleConsentError) handleConsentError();
                setError('Network error. Please check your connection and try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [handleConsentError]);


    /* Infinite scroll: load more transactions when the load trigger enters the viewport */
    useEffect(() => {
        const observer = new window.IntersectionObserver(entries => {
            const target = entries[0];
            if (target.isIntersecting && visibleCount < transactions.length) {
                setVisibleCount(prev => prev + 25);
            }
        });
        const trigger = document.getElementById('regular-payments-load-trigger');
        if (trigger) observer.observe(trigger);
        return () => observer.disconnect();
    }, [transactions, visibleCount]);


    /* Adds a scroll listener to toggle a "Back to Top" button after scrolling 200px, and defines smooth scroll behavior to top */
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


    /* Logs the user out by removing the token and redirecting to the homepage */
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };



    /* Create an empty object to store unique months with their corresponding start-of-month timestamp */
    const monthMap = {};
    transactions.forEach(tx => {
        if (!tx.timestamp) return;
        const date = new Date(tx.timestamp); //convert timestamp to js date object 
        const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Create string label yyyy-mm
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();  // Get the Unix timestamp for the first day of that month
        if (!monthMap[label] || monthMap[label] < monthStart) {
            monthMap[label] = monthStart; // Store the timestamp for this month if it's not already in the map
        }
    });

    /* Convert the monthMap into an array of [label, timestamp] objects and sort them by timestamp most recent first */
    const monthOptions = Object.entries(monthMap)
        .map(([label, timestamp]) => ({ label, timestamp }))
        .sort((a, b) => b.timestamp - a.timestamp);

    // Helper function to return the month label from a monthOptions item
    const getMonthLabel = m => m.label; // Display as YYYY-MM



    /* Filtered and sorted transactions:
   Creates a new array called filteredTransactions by filtering and sorting the original transactions
   based on the selected category, month, search input, and sort order */

    const filteredTransactions = transactions
        .filter(tx =>
            (filterCategory === 'ALL' ||
                (filterCategory === 'VRP' && (tx.vrp_id || (tx.description && /vrp|variable recurring/i.test(tx.description)))) ||
                tx.transaction_category === filterCategory
            ) &&
            (filterMonth === 'ALL' || (tx.timestamp && (() => {
                const date = new Date(tx.timestamp);
                const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return monthStr === filterMonth;
            })())) &&
            (searchTerm === '' ||
                (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (tx.merchant_name && tx.merchant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (tx.reference && tx.reference.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        ) // Sort filtered transactions by date 
        .sort((a, b) => sortOrder === 'newest'
            ? new Date(b.timestamp) - new Date(a.timestamp)
            : new Date(a.timestamp) - new Date(b.timestamp)
        );

    if (loading) {
        return <LoadingSpinner message="Loading regular payments..." />;
    }
    if (error) {
        return <div className="alert alert-danger text-center my-5" role="alert">{error}</div>;
    }

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
                    <div className="d-flex justify-content-center align-items-center mb-4 text-center">
                        <div>
                            <h1 className="h3">Regular Payments</h1>
                            <p className="text-muted">Manage your recurring payments and subscriptions.</p>
                        </div>
                    </div>

                    <div className="card regular-payments-card">
                        <div className="card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                            <h2 className="h6 mb-0">Regular Payments</h2>
                            {/* Unified Filter Bar */}
                            <div className="d-flex flex-wrap gap-2 align-items-center mt-2 mt-md-0">
                                <input type="text" className="form-control me-2 transactions-search-bar" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                {/* Sort by filter */}
                                <select className="form-select form-select-sm transactions-sort-select" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                </select>
                                {/* Type Filter */}
                                <select className="form-select form-select-sm transactions-type-filter" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                    <option value="ALL">All</option>
                                    <option value="DIRECT_DEBIT">Direct Debit</option>
                                    <option value="BILL_PAYMENT">Bill Payment</option>
                                    <option value="VRP">Recurring</option>
                                </select>
                                {/* Month Filter */}
                                <select className="form-select form-select-sm transactions-month-filter" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                    <option value="ALL">All Months</option>
                                    {monthOptions.map(m => (
                                        <option key={m.label} value={m.label}>{getMonthLabel(m)}</option>
                                    ))}
                                </select>
                                {/* Reset Button */}
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => { setFilterCategory('ALL'); setFilterMonth('ALL'); setSortOrder('newest'); setSearchTerm(''); }}>
                                    Reset
                                </button>
                            </div>
                        </div>
                        <div className="p-3">
                            {/* Filter Chips */}
                            <div className="mb-3 d-flex flex-wrap gap-2">
                                {filterCategory !== 'ALL' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Type: {filterCategory === 'VRP' ? 'VRP/Recurring' : filterCategory.replace(/_/g, ' ')}
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
                                {sortOrder === 'oldest' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Sort: Oldest first
                                        <button type="button" className="btn-close btn-close-white ms-2 badge-close-btn" aria-label="Remove" onClick={() => setSortOrder('newest')}></button>
                                    </span>
                                )}
                            </div>

                            {/* Table-based Regular Payments Layout */}
                            {filteredTransactions.length === 0 ? (
                                <div className="text-center text-muted py-4">No regular payments found.</div>
                            ) : (
                                <>
                                    <div className="d-none d-md-block">
                                        <div className="table-responsive">
                                            <table className="table custom-table align-middle regular-payments-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Description</th>
                                                        <th>Merchant</th>
                                                        <th>Type</th>
                                                        <th>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredTransactions.slice(0, visibleCount).map((tx, idx) => {
                                                        let typeLabel = tx.transaction_category === 'DIRECT_DEBIT' ? 'Direct Debit' : tx.transaction_category === 'BILL_PAYMENT' ? 'Bill Payment' : (tx.vrp_id || (tx.description && /vrp|variable recurring/i.test(tx.description))) ? 'VRP/Recurring' : tx.transaction_category;
                                                        return (
                                                            <tr key={tx.transaction_id || idx}>
                                                                <td>{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}</td>
                                                                <td className="fw-bold">{tx.description || tx.merchant_name || 'N/A'}</td>
                                                                <td>{tx.merchant_name || ''}</td>
                                                                <td>{typeLabel}</td>
                                                                <td className={tx.amount > 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <TransactionListMobile transactions={filteredTransactions.slice(0, visibleCount)} />
                                </>
                            )}
                        </div>
                    </div>
                    {visibleCount < filteredTransactions.length && (
                        <div className="text-center py-3 text-muted" id="regular-payments-load-trigger">
                            Loading more regular payments...
                        </div>
                    )}
                </main>
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
            <BottomNav onLogout={handleLogout} navigate={navigate} />
        </div>
    );
};

export default RegularPayments;
