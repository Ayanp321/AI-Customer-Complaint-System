/**
 * API Service Layer with Persistent Storage & Seed Data
 * Handles communications for Customer Complaints, AI Predictions, and Refunds.
 */

const API_BASE_URL = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'http://127.0.0.1:8000/api'
    : '/api';

// Initial Mock Seed Data for Demonstration
const INITIAL_COMPLAINTS = [
    {
        id: "TICK-9082",
        customerId: "CUST-101",
        customerName: "Aarav Sharma",
        customerEmail: "aarav.sharma@example.com",
        subject: "Unauthorized recurring subscription charge of $49.99",
        category: "Billing",
        priority: "High",
        sentiment: "Negative",
        sentimentScore: 0.18,
        status: "Pending",
        description: "I noticed a charge of $49.99 on my credit card statement yesterday. I canceled my premium subscription last month and received a confirmation email. Please refund this immediately.",
        suggestedResolution: "Issue full refund of $49.99 to customer credit card and verify auto-renew cancellation.",
        messages: [
            {
                sender: "customer",
                name: "Aarav Sharma",
                text: "I noticed a charge of $49.99 on my credit card statement yesterday. I canceled my premium subscription last month and received a confirmation email. Please refund this immediately.",
                timestamp: "2026-09-14 10:15"
            },
            {
                sender: "ai",
                name: "System AI Assistant",
                text: "Thank you for reaching out Aarav. Based on our analysis, your issue has been classified under 'Billing' with High Urgency. An agent is reviewing your billing history.",
                timestamp: "2026-09-14 10:16"
            }
        ],
        refundAmount: 49.99,
        refundStatus: "Eligible",
        createdAt: "2026-09-14 10:15:00",
        slaDeadline: "2026-09-15 10:15:00"
    },
    {
        id: "TICK-9083",
        customerId: "CUST-102",
        customerName: "Sofia Rodriguez",
        customerEmail: "sofia.r@example.com",
        subject: "API Gateway returns HTTP 500 errors on webhooks endpoint",
        category: "Technical",
        priority: "High",
        sentiment: "Negative",
        sentimentScore: 0.25,
        status: "In Progress",
        description: "Our production integration with your API is breaking because the /webhooks endpoint responds with 500 Internal Server Error during payload validation.",
        suggestedResolution: "Inspect ML gateway logs, deploy hotfix patch to webhook parsing module.",
        messages: [
            {
                sender: "customer",
                name: "Sofia Rodriguez",
                text: "Our production integration with your API is breaking because the /webhooks endpoint responds with 500 Internal Server Error during payload validation.",
                timestamp: "2026-09-14 11:30"
            },
            {
                sender: "agent",
                name: "Support Agent Alex",
                text: "Hi Sofia, engineering team has identified a regression bug in webhook header validation. We are rolling out a patch in 30 minutes.",
                timestamp: "2026-09-14 12:05"
            }
        ],
        refundAmount: 0,
        refundStatus: "None",
        createdAt: "2026-09-14 11:30:00",
        slaDeadline: "2026-09-14 15:30:00"
    },
    {
        id: "TICK-9084",
        customerId: "CUST-103",
        customerName: "Liam Johnson",
        customerEmail: "liam.j@example.com",
        subject: "Delivered package box arrived damaged",
        category: "Delivery",
        priority: "Medium",
        sentiment: "Neutral",
        sentimentScore: 0.48,
        status: "Resolved",
        description: "The package arrived today but the external box was severely squashed. Fortunately the product inside is intact, but please notify courier partner.",
        suggestedResolution: "Log shipping partner complaint and issue $10 store credit coupon.",
        messages: [
            {
                sender: "customer",
                name: "Liam Johnson",
                text: "The package arrived today but the external box was severely squashed.",
                timestamp: "2026-09-13 14:00"
            },
            {
                sender: "agent",
                name: "Support Agent Sarah",
                text: "Thanks for letting us know Liam! We've issued a $10 compensation credit to your account.",
                timestamp: "2026-09-13 16:20"
            }
        ],
        refundAmount: 10.00,
        refundStatus: "Processed",
        createdAt: "2026-09-13 14:00:00",
        slaDeadline: "2026-09-14 14:00:00"
    }
];

class ApiService {
    constructor() {
        this.initStorage();
    }

    initStorage() {
        if (!localStorage.getItem('sys_complaints')) {
            localStorage.setItem('sys_complaints', JSON.stringify(INITIAL_COMPLAINTS));
        }
        if (!localStorage.getItem('sys_payouts')) {
            localStorage.setItem('sys_payouts', JSON.stringify([]));
        }
    }

    // Get all complaints
    async getComplaints(filter = {}) {
        try {
            const data = JSON.parse(localStorage.getItem('sys_complaints')) || [];
            let result = data;

            if (filter.status && filter.status !== 'All') {
                result = result.filter(c => c.status === filter.status);
            }
            if (filter.category && filter.category !== 'All') {
                result = result.filter(c => c.category === filter.category);
            }
            if (filter.priority && filter.priority !== 'All') {
                result = result.filter(c => c.priority === filter.priority);
            }
            if (filter.customerId) {
                result = result.filter(c => c.customerId === filter.customerId);
            }
            if (filter.search) {
                const query = filter.search.toLowerCase();
                result = result.filter(c =>
                    c.subject.toLowerCase().includes(query) ||
                    c.id.toLowerCase().includes(query) ||
                    c.customerName.toLowerCase().includes(query)
                );
            }

            return result;
        } catch (error) {
            console.error("Failed to fetch complaints:", error);
            return [];
        }
    }

    // Get complaint by ID
    async getComplaintById(id) {
        const complaints = await this.getComplaints();
        return complaints.find(c => c.id === id) || null;
    }

    // Create a new complaint
    async createComplaint(complaintData) {
        const complaints = JSON.parse(localStorage.getItem('sys_complaints')) || [];
        const newTicket = {
            id: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
            customerId: complaintData.customerId || "CUST-101",
            customerName: complaintData.customerName || "Current User",
            customerEmail: complaintData.customerEmail || "user@example.com",
            subject: complaintData.subject,
            category: complaintData.category || "Technical",
            priority: complaintData.priority || "Medium",
            sentiment: complaintData.sentiment || "Neutral",
            sentimentScore: complaintData.sentimentScore || 0.5,
            status: "Pending",
            description: complaintData.description,
            suggestedResolution: complaintData.suggestedResolution || "AI triage evaluating resolution options.",
            messages: [
                {
                    sender: "customer",
                    name: complaintData.customerName || "Customer",
                    text: complaintData.description,
                    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
                },
                {
                    sender: "ai",
                    name: "AI Classifier Agent",
                    text: `Complaint received and indexed. Category: [${complaintData.category}], Priority: [${complaintData.priority}], Sentiment: [${complaintData.sentiment}]. Estimated SLA resolution time: 24 hours.`,
                    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
                }
            ],
            refundAmount: complaintData.category === 'Billing' ? 29.99 : 0.00,
            refundStatus: complaintData.category === 'Billing' ? "Eligible" : "None",
            createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            slaDeadline: new Date(Date.now() + 86400000).toISOString().replace('T', ' ').substring(0, 19)
        };

        complaints.unshift(newTicket);
        localStorage.setItem('sys_complaints', JSON.stringify(complaints));
        return newTicket;
    }

    // Add message to ticket
    async addMessage(ticketId, sender, name, text) {
        const complaints = JSON.parse(localStorage.getItem('sys_complaints')) || [];
        const index = complaints.findIndex(c => c.id === ticketId);
        if (index !== -1) {
            const msg = {
                sender: sender,
                name: name,
                text: text,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
            };
            complaints[index].messages.push(msg);
            
            // Auto update status if agent replies
            if (sender === 'agent' && complaints[index].status === 'Pending') {
                complaints[index].status = 'In Progress';
            }
            
            localStorage.setItem('sys_complaints', JSON.stringify(complaints));
            return complaints[index];
        }
        throw new Error("Complaint not found");
    }

    // Update ticket status or priority
    async updateComplaintStatus(ticketId, status, priority = null) {
        const complaints = JSON.parse(localStorage.getItem('sys_complaints')) || [];
        const index = complaints.findIndex(c => c.id === ticketId);
        if (index !== -1) {
            complaints[index].status = status;
            if (priority) {
                complaints[index].priority = priority;
            }
            localStorage.setItem('sys_complaints', JSON.stringify(complaints));
            return complaints[index];
        }
        throw new Error("Complaint not found");
    }

    // Process Compensation / Refund Payout
    async processPayout(ticketId, amount, paymentDetails) {
        const complaints = JSON.parse(localStorage.getItem('sys_complaints')) || [];
        const index = complaints.findIndex(c => c.id === ticketId);
        if (index !== -1) {
            complaints[index].refundStatus = "Processed";
            complaints[index].refundAmount = amount;
            complaints[index].status = "Resolved";
            localStorage.setItem('sys_complaints', JSON.stringify(complaints));

            // Log payout receipt
            const payouts = JSON.parse(localStorage.getItem('sys_payouts')) || [];
            const receipt = {
                transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
                ticketId: ticketId,
                amount: amount,
                cardNumber: paymentDetails.cardNumber ? `**** **** **** ${paymentDetails.cardNumber.slice(-4)}` : 'Bank Transfer',
                status: 'SUCCESS',
                timestamp: new Date().toISOString()
            };
            payouts.unshift(receipt);
            localStorage.setItem('sys_payouts', JSON.stringify(payouts));

            return receipt;
        }
        throw new Error("Ticket not found for payout");
    }

    // Dynamic AI Analysis Engine simulation
    analyzeComplaintText(text) {
        const lower = text.toLowerCase();
        let sentiment = "Neutral";
        let sentimentScore = 0.5;
        let category = "Service";
        let priority = "Low";
        const suggestedSolutions = [];

        // Category Classification Rule Engine
        if (lower.includes("refund") || lower.includes("charge") || lower.includes("billing") || lower.includes("payment") || lower.includes("card") || lower.includes("invoice")) {
            category = "Billing";
            suggestedSolutions.push("Verify transaction reference in billing audit system.");
            suggestedSolutions.push("Check auto-renewal status for subscription.");
        } else if (lower.includes("error") || lower.includes("bug") || lower.includes("api") || lower.includes("crash") || lower.includes("slow") || lower.includes("code") || lower.includes("fail")) {
            category = "Technical";
            suggestedSolutions.push("Check server health monitoring & API response logs.");
            suggestedSolutions.push("Clear browser cache / reset session API token.");
        } else if (lower.includes("delivery") || lower.includes("package") || lower.includes("shipping") || lower.includes("courier") || lower.includes("tracking") || lower.includes("arrived")) {
            category = "Delivery";
            suggestedSolutions.push("Query logistics API for real-time GPS tracking.");
            suggestedSolutions.push("Contact courier dispatcher for delayed package replacement.");
        } else {
            category = "Service";
            suggestedSolutions.push("Forward inquiry to senior customer relations officer.");
        }

        // Sentiment & Urgency Scoring
        const negativeWords = ["terrible", "worst", "unauthorized", "scam", "broken", "fail", "urgent", "immediately", "horrible", "frustrated", "angry", "lawyer", "cancel"];
        const positiveWords = ["happy", "thanks", "great", "resolved", "good", "appreciate", "helpful"];

        let negCount = 0;
        let posCount = 0;

        negativeWords.forEach(w => { if (lower.includes(w)) negCount++; });
        positiveWords.forEach(w => { if (lower.includes(w)) posCount++; });

        if (negCount >= 2 || lower.includes("unauthorized") || lower.includes("urgent")) {
            sentiment = "Negative";
            sentimentScore = Math.max(0.05, 0.4 - negCount * 0.1);
            priority = "High";
        } else if (negCount === 1) {
            sentiment = "Negative";
            sentimentScore = 0.35;
            priority = "Medium";
        } else if (posCount > 0) {
            sentiment = "Positive";
            sentimentScore = 0.85;
            priority = "Low";
        }

        return {
            category,
            priority,
            sentiment,
            sentimentScore,
            suggestedSolutions
        };
    }
}

const api = new ApiService();
window.api = api;
