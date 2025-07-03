import React from 'react';


/* Modal component for prompting the user to re-link their bank account when required.Modal component for prompting the user to re-link their bank account when required. */
const LinkBankAccountModal = ({ show, onClose, onLink }) => {
    if (!show) return null;
    // Handler to close modal when clicking the backdrop
    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('modal')) {
            onClose();
        }
    };
    return (
        <div
            className="modal fade show custom-modal-backdrop"
            tabIndex="-1"
            aria-modal="true"
            role="dialog"
            onClick={handleBackdropClick}
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content text-center">
                    <div className="modal-header">
                        <h5 className="modal-title">Re-link Bank Account</h5>
                        <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <p>Your bank connection has expired or is missing.<br />Please re-link your bank account to continue.</p>
                    </div>
                    <div className="modal-footer justify-content-center">
                        <button className="btn btn-warning fw-bold" onClick={onLink} disabled={window.__linkBankLoading}>
                            Link Bank Account
                        </button>
                    </div>
                    <div className="small text-secondary mb-2">Securely powered by TrueLayer.</div>
                </div>
            </div>
        </div>
    );
};

export default LinkBankAccountModal;