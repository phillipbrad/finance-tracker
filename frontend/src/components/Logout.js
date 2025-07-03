import React from 'react';

/* Button component for logging the user out when clicked */
const Logout = ({ onLogout }) => (
    <button className="btn btn-outline-danger" onClick={onLogout}>
        Logout
    </button>
);

export default Logout;