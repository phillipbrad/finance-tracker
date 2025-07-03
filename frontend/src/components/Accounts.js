import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import LoadingSpinner from './LoadingSpinner';
import BottomNav from './BottomNav';
import ResponsiveNav from './ResponsiveNav';
import { SidebarContent } from './ResponsiveNav';

const Accounts = ({ handleConsentError }) => {
    /* State variables for account data, loading status, and error handling */
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();


    /* Logs the user out by removing the token and redirecting to the homepage */
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    useEffect(() => {
        setLoading(true);

        /* Fetches account balances from the backend API, handles authentication errors, and updates state accordingly. */
        const fetchAccounts = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/banks/balances', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (res.status === 401 || res.status === 403) {
                    // Token/consent error: show global modal
                    if (handleConsentError) handleConsentError();
                    return;
                }
                const data = await res.json();
                if (Array.isArray(data.balances)) {
                    setAccounts(data.balances);
                } else {
                    setError('Could not fetch accounts');
                }
            } catch (error) {
                setError('Network error');
                if (handleConsentError) handleConsentError();
            } finally {
                setLoading(false);
            }
        };
        fetchAccounts();
    }, [handleConsentError]);

    if (loading) {
        return <LoadingSpinner message="Loading accounts..." />;
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

                {/* Main Content */}
                <main className="col-12 col-xxl-10 ms-auto px-4 py-4">
                    {/* Topbar */}
                    <div className="d-flex justify-content-center align-items-center mb-4 text-center">
                        <div>
                            <h1 className="h3">Accounts</h1>
                            <p className="text-muted">All your linked bank accounts in one place.</p>
                        </div>
                    </div>

                    <div>
                        {accounts.length === 0 ? (
                            <div className="alert alert-warning">No accounts found or unable to fetch accounts.</div>
                        ) : (
                            <div className="row">
                                {accounts.map(account => (
                                    <div className="col-12 col-md-6 col-lg-4 mb-4" key={account.account_id}>
                                        <Link to={`/accounts/${account.account_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div className="card account-card h-100 shadow-sm border-0 p-3 ">
                                                <div className="d-flex align-items-center mb-3 gap-3">
                                                    <div className="icon-circle d-flex align-items-center justify-content-center">
                                                        <img
                                                            src={account.provider?.logo_uri || '/logo192.png'}
                                                            alt={account.provider?.display_name || 'Bank Logo'}
                                                            className="account-logo-img"
                                                            onError={e => { e.target.onerror = null; e.target.src = '/logo192.png'; }}
                                                        />
                                                    </div>
                                                    <div className="flex-grow-1 text-start">
                                                        <div className="fw-bold" style={{ fontSize: '1.13em' }}>{account.display_name}</div>
                                                        <div className="text-muted small">{account.account_type} • {account.currency}</div>
                                                        <div className="text-muted small">{account.provider?.display_name}</div>
                                                    </div>
                                                </div>
                                                <div className="mb-2 text-start">
                                                    <span className="fw-semibold">Account Number:</span> {account.account_number?.number || 'N/A'}<br />
                                                    <span className="fw-semibold">Sort Code:</span> {account.account_number?.sort_code || 'N/A'}
                                                </div>
                                                <div className="mb-2 text-start">
                                                    <span className="fw-semibold">Balance:</span> <span className="h5 fw-bold text-success">{typeof account.balance?.available === 'number' ? account.balance.available.toLocaleString('en-GB', { style: 'currency', currency: account.currency || 'GBP' }) : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </main>
            </div>
            <BottomNav onLogout={handleLogout} navigate={navigate} />
        </div>
    );
}

export default Accounts;

