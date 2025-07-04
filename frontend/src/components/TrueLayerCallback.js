
// This component handles the OAuth redirect from TrueLayer.
// TrueLayer should redirect to /truelayer-callback?code=... on the frontend.
// The code is extracted and sent to the backend with the user's JWT in the Authorization header.
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';


/* State and navigation hooks for loading, error handling, and routing in the TrueLayer callback flow */
function TrueLayerCallback() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const didRun = useRef(false); // Use useRef to persist across renders

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const token = localStorage.getItem('token');
        const codeVerifier = localStorage.getItem('codeVerifier');

        if (!code || !token || !codeVerifier) {
            setError('Missing code, token, or codeVerifier.');
            setLoading(false);
            return;
        }

        // Calls the backend to complete the bank linking process, handles success and error states
        const fetchData = async () => {
            if (didRun.current) return; // Only run once
            didRun.current = true;
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/banks/callback?code=${code}&codeVerifier=${encodeURIComponent(codeVerifier)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    localStorage.removeItem('codeVerifier');
                    setLoading(false);
                    navigate('/dashboard');
                } else {
                    setError('Failed to link bank account.');
                    setLoading(false);
                }
            } catch (err) {
                setError('An error occurred.');
                setLoading(false);
            }
        };
        fetchData();

    }, []); // Only run on mount

    if (loading) {
        return <LoadingSpinner message="Linking your bank account..." />;
    }

    if (error) {
        return <div className="alert alert-danger text-center my-5" role="alert">{error}</div>;
    }

    return <div className="alert alert-success text-center my-5">Bank account linked successfully!</div>;
}

export default TrueLayerCallback;