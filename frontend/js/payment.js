/**
 * Compensation Refund & Payment Processing Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    if (path.includes('payment/checkout.html')) {
        await initCheckoutPage();
    } else if (path.includes('payment/payment-status.html')) {
        await initPaymentStatusPage();
    }
});

async function initCheckoutPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');

    if (!ticketId) {
        showToast('No ticket associated with checkout', 'error');
        return;
    }

    const complaint = await window.api.getComplaintById(ticketId);
    if (!complaint) {
        showToast('Ticket not found', 'error');
        return;
    }

    // Bind UI details
    document.getElementById('checkoutTicketId').textContent = complaint.id;
    document.getElementById('checkoutSubject').textContent = complaint.subject;
    document.getElementById('checkoutRefundAmount').textContent = `$${(complaint.refundAmount || 49.99).toFixed(2)}`;

    // Payment Form Handler
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const cardNumber = document.getElementById('cardNumberInput').value.trim();
            const cardExpiry = document.getElementById('cardExpiryInput').value.trim();
            const cardCvc = document.getElementById('cardCvcInput').value.trim();
            const cardName = document.getElementById('cardNameInput').value.trim();

            if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
                showToast('Please enter complete payout card details.', 'error');
                return;
            }

            const btnSubmit = paymentForm.querySelector('button[type="submit"]');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing Secure Refund...`;
            }

            try {
                const receipt = await window.api.processPayout(ticketId, complaint.refundAmount || 49.99, {
                    cardNumber,
                    cardName
                });

                showToast('Refund payout processed successfully!', 'success');
                setTimeout(() => {
                    window.location.href = `/frontend/payment/payment-status.html?txn=${receipt.transactionId}&amount=${receipt.amount}&ticket=${ticketId}`;
                }, 1500);
            } catch (err) {
                showToast('Refund payout failed: ' + err.message, 'error');
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `Process Refund Payout`;
                }
            }
        });
    }
}

async function initPaymentStatusPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const txn = urlParams.get('txn');
    const amount = urlParams.get('amount');
    const ticket = urlParams.get('ticket');

    const elTxn = document.getElementById('statusTxnId');
    const elAmount = document.getElementById('statusAmount');
    const elTicket = document.getElementById('statusTicketId');
    const elTime = document.getElementById('statusTimestamp');

    if (elTxn) elTxn.textContent = txn || 'TXN-884920';
    if (elAmount) elAmount.textContent = `$${parseFloat(amount || 49.99).toFixed(2)}`;
    if (elTicket) elTicket.textContent = ticket || 'TICK-9082';
    if (elTime) elTime.textContent = new Date().toLocaleString();
}
