import React from 'react';

const LoadingSpinner = ({ className = '', style = {}, message = 'Loading...' }) => (
    <div className={`d-flex flex-column align-items-center justify-content-center py-4 ${className}`} style={style}>
        <div className="spinner-border emerald-spinner" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
        </div>
        {message && <div className="mt-2 text-muted">{message}</div>}
    </div>
);

export default LoadingSpinner;
