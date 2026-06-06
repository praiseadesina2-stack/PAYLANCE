"use client";
import { useAuthStore } from "@/lib/store";
import { useJobsStore } from "@/lib/jobs-store";
import { formatCurrency } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Lock, CheckCircle, Clock, Zap, FileText, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

export default function EmployerContractsPage() {
    const user = useAuthStore((s) => s.user);
    const localJobs = useJobsStore((s) => s.jobs);
    const addJob = useJobsStore((s) => s.addJob);

    const [backendJobs, setBackendJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        const token = localStorage.getItem('paylance_token');
        fetch(`${API_URL}/jobs?employer_id=${user.id}&status=in_progress`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(async (jobs) => {
                if (!Array.isArray(jobs)) return;
                const full = await Promise.all(jobs.map(async (j) => {
                    try {
                        const r = await fetch(`${API_URL}/jobs/${j.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                        return await r.json();
                    } catch (_) { return j; }
                }));
                setBackendJobs(full);

                // Sync missing jobs into local Zustand store so ContractDetails page works
                const currentJobs = useJobsStore.getState().jobs;
                full.forEach(bj => {
                    const exists = currentJobs.find(lj => lj.id === bj.id);
                    if (!exists) {
                        addJob({
                            id: bj.id,
                            employerId: bj.employer_id,
                            employerName: bj.employer_name,
                            freelancerId: bj.freelancer_id,
                            freelancerName: bj.freelancer_name || 'Freelancer',
                            title: bj.title,
                            description: bj.description,
                            budget: bj.budget,
                            status: 'IN_PROGRESS',
                            milestones: (bj.milestones || []).map((m, i) => ({
                                id: m.id,
                                title: m.title,
                                description: m.description,
                                amount: m.amount,
                                deliverables: (() => { try { return JSON.parse(m.deliverables); } catch (_) { return []; } })(),
                                acceptanceCriteria: m.acceptance_criteria || '',
                                status: (() => {
                                    const s = (m.status || '').toLowerCase();
                                    if (s === 'in_progress') return 'IN_PROGRESS';
                                    if (s === 'submitted' || s === 'under_review') return 'UNDER_REVIEW';
                                    if (s === 'approved' || s === 'paid') return 'APPROVED';
                                    return i === 0 ? 'IN_PROGRESS' : 'LOCKED';
                                })(),
                            })),
                            escrow: { status: 'FUNDED', total: bj.budget, funded: bj.budget, released: 0 },
                            downloadUnlocked: false,
                            createdAt: bj.created_at,
                        });
                    }
                });
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user?.id]);

    // Backend is source of truth; enrich with local store data where available
    const activeJobs = backendJobs.map(bj => {
        const local = localJobs.find(lj => lj.id === bj.id);
        return local || {
            id: bj.id,
            employerId: bj.employer_id,
            freelancerName: bj.freelancer_name || 'Freelancer',
            title: bj.title,
            budget: bj.budget,
            status: 'IN_PROGRESS',
            milestones: bj.milestones || [],
            escrow: { total: bj.budget, released: 0, funded: bj.budget },
        };
    });

    return (
        <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>Active Contracts</h1>
                <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginTop: 4 }}>
                    Review milestone submissions, release payments, and manage deliveries
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "hsl(220 15% 55%)" }}>
                    <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 1rem", display: "block" }} />
                    <p>Loading contracts...</p>
                </div>
            ) : activeJobs.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
                    <FileText size={48} color="hsl(220 15% 25%)" style={{ margin: "0 auto 1rem" }} />
                    <h3 className="font-heading" style={{ fontSize: "1.1rem", color: "white", marginBottom: "0.5rem" }}>No active contracts</h3>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                        Post a job, hire a freelancer, and fund escrow to start a contract.
                    </p>
                    <Link to="/dashboard/employer/jobs/new" className="btn btn-primary">Post a Job</Link>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {activeJobs.map((job) => {
                        const escrow = job.escrow || { total: job.budget || 0, released: 0 };
                        const pct = Math.round(((escrow.released || 0) / (escrow.total || 1)) * 100);

                        const bj = backendJobs.find(b => b.id === job.id);
                        const milestones = (() => {
                            const m = job.milestones?.length ? job.milestones : (bj?.milestones || []);
                            return m;
                        })();

                        const hasSubmitted = milestones.some(m => {
                            const s = (m.status || '').toLowerCase();
                            return s === 'submitted' || s === 'under_review';
                        });

                        return (
                            <div key={job.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                    <div>
                                        <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "0.25rem" }}>{job.title}</h3>
                                        <div style={{ fontSize: "0.82rem", color: "hsl(220 15% 55%)" }}>
                                            Freelancer: <strong style={{ color: "white" }}>{job.freelancerName}</strong> · Budget: <strong style={{ color: "white" }}>{formatCurrency(job.budget)}</strong>
                                        </div>
                                    </div>
                                    <Link to={`/dashboard/employer/jobs/${job.id}/contract`} className="btn btn-outline btn-sm review-submission-btn" style={{ gap: "0.4rem" }}>
                                        Manage <ArrowRight size={14} />
                                    </Link>
                                </div>

                                {/* Escrow bar */}
                                <div style={{ background: "hsl(220 20% 10%)", border: "1px solid hsl(145 65% 42% / 0.2)", borderRadius: 8, padding: "0.875rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <Lock size={13} color="hsl(145 65% 50%)" />
                                            <span style={{ fontSize: "0.8rem", color: "white", fontWeight: 600 }}>ILP Escrow</span>
                                        </div>
                                        <span style={{ fontSize: "0.78rem", color: "hsl(145 65% 55%)", fontWeight: 600 }}>{pct}% released</span>
                                    </div>
                                    <div style={{ height: 6, background: "hsl(220 20% 16%)", borderRadius: 99, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, hsl(145 65% 42%), hsl(145 65% 55%))", borderRadius: 99 }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem", fontSize: "0.73rem", color: "hsl(220 15% 50%)" }}>
                                        <span>{formatCurrency(escrow.released || 0)} paid</span>
                                        <span>{formatCurrency((escrow.total || 0) - (escrow.released || 0))} locked</span>
                                    </div>
                                </div>

                                {/* Alert: milestone needs release */}
                                {hasSubmitted && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "hsl(145 65% 42% / 0.08)", border: "1px solid hsl(145 65% 42% / 0.3)", borderRadius: 8, padding: "0.75rem 1rem" }}>
                                        <Zap size={16} color="hsl(145 65% 55%)" />
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>
                                                Freelancer submitted work — payment release required
                                            </span>
                                        </div>
                                        <Link to={`/dashboard/employer/jobs/${job.id}/contract`} className="btn btn-primary btn-sm">
                                            Review &amp; Release
                                        </Link>
                                    </div>
                                )}

                                {/* Milestone pills */}
                                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                    {milestones.map((m, i) => {
                                        const s = (m.status || '').toLowerCase();
                                        const isApproved = s === 'approved' || s === 'paid' || m.status === 'APPROVED';
                                        const isReview = s === 'submitted' || s === 'under_review' || m.status === 'UNDER_REVIEW';
                                        const isActive = s === 'in_progress' || m.status === 'IN_PROGRESS';
                                        return (
                                            <div key={m.id || i} style={{
                                                display: "flex", alignItems: "center", gap: "0.35rem",
                                                padding: "0.3rem 0.65rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600,
                                                background: isApproved ? "hsl(145 65% 42% / 0.12)" : isReview ? "hsl(38 92% 50% / 0.1)" : isActive ? "hsl(217 91% 55% / 0.1)" : "hsl(220 20% 13%)",
                                                color: isApproved ? "hsl(145 65% 55%)" : isReview ? "hsl(38 92% 60%)" : isActive ? "hsl(217 91% 65%)" : "hsl(220 15% 40%)",
                                            }}>
                                                {isApproved && <CheckCircle size={11} />}
                                                {isReview && <Clock size={11} />}
                                                {isActive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "hsl(217 91% 65%)" }} />}
                                                {!isApproved && !isReview && !isActive && <Lock size={10} />}
                                                M{i + 1}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
