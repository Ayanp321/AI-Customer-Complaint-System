/**
 * Customer Portal Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Determine which customer view we are on
    const path = window.location.pathname;

    if (path.includes('customer/dashboard.html')) {
        await initCustomerDashboard();
    } else if (path.includes('customer/complaints.html')) {
        await initCustomerComplaintsList();
    } else if (path.includes('customer/complaint-details.html')) {
        await initCustomerComplaintDetails();
    }
});

async function initCustomerDashboard() {
    const user = window.auth.getCurrentUser();
    if (!user) return;

    const complaints = await window.api.getComplaints({ customerId: user.id });

    // Update KPI stats
    const totalCount = complaints.length;
    const pendingCount = complaints.filter(c => c.status === 'Pending').length;
    const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;
    const refundEligibleCount = complaints.filter(c => c.refundStatus === 'Eligible' || c.refundStatus === 'Processed').length;

    const elTotal = document.getElementById('statTotalComplaints');
    const elPending = document.getElementById('statPendingComplaints');
    const elResolved = document.getElementById('statResolvedComplaints');
    const elRefunds = document.getElementById('statRefundsCount');

    if (elTotal) elTotal.textContent = totalCount;
    if (elPending) elPending.textContent = pendingCount;
    if (elResolved) elResolved.textContent = resolvedCount;
    if (elRefunds) elRefunds.textContent = refundEligibleCount;

    // Render Recent Complaints Table
    renderComplaintsTable(complaints.slice(0, 5), 'customerRecentTable');
}

async function initCustomerComplaintsList() {
    const user = window.auth.getCurrentUser();
    if (!user) return;

    const searchInput = document.getElementById('searchComplaintInput');
    const statusFilter = document.getElementById('statusFilterSelect');
    const categoryFilter = document.getElementById('categoryFilterSelect');

    const loadFiltered = async () => {
        const filter = {
            customerId: user.id,
            search: searchInput ? searchInput.value.trim() : '',
            status: statusFilter ? statusFilter.value : 'All',
            category: categoryFilter ? categoryFilter.value : 'All'
        };
        const complaints = await window.api.getComplaints(filter);
        renderComplaintsTable(complaints, 'customerComplaintsFullTable');
    };

    if (searchInput) searchInput.addEventListener('input', loadFiltered);
    if (statusFilter) statusFilter.addEventListener('change', loadFiltered);
    if (categoryFilter) categoryFilter.addEventListener('change', loadFiltered);

    await loadFiltered();
}

async function initCustomerComplaintDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = '/frontend/customer/complaints.html';
        return;
    }

    const complaint = await window.api.getComplaintById(id);
    if (!complaint) {
        showToast('Complaint not found', 'error');
        return;
    }

    // Populate header details
    document.getElementById('detailTicketId').textContent = complaint.id;
    document.getElementById('detailSubject').textContent = complaint.subject;
    document.getElementById('detailCategory').textContent = complaint.category;
    document.getElementById('detailCreatedAt').textContent = complaint.createdAt;
    
    const statusBadge = document.getElementById('detailStatusBadge');
    statusBadge.textContent = complaint.status;
    statusBadge.className = `badge badge-${complaint.status.toLowerCase().replace(' ', '_')}`;

    const priorityBadge = document.getElementById('detailPriorityBadge');
    priorityBadge.textContent = complaint.priority;
    priorityBadge.className = `badge badge-${complaint.priority.toLowerCase()}`;

    // Render Messages Chat
    renderChatMessages(complaint.messages);

    // Setup Reply Form
    const replyForm = document.getElementById('replyForm');
    if (replyForm) {
        replyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textInput = document.getElementById('replyTextInput');
            const text = textInput.value.trim();
            if (!text) return;

            const user = window.auth.getCurrentUser();
            const updated = await window.api.addMessage(id, 'customer', user ? user.name : 'Customer', text);
            textInput.value = '';
            renderChatMessages(updated.messages);
            showToast('Reply sent', 'success');
        });
    }

    // Setup Refund/Resolution button if eligible
    const actionBox = document.getElementById('resolutionActionBox');
    if (actionBox) {
        if (complaint.refundStatus === 'Eligible') {
            actionBox.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem;">
                    <div style="font-weight: 700; color: var(--success); margin-bottom: 0.5rem;">
                        <i class="fas fa-hand-holding-usd"></i> Compensation Payout Approved
                    </div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.85rem;">
                        You are eligible for a <strong>$${complaint.refundAmount.toFixed(2)}</strong> refund compensation.
                    </p>
                    <a href="/frontend/payment/checkout.html?id=${complaint.id}" class="btn btn-sm btn-success">
                        Claim Refund Payout ($${complaint.refundAmount.toFixed(2)})
                    </a>
                </div>
            `;
        } else if (complaint.refundStatus === 'Processed') {
            actionBox.innerHTML = `
                <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--info); border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem;">
                    <span style="color: var(--info); font-weight: 700;">
                        <i class="fas fa-check-circle"></i> Refund of $${complaint.refundAmount.toFixed(2)} has been successfully paid out.
                    </span>
                </div>
            `;
        }
    }
}

function renderComplaintsTable(complaints, containerId) {
    const tableBody = document.getElementById(containerId);
    if (!tableBody) return;

    if (complaints.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No complaints found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = complaints.map(c => `
        <tr>
            <td class="ticket-id"><a href="/frontend/customer/complaint-details.html?id=${c.id}">${c.id}</a></td>
            <td class="ticket-subject">${c.subject}</td>
            <td><span class="badge" style="background: var(--bg-surface);">${c.category}</span></td>
            <td><span class="badge badge-${c.priority.toLowerCase()}">${c.priority}</span></td>
            <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '_')}">${c.status}</span></td>
            <td>
                <a href="/frontend/customer/complaint-details.html?id=${c.id}" class="btn btn-sm btn-secondary">
                    View <i class="fas fa-arrow-right"></i>
                </a>
            </td>
        </tr>
    `).join('');
}

function renderChatMessages(messages) {
    const chatContainer = document.getElementById('chatMessagesContainer');
    if (!chatContainer) return;

    chatContainer.innerHTML = messages.map(m => {
        let bubbleClass = 'message-user';
        if (m.sender === 'agent') bubbleClass = 'message-agent';
        if (m.sender === 'ai') bubbleClass = 'message-ai';

        return `
            <div class="message-bubble ${bubbleClass}">
                <div class="message-header">
                    <span class="message-sender">${m.name}</span>
                    <span class="message-time">${m.timestamp}</span>
                </div>
                <div class="message-body">${m.text}</div>
            </div>
        `;
    }).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
}
