/**
 * Support Agent Workbench Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    if (path.includes('agent/dashboard.html')) {
        await initAgentDashboard();
    } else if (path.includes('agent/complaints.html')) {
        await initAgentQueue();
    } else if (path.includes('agent/complaint-details.html')) {
        await initAgentWorkbench();
    }
});

async function initAgentDashboard() {
    const complaints = await window.api.getComplaints();

    const unassignedCount = complaints.filter(c => c.status === 'Pending').length;
    const highPriorityCount = complaints.filter(c => c.priority === 'High' && c.status !== 'Resolved').length;
    const resolvedTodayCount = complaints.filter(c => c.status === 'Resolved').length;

    // Calculate Average Sentiment
    let totalScore = 0;
    complaints.forEach(c => totalScore += (c.sentimentScore || 0.5));
    const avgSentiment = complaints.length > 0 ? (totalScore / complaints.length * 100).toFixed(0) : 50;

    const elUnassigned = document.getElementById('statUnassigned');
    const elHighPri = document.getElementById('statHighPriority');
    const elResolved = document.getElementById('statAgentResolved');
    const elSentiment = document.getElementById('statAvgSentiment');

    if (elUnassigned) elUnassigned.textContent = unassignedCount;
    if (elHighPri) elHighPri.textContent = highPriorityCount;
    if (elResolved) elResolved.textContent = resolvedTodayCount;
    if (elSentiment) elSentiment.textContent = `${avgSentiment}%`;

    // Render Urgent Queue Table
    const urgentComplaints = complaints.filter(c => c.priority === 'High' || c.status === 'Pending');
    renderAgentQueueTable(urgentComplaints.slice(0, 5), 'agentUrgentTable');
}

async function initAgentQueue() {
    const searchInput = document.getElementById('agentSearchInput');
    const statusFilter = document.getElementById('agentStatusFilter');
    const priorityFilter = document.getElementById('agentPriorityFilter');
    const categoryFilter = document.getElementById('agentCategoryFilter');

    const loadFilteredQueue = async () => {
        const filter = {
            search: searchInput ? searchInput.value.trim() : '',
            status: statusFilter ? statusFilter.value : 'All',
            priority: priorityFilter ? priorityFilter.value : 'All',
            category: categoryFilter ? categoryFilter.value : 'All'
        };
        const complaints = await window.api.getComplaints(filter);
        renderAgentQueueTable(complaints, 'agentFullQueueTable');
    };

    if (searchInput) searchInput.addEventListener('input', loadFilteredQueue);
    if (statusFilter) statusFilter.addEventListener('change', loadFilteredQueue);
    if (priorityFilter) priorityFilter.addEventListener('change', loadFilteredQueue);
    if (categoryFilter) categoryFilter.addEventListener('change', loadFilteredQueue);

    await loadFilteredQueue();
}

async function initAgentWorkbench() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = '/frontend/agent/complaints.html';
        return;
    }

    const complaint = await window.api.getComplaintById(id);
    if (!complaint) {
        showToast('Complaint ticket not found', 'error');
        return;
    }

    // Header & Info Binding
    document.getElementById('wbTicketId').textContent = complaint.id;
    document.getElementById('wbSubject').textContent = complaint.subject;
    document.getElementById('wbCustomerName').textContent = complaint.customerName;
    document.getElementById('wbCustomerEmail').textContent = complaint.customerEmail;
    document.getElementById('wbCategory').textContent = complaint.category;
    document.getElementById('wbSlaDeadline').textContent = complaint.slaDeadline;

    // Badges & Sentiment Meter
    const priorityBadge = document.getElementById('wbPriorityBadge');
    priorityBadge.textContent = complaint.priority;
    priorityBadge.className = `badge badge-${complaint.priority.toLowerCase()}`;

    const statusBadge = document.getElementById('wbStatusBadge');
    statusBadge.textContent = complaint.status;
    statusBadge.className = `badge badge-${complaint.status.toLowerCase().replace(' ', '_')}`;

    const sentimentPill = document.getElementById('wbSentimentPill');
    sentimentPill.textContent = `${complaint.sentiment} (${Math.round((complaint.sentimentScore || 0.5) * 100)}%)`;
    sentimentPill.className = `sentiment-pill sentiment-${complaint.sentiment.toLowerCase()}`;

    // Render Messages
    renderAgentChat(complaint.messages);

    // AI Smart Auto-Reply Generator Button
    const btnAiDraft = document.getElementById('btnAiDraftReply');
    const replyInput = document.getElementById('agentReplyInput');

    if (btnAiDraft && replyInput) {
        btnAiDraft.addEventListener('click', () => {
            let draft = `Dear ${complaint.customerName},\n\n`;
            draft += `Thank you for contacting customer support. We have reviewed your issue regarding "${complaint.subject}".\n\n`;
            if (complaint.category === 'Billing') {
                draft += `Our billing team has verified the charge. We have authorized an automatic compensation refund of $${complaint.refundAmount || 29.99} to your account.\n\n`;
            } else if (complaint.category === 'Technical') {
                draft += `Our engineering team has inspected our system logs and identified the root cause. A fix has been deployed to resolve your issue.\n\n`;
            } else {
                draft += `We are actively resolving your ticket to ensure your complete satisfaction.\n\n`;
            }
            draft += `Please let us know if you require any further assistance.\n\nBest regards,\nCustomer Resolution Team`;

            replyInput.value = draft;
            showToast('AI smart response draft generated!', 'info');
        });
    }

    // Submit Reply Form
    const agentReplyForm = document.getElementById('agentReplyForm');
    if (agentReplyForm) {
        agentReplyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = replyInput.value.trim();
            if (!text) return;

            const user = window.auth.getCurrentUser();
            const updated = await window.api.addMessage(id, 'agent', user ? user.name : 'Support Agent Alex', text);
            replyInput.value = '';
            renderAgentChat(updated.messages);
            showToast('Agent reply sent to customer!', 'success');
        });
    }

    // Quick Action Buttons (Resolve, Escalate, Approve Refund)
    const btnResolve = document.getElementById('btnMarkResolved');
    if (btnResolve) {
        btnResolve.addEventListener('click', async () => {
            await window.api.updateComplaintStatus(id, 'Resolved');
            showToast(`Ticket ${id} marked as Resolved!`, 'success');
            setTimeout(() => window.location.reload(), 1000);
        });
    }

    const btnApproveRefund = document.getElementById('btnApproveRefund');
    if (btnApproveRefund) {
        btnApproveRefund.addEventListener('click', async () => {
            const complaints = JSON.parse(localStorage.getItem('sys_complaints')) || [];
            const idx = complaints.findIndex(c => c.id === id);
            if (idx !== -1) {
                complaints[idx].refundStatus = 'Eligible';
                complaints[idx].refundAmount = complaints[idx].refundAmount || 49.99;
                localStorage.setItem('sys_complaints', JSON.stringify(complaints));
                showToast(`Approved $${complaints[idx].refundAmount.toFixed(2)} refund compensation for customer!`, 'success');
                setTimeout(() => window.location.reload(), 1000);
            }
        });
    }
}

function renderAgentQueueTable(complaints, containerId) {
    const tableBody = document.getElementById(containerId);
    if (!tableBody) return;

    if (complaints.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No ticket matches found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = complaints.map(c => `
        <tr>
            <td class="ticket-id"><a href="/frontend/agent/complaint-details.html?id=${c.id}">${c.id}</a></td>
            <td><strong>${c.customerName}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">${c.customerEmail}</span></td>
            <td class="ticket-subject">${c.subject}</td>
            <td><span class="badge" style="background: var(--bg-surface);">${c.category}</span></td>
            <td><span class="badge badge-${c.priority.toLowerCase()}">${c.priority}</span></td>
            <td><span class="sentiment-pill sentiment-${c.sentiment.toLowerCase()}">${c.sentiment}</span></td>
            <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '_')}">${c.status}</span></td>
            <td>
                <a href="/frontend/agent/complaint-details.html?id=${c.id}" class="btn btn-sm btn-primary">
                    Workbench <i class="fas fa-wrench"></i>
                </a>
            </td>
        </tr>
    `).join('');
}

function renderAgentChat(messages) {
    const chatContainer = document.getElementById('agentChatMessages');
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
                <div class="message-body" style="white-space: pre-wrap;">${m.text}</div>
            </div>
        `;
    }).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
}
