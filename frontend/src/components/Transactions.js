import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import ResponsiveNav, { SidebarContent } from './ResponsiveNav';
import BottomNav from './BottomNav';
import TransactionListMobile from "./TransactionListMobile";
import '../App.css';


const Transactions = ({ handleConsentError }) => {
    /* State variables for transactions data, filters, UI controls, and navigation */
    const [transactions, setTransactions] = useState([]);
    const [error, setError] = useState('');
    const [visibleCount, setVisibleCount] = useState(25);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [filterType, setFilterType] = useState('ALL');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterMonth, setFilterMonth] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sort, setSort] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();


    /* Fetch transactions from the backend API on mount and handle errors or consent issues. */
    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${process.env.REACT_APP_API_URL}/banks/transactions`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    if (handleConsentError) handleConsentError();
                    return;
                }
                const data = await res.json();
                if (res.ok && Array.isArray(data.results)) {
                    setTransactions(data.results);
                } else {
                    setError('Could not fetch transactions');
                }
            } catch (err) {
                if (handleConsentError) handleConsentError();
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, [handleConsentError]);

    /* Logs the user out by removing the token and redirecting to the homepage */
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };


    /* Implements infinite scroll to load more transactions when the user reaches the bottom of the list. */
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            const target = entries[0];
            if (target.isIntersecting && visibleCount < transactions.length) {
                setVisibleCount(prev => prev + 25); // load next 25
            }
        });

        const trigger = document.getElementById('load-trigger');
        if (trigger) observer.observe(trigger);

        return () => observer.disconnect(); // cleanup
    }, [transactions, visibleCount]);

    /* Back to top button logic */
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

    // Get unique categories from transactions
    const categories = Array.from(new Set(transactions.map(tx => tx.transaction_category).filter(Boolean)));
    // Get unique months (YYYY-MM) from transactions
    const months = Array.from(new Set(transactions.map(tx => tx.timestamp ? new Date(tx.timestamp).toISOString().slice(0, 7) : null).filter(Boolean)));

    /* Filtering logic */
    const filteredTransactions = transactions.filter(tx => {
        // Type filter
        if (filterType === 'income' && tx.amount <= 0) return false;
        if (filterType === 'outgoing' && tx.amount > 0) return false;
        // Category filter
        if (filterCategory !== 'ALL' && tx.transaction_category !== filterCategory) return false;
        // Month filter
        if (filterMonth !== 'ALL') {
            const txMonth = tx.timestamp ? new Date(tx.timestamp).toISOString().slice(0, 7) : '';
            if (txMonth !== filterMonth) return false;
        }
        return true;
    });


    // Apply search after filters
    const searchedTransactions = filteredTransactions.filter(tx =>
        (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.merchant_name && tx.merchant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.amount && tx.amount.toString().includes(searchTerm))
    );


    const sortedTransactions = sort === "asc"
        ? [...searchedTransactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        : [...searchedTransactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));


    if (loading) {
        return <LoadingSpinner message="Loading transactions..." />;
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
                            <h1 className="h3">Transactions</h1>
                            <p className="text-muted">View and search all your transactions.</p>
                        </div>
                    </div>



                    {/* Transactions Card Layout */}
                    <div className="card">
                        <div className="card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                            <h2 className="h6 mb-0">Transactions</h2>
                            {/* Search Filter Bar */}
                            <div className="d-flex flex-wrap gap-2 align-items-center mt-2 mt-md-0">
                                <input type="text" className="form-control me-2 transactions-search-bar" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                {/* Sort by filter*/}
                                <select className="form-select form-select-sm transactions-sort-select" placeholder="Descending" value={sort} onChange={e => setSort(e.target.value)}>
                                    <option value={"desc"}>Newest first</option>
                                    <option value={"asc"}>Oldest first</option>
                                </select>
                                {/* Type Filter */}
                                <select className="form-select form-select-sm transactions-type-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                    <option value="ALL">All</option>
                                    <option value="income">Income</option>
                                    <option value="outgoing">Outgoing</option>
                                </select>
                                {/* Category Filter */}
                                <select className="form-select form-select-sm transactions-category-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                    <option value="ALL">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                                {/* Month Filter */}
                                <select className="form-select form-select-sm transactions-month-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                    <option value="ALL">All Months</option>
                                    {months.map(month => (
                                        <option key={month} value={month}>{month}</option>
                                    ))}
                                </select>
                                {/* Reset Button */}
                                <button className="btn btn-sm btn-outline-secondary transactions-reset-btn" onClick={() => { setFilterType('ALL'); setFilterCategory('ALL'); setFilterMonth('ALL'); setSort('desc') }}>Reset</button>
                            </div>
                        </div>
                        <div className="p-3">
                            {/* Active Filter Chips */}
                            <div className="mb-3 d-flex flex-wrap gap-2">
                                {filterType !== 'ALL' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Type: {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                                        <button type="button" className="btn-close btn-close-white ms-2" aria-label="Remove" style={{ fontSize: '0.7em' }} onClick={() => setFilterType('ALL')}></button>
                                    </span>
                                )}
                                {filterCategory !== 'ALL' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Category: {filterCategory.replace(/_/g, ' ')}
                                        <button type="button" className="btn-close btn-close-white ms-2" aria-label="Remove" style={{ fontSize: '0.7em' }} onClick={() => setFilterCategory('ALL')}></button>
                                    </span>
                                )}
                                {filterMonth !== 'ALL' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Month: {filterMonth}
                                        <button type="button" className="btn-close btn-close-white ms-2" aria-label="Remove" style={{ fontSize: '0.7em' }} onClick={() => setFilterMonth('ALL')}></button>
                                    </span>
                                )}
                                {searchTerm && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Search: {searchTerm}
                                        <button type="button" className="btn-close btn-close-white ms-2" aria-label="Remove" style={{ fontSize: '0.7em' }} onClick={() => setSearchTerm('')}></button>
                                    </span>
                                )}
                                {sort === 'asc' && (
                                    <span className="badge rounded-pill d-flex align-items-center">
                                        Sort: Oldest first
                                        <button type="button" className="btn-close btn-close-white ms-2" aria-label="Remove" style={{ fontSize: '0.7em' }} onClick={() => setSort('desc')}></button>
                                    </span>
                                )}
                            </div>
                            {filteredTransactions.length === 0 ? (
                                <div className="text-center text-muted py-4">No transactions found.</div>
                            ) : (
                                <>
                                    <div className="d-none d-md-block ">

                                        <div className="table-responsive">
                                            <table className="table custom-table align-middle">
                                                <thead className="table-dark">
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
                                                                <td className="fw-bold">{tx.description || 'N/A'}</td>
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
                                    </div>
                                    <TransactionListMobile transactions={sortedTransactions.slice(0, visibleCount)} />
                                </>
                            )}
                        </div>
                    </div>
                    {visibleCount < transactions.length && (
                        <div className="text-center py-3 text-muted" id="load-trigger">
                            Loading more transactions...
                        </div>
                    )}
                </main>
            </div>
            {/* Back to Top Button */}
            {
                showBackToTop && (
                    <button
                        onClick={scrollToTop}
                        className="back-to-top-btn"
                        aria-label="Back to top"
                        title="Back to top"
                    >
                        ↑
                    </button>
                )
            }
            <BottomNav onLogout={handleLogout} navigate={navigate} />

        </div >
    );
};

export default Transactions;