import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Login from './components/Login';
import RegisterUser from './components/register';
import ForgotPassword from './components/ForgotPassword';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PasswordReset from './components/PasswordReset';
import Dashboard from './components/Dashboard';
import TrueLayerCallback from './components/TrueLayerCallback';
import Transactions from './components/Transactions';
import Accounts from './components/Accounts';
import AccountDetails from './components/AccountDetails';
import RegularPayments from './components/RegularPayments';
import LinkBankAccountModal from './components/LinkBankAccountModal';

const ReconfirmConsentModal = ({ show, onClose, onExtend }) => {
  if (!show) return null;
  return (
    <div className="modal fade show custom-modal-backdrop" tabIndex="-1" aria-modal="true" role="dialog">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content text-center">
          <div className="modal-header">
            <h5 className="modal-title">Reconfirm Consent</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p>To keep your bank connection active, please reconfirm your consent to share your data.</p>
          </div>
          <div className="modal-footer justify-content-center">
            <button className="btn btn-success fw-bold" onClick={async () => {
              await onExtend();
            }}>
              Yes, I agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showReconfirmModal, setShowReconfirmModal] = useState(false);

  // Handler to trigger modal from anywhere
  const handleConsentError = () => setShowReconfirmModal(true);

  // Handler to extend connection
  const handleExtendConnection = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.REACT_APP_API_URL}/banks/extend-connection`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_has_reconfirmed_consent: true })
    });
    if (res.ok) {
      setShowReconfirmModal(false);
      window.location.reload();
      return;
    }
    // If extend fails, fallback to link
    setShowReconfirmModal(false);
    setShowLinkModal(true);
  };

  // Handler to start linking flow (fallback)
  const handleLinkBank = async () => {
    if (window.__linkBankLoading) return; // Prevent double call
    window.__linkBankLoading = true;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/banks/link`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        alert('Your session has expired. Please log in again to link your bank account.');
        window.location.href = '/';
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      window.__linkBankLoading = false;
    }
  };


  return (
    <>
      <Router>
        <Routes>
          <Route path="/accounts" element={<Accounts handleConsentError={handleConsentError} />} />
          <Route path="/accounts/:accountId" element={<AccountDetails handleConsentError={handleConsentError} />} />
          <Route path="/transactions" element={<Transactions handleConsentError={handleConsentError} />} />
          <Route path="/reset-password" element={<PasswordReset />} />
          <Route path="/dashboard" element={<Dashboard handleConsentError={handleConsentError} />} />
          <Route path="/banks/callback" element={<TrueLayerCallback />} />
          <Route path="/regular-payments" element={<RegularPayments handleConsentError={handleConsentError} />} />
          <Route path="/" element={
            <div>
              {showForgotPassword ? (
                <ForgotPassword onBack={() => setShowForgotPassword(false)} />
              ) : (
                <>
                  {showLogin ? (
                    <Login
                      onShowForgotPassword={() => setShowForgotPassword(true)}
                      onShowRegister={() => setShowLogin(false)}
                    />
                  ) : (
                    <RegisterUser onBack={() => setShowLogin(true)} />
                  )}
                </>
              )}
            </div>
          } />
        </Routes>
        <ReconfirmConsentModal
          show={showReconfirmModal}
          onClose={() => setShowReconfirmModal(false)}
          onExtend={handleExtendConnection}
        />
        <LinkBankAccountModal
          show={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          onLink={handleLinkBank}
        />
      </Router>

    </>
  );
}

export default App;
