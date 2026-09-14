/**
 * Auth Service - User Session Management & Access Control
 */

class AuthManager {
    constructor() {
        this.initDefaultUsers();
    }

    initDefaultUsers() {
        if (!localStorage.getItem('sys_users')) {
            const defaultUsers = [
                {
                    id: "CUST-101",
                    name: "Aarav Sharma",
                    email: "aarav.sharma@example.com",
                    password: "password123",
                    role: "customer"
                },
                {
                    id: "AGENT-201",
                    name: "Sarah Connor (Agent)",
                    email: "agent@support.com",
                    password: "adminpassword",
                    role: "agent"
                }
            ];
            localStorage.setItem('sys_users', JSON.stringify(defaultUsers));
        }

        // Set default current user if none exists
        if (!localStorage.getItem('sys_current_user')) {
            this.login("aarav.sharma@example.com", "password123");
        }
    }

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('sys_current_user'));
        } catch (e) {
            return null;
        }
    }

    login(email, password) {
        const users = JSON.parse(localStorage.getItem('sys_users')) || [];
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (user) {
            localStorage.setItem('sys_current_user', JSON.stringify(user));
            return { success: true, user };
        }
        return { success: false, message: "Invalid email or password" };
    }

    register(name, email, password, role = 'customer') {
        const users = JSON.parse(localStorage.getItem('sys_users')) || [];
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: "Email already registered" };
        }

        const newUser = {
            id: role === 'agent' ? `AGENT-${Math.floor(100 + Math.random() * 900)}` : `CUST-${Math.floor(100 + Math.random() * 900)}`,
            name: name,
            email: email,
            password: password,
            role: role
        };

        users.push(newUser);
        localStorage.setItem('sys_users', JSON.stringify(users));
        localStorage.setItem('sys_current_user', JSON.stringify(newUser));
        return { success: true, user: newUser };
    }

    logout() {
        localStorage.removeItem('sys_current_user');
        window.location.href = '/frontend/login.html';
    }

    // Role-based route guard
    requireRole(requiredRole) {
        const user = this.getCurrentUser();
        if (!user) {
            window.location.href = '/frontend/login.html';
            return false;
        }
        if (requiredRole && user.role !== requiredRole) {
            if (user.role === 'agent') {
                window.location.href = '/frontend/agent/dashboard.html';
            } else {
                window.location.href = '/frontend/customer/dashboard.html';
            }
            return false;
        }
        return true;
    }

    // Render User Header Profile
    renderHeaderProfile() {
        const user = this.getCurrentUser();
        const profileContainer = document.getElementById('userProfileNav');
        if (!profileContainer) return;

        if (user) {
            const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            profileContainer.innerHTML = `
                <div class="user-profile-badge">
                    <div class="avatar">${initials}</div>
                    <div class="user-info">
                        <span class="user-name">${user.name}</span>
                        <span class="user-role">${user.role === 'agent' ? 'Support Agent' : 'Customer'}</span>
                    </div>
                    <button onclick="auth.logout()" class="btn btn-sm btn-secondary" style="margin-left: 0.5rem;" title="Logout">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            `;
        }
    }
}

const auth = new AuthManager();
window.auth = auth;

document.addEventListener('DOMContentLoaded', () => {
    auth.renderHeaderProfile();
});
