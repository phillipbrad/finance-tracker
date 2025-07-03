import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

function ForgotPassword({ onBack }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState('');
    const [info, setInfo] = useState('');


    /* Handles forgot password form submission, sends reset request, and shows a generic info message. */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setInfo('');
        try {
            await fetch('/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            // Always show generic message regardless of response for security.
            setInfo('If that email exists, a reset link has been sent.');
            setError('');
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    /* Renders the forgot password form UI, including loading spinner, info/error messages, and navigation back to login. */
    return (
        <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
            {loading && <LoadingSpinner message="Sending reset link..." />}
            <form className={`login-form card shadow-sm p-4 border-0 bg-white ${loading ? 'login-form-disabled' : ''}`} onSubmit={handleSubmit} aria-label="Forgot password form">
                <h2 className="mb-4 text-center fw-bold" style={{ color: '#00C896' }}>Forgot Password</h2>
                {info && <div className="alert alert-info" role="alert">{info}</div>}
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                        id="email"
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-accent w-100" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                    type="button"
                    className="btn btn-outline-accent w-100 mt-2"
                    onClick={onBack}
                >
                    Back to Login
                </button>
            </form>
        </div>
    )
}

export default ForgotPassword;