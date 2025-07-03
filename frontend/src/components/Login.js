import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import LoadingSpinner from './LoadingSpinner';

function Login({ onShowForgotPassword, onShowRegister }) {
    /* State variables for login form fields, error/loading status, and navigation */
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    /* Handles login form submission, authenticates user, and navigates to dashboard on success */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(typeof data.error === 'string' ? data.error : 'Login failed');
            } else {
                setError('');
                localStorage.setItem('token', data.token);
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        if (onShowForgotPassword) onShowForgotPassword();
    };

    const handleRegister = () => {
        if (onShowRegister) onShowRegister();
    };

    return (
        <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
            {loading && <LoadingSpinner message="Logging in..." />}
            <form className={`login-form card shadow-sm p-4 border-0 bg-white ${loading ? 'login-form-disabled' : ''}`} onSubmit={handleSubmit} aria-label="Login form">
                <h2 className="mb-3 text-center fw-bold" style={{ color: '#00C896' }}>Login</h2>
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
                        autoFocus
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password</label>
                    <input
                        id="password"
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-accent w-100" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                <button
                    type="button"
                    className="btn btn-outline-accent w-100 mt-2"
                    onClick={handleForgotPassword}
                >
                    Forgot Password?
                </button>
                <button
                    type="button"
                    className="btn btn-outline-accent w-100 mt-2"
                    onClick={handleRegister}
                >
                    Register
                </button>
            </form>
        </div>
    );
}

export default Login;




