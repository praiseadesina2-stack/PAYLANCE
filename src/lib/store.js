import { create } from "zustand";
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

export const useAuthStore = create((set) => ({
    user: null,
    token: localStorage.getItem('paylance_token') || null,

    login: async (email, password) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const data = await res.json().catch(()=>({}));
            throw new Error(data.error || 'Login failed');
        }
        const data = await res.json();
        localStorage.setItem('paylance_token', data.token);
        set({ user: data.user, token: data.token });
        return data.user;
    },

    register: async (userData) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (!res.ok) {
            const data = await res.json().catch(()=>({}));
            throw new Error(data.error || 'Registration failed');
        }
        const data = await res.json();
        localStorage.setItem('paylance_token', data.token);
        set({ user: data.user, token: data.token });
        return data.user;
    },

    logout: () => {
        localStorage.removeItem('paylance_token');
        set({ user: null, token: null });
    },

    fetchMe: async () => {
        const token = localStorage.getItem('paylance_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const user = await res.json();
                set({ user });
            } else {
                localStorage.removeItem('paylance_token');
                set({ user: null, token: null });
            }
        } catch (e) {
            console.error("Failed to fetch user", e);
        }
    },

    fundWallet: async (amount) => {
        const token = localStorage.getItem('paylance_token');
        if (!token) return;
        const res = await fetch(`${API_URL}/wallet/fund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount })
        });
        if (!res.ok) {
            const data = await res.json().catch(()=>({}));
            throw new Error(data.error || 'Funding failed');
        }
        const data = await res.json();
        if (data.requiresInteraction) {
            return data;
        }
        set((state) => ({ user: { ...state.user, balance: data.balance } }));
        return data;
    },

    withdrawWallet: async (amount) => {
        const token = localStorage.getItem('paylance_token');
        if (!token) return;
        const res = await fetch(`${API_URL}/wallet/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ amount })
        });
        if (!res.ok) {
            const data = await res.json().catch(()=>({}));
            throw new Error(data.error || 'Withdrawal failed');
        }
        const data = await res.json();
        if (data.requiresInteraction) {
            return data;
        }
        set((state) => ({ user: { ...state.user, balance: data.balance } }));
        return data;
    },

    completeILPTransfer: async (interactRef) => {
        const token = localStorage.getItem('paylance_token');
        if (!token) return;
        const res = await fetch(`${API_URL}/wallet/continue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ interact_ref: interactRef })
        });
        if (!res.ok) {
            const data = await res.json().catch(()=>({}));
            throw new Error(data.error || 'Transfer completion failed');
        }
        const data = await res.json();
        set((state) => ({ user: { ...state.user, balance: data.balance } }));
        return data;
    },

    // Fetch real ILP wallet balance + transaction history
    fetchILPBalance: async () => {
        const token = localStorage.getItem('paylance_token');
        if (!token) return null;
        const res = await fetch(`${API_URL}/wallet/ilp-balance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        // Update local balance from DB
        set((state) => ({ user: { ...state.user, balance: data.paylanceBalance } }));
        return data;
    },

    // Transfer milestone payment from employer to freelancer wallet
    transferMilestonePayment: async ({ job_id, milestone_id, amount, freelancer_id }) => {
        const token = localStorage.getItem('paylance_token');
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${API_URL}/escrow/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ job_id, milestone_id, amount, freelancer_id })
        });
        if (!res.ok) {
            const data = await res.json().catch(()=>({}));
            throw new Error(data.error || 'Transfer failed');
        }
        const data = await res.json();
        // Update employer's local balance
        set((state) => ({ user: { ...state.user, balance: data.employerNewBalance } }));
        return data;
    },

    // Apply to a job (freelancer)
    applyToJob: async (jobId, coverNote) => {
        const token = localStorage.getItem('paylance_token');
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ cover_note: coverNote })
        });
        if (!res.ok) {
            const data = await res.json().catch(()=>({}));
            throw new Error(data.error || 'Application failed');
        }
        return await res.json();
    },

    // Accept an applicant (employer)
    acceptApplicant: async (jobId, freelancerId) => {
        const token = localStorage.getItem('paylance_token');
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${API_URL}/jobs/${jobId}/accept-applicant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ freelancer_id: freelancerId })
        });
        if (!res.ok) {
            const data = await res.json().catch(()=>({}));
            throw new Error(data.error || 'Accept failed');
        }
        return await res.json();
    },
}));

export const useUIStore = create((set) => ({
    sidebarOpen: false,
    notifications: 3,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
