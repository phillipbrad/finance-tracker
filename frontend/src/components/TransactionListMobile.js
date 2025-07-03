import React, { useEffect, useRef } from "react";

/* transaction list for smaller viewports */
const TransactionListMobile = ({ transactions, setVisibleCount, hasMore, loadingMore }) => {
    const loadTriggerRef = useRef(null);

    // Infinite scroll: observe the load trigger at the bottom of the list
    useEffect(() => {
        if (!hasMore) return;
        const observer = new window.IntersectionObserver(entries => {
            const target = entries[0];
            // If the trigger is visible and more transactions exist, load more
            if (target.isIntersecting && hasMore) {
                setVisibleCount(prev => prev + 25);
            }
        });
        const trigger = loadTriggerRef.current;
        if (trigger) observer.observe(trigger);
        return () => observer.disconnect();
    }, [hasMore, setVisibleCount]);

    return (
        <div className="d-block d-md-none">
            {transactions.length === 0 && (
                <div className="text-center text-muted py-4">No transactions found.</div>
            )}
            {/* Render each transaction as a card */}
            {transactions.map((tx, idx) => (
                <div key={tx.transaction_id || idx} className="card mb-2 shadow-sm border-0">
                    <div className="card-body py-2 px-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <div className="fw-bold">{tx.description || tx.merchant_name || 'N/A'}</div>
                                <div className="small text-muted">{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown Date'}</div>
                                <div className="small text-secondary">{tx.transaction_category ? tx.transaction_category.replace(/_/g, ' ') : 'N/A'}</div>
                            </div>
                            <div className={tx.amount > 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {/* Infinite scroll trigger and loading message for mobile */}
            {hasMore && (
                <div ref={loadTriggerRef} className="text-center py-3 text-muted" id="mobile-tx-load-trigger">
                    {loadingMore ? 'Loading more transactions...' : ''}
                </div>
            )}
        </div>
    );
};

export default TransactionListMobile;