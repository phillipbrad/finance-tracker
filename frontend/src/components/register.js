
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

function RegisterUser({ onBack, onRegisterSuccess }) {
    /* State variables for registration form fields, error/loading status, and navigation */
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [errorList, setErrorList] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    /* Handles registration form submission, validates input, and registers user via API */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setErrorList([]);
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setErrorList([]);
            setLoading(false);
            return;
        }
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!response.ok) {
                const data = await response.json();
                if (data.errors && Array.isArray(data.errors)) {
                    setError('');
                    setErrorList(data.errors.map(e => e.msg));
                } else if (typeof data.error === 'string') {
                    setError(data.error);
                    setErrorList([]);
                } else {
                    setError('Registration failed');
                    setErrorList([]);
                }
            } else {
                setError('');
                setErrorList([]);
                alert('Successfully registered!');
                if (onRegisterSuccess) onRegisterSuccess();
                navigate('/'); // Redirect to login after registration
            }
        } catch (err) {
            setError('Network error');
            setErrorList([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
            {loading && <LoadingSpinner message="Registering..." overlay />}
            <form className={`login-form card shadow-sm p-4 border-0 bg-white ${loading ? 'login-form-disabled' : ''}`} onSubmit={handleSubmit} aria-label="Register form">
                <h2 className="mb-4 text-center fw-bold" style={{ color: '#00C896' }}>Register</h2>
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                {errorList.length > 0 && (
                    <div className="alert alert-danger" role="alert">
                        <ul className="mb-0 ps-3">
                            {errorList.map((msg, idx) => <li key={idx}>{msg}</li>)}
                        </ul>
                    </div>
                )}
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
                <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        className="form-control"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-accent w-100" disabled={loading}>
                    {loading ? 'Registering...' : 'Register'}
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
    );
}

export default RegisterUser;