import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import LoadingSpinner from './LoadingSpinner';


function PasswordReset() {
    /* State and hooks for password reset form fields, status, and navigation */
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const token = searchParams.get("token");
    const navigate = useNavigate();

    /* Handles password reset form submission, validates input, and updates password via API */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Something went wrong");
                return;
            } else {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/');
                }, 2000);
            }
        } catch (err) {
            setError('Network Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-bg d-flex align-items-center justify-content-center min-vh-100">
            {loading && <LoadingSpinner message="Resetting password..." />}
            <form className={`login-form card shadow-sm p-4 border-0 bg-white ${loading ? 'login-form-disabled' : ''}`} onSubmit={handleSubmit} aria-label="Reset password form">
                <h2 className="mb-4 text-center fw-bold" style={{ color: '#00C896' }}>Reset Password</h2>
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                {success && <div className="alert alert-success" role="alert">Password reset! Redirecting to login...</div>}
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">New Password</label>
                    <input
                        id="password"
                        type="password"
                        className="form-control"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
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
                    {loading ? 'Sending...' : 'Change'}
                </button>
            </form>
        </div>
    )

};

export default PasswordReset;