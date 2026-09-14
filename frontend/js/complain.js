/**
 * Complaint Creation & Dynamic AI Text Analyzer Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const complaintForm = document.getElementById('createComplaintForm');
    const descriptionInput = document.getElementById('descriptionInput');
    const categorySelect = document.getElementById('categorySelect');
    
    // AI Preview UI Elements
    const aiCategoryBadge = document.getElementById('aiCategoryBadge');
    const aiPriorityBadge = document.getElementById('aiPriorityBadge');
    const aiSentimentBadge = document.getElementById('aiSentimentBadge');
    const aiSolutionsList = document.getElementById('aiSolutionsList');

    if (descriptionInput) {
        // Real-time AI preview as user types
        descriptionInput.addEventListener('input', () => {
            const text = descriptionInput.value.trim();
            if (text.length < 10) {
                if (aiCategoryBadge) aiCategoryBadge.textContent = "Analyzing...";
                if (aiPriorityBadge) aiPriorityBadge.textContent = "--";
                if (aiSentimentBadge) aiSentimentBadge.textContent = "--";
                if (aiSolutionsList) aiSolutionsList.innerHTML = `<li class="ai-solution-item">Start typing your complaint description to see live AI predictions.</li>`;
                return;
            }

            const analysis = window.api.analyzeComplaintText(text);

            if (aiCategoryBadge) {
                aiCategoryBadge.textContent = analysis.category;
                if (categorySelect && (!categorySelect.value || categorySelect.dataset.userModified !== 'true')) {
                    categorySelect.value = analysis.category;
                }
            }

            if (aiPriorityBadge) {
                aiPriorityBadge.textContent = analysis.priority;
                aiPriorityBadge.className = `badge badge-${analysis.priority.toLowerCase()}`;
            }

            if (aiSentimentBadge) {
                aiSentimentBadge.textContent = `${analysis.sentiment} (${Math.round(analysis.sentimentScore * 100)}%)`;
                aiSentimentBadge.className = `sentiment-pill sentiment-${analysis.sentiment.toLowerCase()}`;
            }

            if (aiSolutionsList) {
                aiSolutionsList.innerHTML = analysis.suggestedSolutions.map(sol => `
                    <li class="ai-solution-item">
                        <i class="fas fa-magic text-primary"></i>
                        <span>${sol}</span>
                    </li>
                `).join('');
            }
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', () => {
            categorySelect.dataset.userModified = 'true';
        });
    }

    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const subject = document.getElementById('subjectInput').value.trim();
            const description = descriptionInput.value.trim();
            const category = categorySelect.value;

            if (!subject || !description) {
                showToast('Please fill out subject and description.', 'error');
                return;
            }

            const user = window.auth.getCurrentUser();
            const analysis = window.api.analyzeComplaintText(description);

            const payload = {
                customerId: user ? user.id : 'CUST-101',
                customerName: user ? user.name : 'Aarav Sharma',
                customerEmail: user ? user.email : 'aarav.sharma@example.com',
                subject: subject,
                category: category || analysis.category,
                priority: analysis.priority,
                sentiment: analysis.sentiment,
                sentimentScore: analysis.sentimentScore,
                description: description,
                suggestedResolution: analysis.suggestedSolutions.join(' ')
            };

            try {
                const newTicket = await window.api.createComplaint(payload);
                showToast(`Complaint ${newTicket.id} submitted successfully!`, 'success');
                setTimeout(() => {
                    window.location.href = `/frontend/customer/complaint-details.html?id=${newTicket.id}`;
                }, 1200);
            } catch (err) {
                showToast('Failed to create complaint: ' + err.message, 'error');
            }
        });
    }
});

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}
window.showToast = showToast;
