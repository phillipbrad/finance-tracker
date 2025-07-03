import React from "react";
import { IoIosHome } from "react-icons/io";
import { FaUniversity, FaRegFileAlt, } from 'react-icons/fa';
import { FiLogOut, FiRepeat } from 'react-icons/fi';


/* Renders the bottom nav for smaller devices */
const BottomNav = ({ onLogout, navigate }) => {
    return (
        <nav className="bottom-nav d-md-none">
            <button onClick={() => navigate('/dashboard')}><IoIosHome color="#00C896" /></button>
            <button onClick={() => navigate('/accounts')}><FaUniversity color="#00C896" /></button>
            <button onClick={() => navigate('/transactions')}><FaRegFileAlt color="#00C896" /></button>
            <button onClick={() => navigate('/regular-payments')}><FiRepeat color="#00C896" /></button>
            <button onClick={onLogout}><FiLogOut color="#00C896" /></button>
        </nav>
    )
};

export default BottomNav;