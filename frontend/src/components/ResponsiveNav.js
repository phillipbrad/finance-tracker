import React, { useState, useEffect } from 'react';
import { Sidebar, Menu, MenuItem } from 'react-pro-sidebar';
import { IoIosHome } from "react-icons/io";
import { FaUniversity, FaRegFileAlt } from 'react-icons/fa';
import { FiLogOut, FiRepeat } from 'react-icons/fi';
import BottomNav from './BottomNav';

// Sidebar content as a separate component for reuse
const SidebarContent = ({ onNavigate, onLogout }) => (
    <Sidebar>
        <Menu>
            <MenuItem icon={<IoIosHome color="#00C896" />} onClick={() => { onNavigate('/dashboard'); }}>Dashboard</MenuItem>
            <MenuItem icon={<FaUniversity color="#00C896" />} onClick={() => { onNavigate('/accounts'); }}>Accounts</MenuItem>
            <MenuItem icon={<FaRegFileAlt color="#00C896" />} onClick={() => { onNavigate('/transactions'); }}>Transactions</MenuItem>
            <MenuItem icon={<FiRepeat color="#00C896" />} onClick={() => { onNavigate('/regular-payments'); }}>Regular Payments</MenuItem>
            <MenuItem icon={<FiLogOut color="#00C896" />} onClick={onLogout}>Log out</MenuItem>
        </Menu>
    </Sidebar>
);

// Props: navigate, handleLogout
const ResponsiveNav = ({ navigate, handleLogout }) => {
    const [offcanvasOpen, setOffcanvasOpen] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // BottomNav for <768px
    if (windowWidth < 768) {
        return <BottomNav onLogout={handleLogout} navigate={navigate} />;
    }

    // Hamburger/Offcanvas for 768px–1399px
    if (windowWidth >= 768 && windowWidth < 1400) {
        // Handler to close offcanvas and navigate
        const handleNav = (path) => {
            setOffcanvasOpen(false);
            navigate(path);
        };
        // Handler to close offcanvas and logout
        const handleLogoutAndClose = () => {
            setOffcanvasOpen(false);
            handleLogout();
        };
        return (
            <>
                {/* Hamburger and offcanvas visible below xxl (1400px) */}
                <button
                    className="position-fixed top-0 start-0 m-3 z-3 responsive-hamburger"
                    aria-label="Open navigation menu"
                    onClick={() => setOffcanvasOpen(true)}
                >
                    {/* Custom green hamburger icon */}
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect y="6" width="28" height="3.2" rx="1.6" fill="#00C896" />
                        <rect y="12.4" width="28" height="3.2" rx="1.6" fill="#00C896" />
                        <rect y="18.8" width="28" height="3.2" rx="1.6" fill="#00C896" />
                    </svg>
                </button>
                {offcanvasOpen && (
                    <>
                        <div
                            className={`offcanvas-custom show`}
                            tabIndex="-1"
                            aria-modal="true"
                            role="dialog"
                        >
                            <div className="d-flex justify-content-end p-2">
                                <button className="btn-close" aria-label="Close" onClick={() => setOffcanvasOpen(false)}></button>
                            </div>
                            <SidebarContent onNavigate={handleNav} onLogout={handleLogoutAndClose} />
                        </div>
                        <div
                            className="offcanvas-backdrop fade show"
                            onClick={() => setOffcanvasOpen(false)}
                        />
                    </>
                )}
            </>
        );
    }

    // No nav here; sidebar is rendered in main layout for >=1400px
    return null;
};

export default ResponsiveNav;
export { SidebarContent };
