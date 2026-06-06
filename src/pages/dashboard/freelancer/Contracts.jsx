"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Search, Upload, CheckCircle, FileText, Lock, Play, Clock, AlertTriangle, Zap, RotateCcw, Shield, RefreshCw } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

function MilestoneStatusIcon({ status }) {
    const s = (status || '').toUpperCase();
    if (s === "APPROVED" || s === "PAID") return <CheckCircle size={16} color="hsl(145 65% 50%)"/>;
    if (s === "IN_PROGRESS") return <Play size={14} color="hsl(217 91% 65%)"/>;
    if (s === "UNDER_REVIEW" || s === "IN_REVIEW") return <Clock size={14} color="hsl(38 92% 60%)"/>;
    if (s === "NEEDS_REVISION") return <RotateCcw size={14} color="hsl(0 84% 60%)"/>;
    if (s === "ESCALATED") return <AlertTriangle size={14} color="hsl(38 92% 60%)"/>;
    return <Lock size={14} color="hsl(220 15% 40%)"/>;
}

function MilestoneStatusLabel({ status }) {
    const s = (status || '').toUpperCase();
    const map = {
        LOCKED: { label: "Locked", color: "hsl(220 15% 40%)" },
        IN_PROGRESS: { label: "In Progress", color: "hsl(217 91% 65%)" },
        UNDER_REVIEW: { label: "Under Review", color: "hsl(38 92% 60%)" },
        IN_REVIEW: { label: "Under Review", color: "hsl(38 92% 60%)" },
        APPROVED: { label: "Pending Release", color: "hsl(38 92% 60%)" },
        PAID: { label: "Paid ✓", color: "hsl(145 65% 50%)" },
        NEEDS_REVISION: { label: "Needs Revision", color: "hsl(0 84% 65%)" },
        ESCALATED: { label: "Escalated", color: "hsl(38 92% 60%)" },
    };
    const { label, color } = map[s] || map.LOCKED;
    return <span style={{ fontSize: "0.75rem", color }}>{label}</span>;
}

export default function FreelancerContractsPage() {
    const user = useAuthStore((s) => s.user);
    const token = localStorage.getItem('paylance_token');
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const [search, setSearch] = useState("");

    // Fetch jobs where this freelancer is hired — from backend DB
    const loadContracts = async () => {
        if (!user || !token) return;
        setLoading(true);
        try {
            // Get all jobs then filter by freelancer_id on client
            const res = await fetch(`${API_URL}/jobs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const jobs = await res.json();
            if (Array.isArray(jobs)) {
                const mine = jobs.filter(j =>
                    j.freelancer_id === user.id &&
                    (j.status === 'in_progress' || j.status === 'IN_PROGRESS' || j.status === 'completed' || j.status === 'COMPLETED')
                );
                // For each job, fetch its milestones
                const enriched = await Promise.all(mine.map(async job => {
                    try {
                        const mRes = await fetch(`${API_URL}/jobs/${job.id}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const full = await mRes.json();
                        return full;
                    } catch {
                        return job;
                    }
                }));
                setContracts(enriched);
            }
        } catch (e) {
            console.error('Failed to load contracts:', e);
        }
        setLoading(false);
    };

    useEffect(() => { loadContracts(); }, [user]);

    const filtered = contracts.filter(j => {
        const status = (j.status || '').toUpperCase();
        if (filter !== "ALL" && status !== filter) return false;
        if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>My Contracts</h1>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginTop: 4 }}>Manage active projects and submit deliverables for AI verification</p>
                </div>
                <button onClick={loadContracts} className="btn btn-ghost btn-sm" style={{ gap: "0.4rem" }} disabled={loading}>
                    <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/> Refresh
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                    <Search size={16} color="hsl(220 15% 50%)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}/>
                    <input className="input" placeholder="Search contracts..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: "2.25rem" }}/>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {["ALL", "IN_PROGRESS", "COMPLETED"].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            padding: "0.5rem 1rem", borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                            fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap",
                            background: filter === f ? "hsl(217 91% 55% / 0.15)" : "hsl(220 14% 10%)",
                            border: filter === f ? "1px solid hsl(217 91% 55% / 0.5)" : "1px solid hsl(220 20% 16%)",
                            color: filter === f ? "hsl(217 91% 70%)" : "hsl(220 15% 55%)",
                        }}>
                            {f.replace("_", " ")}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {loading && (
                    <div style={{ textAlign: "center", padding: "3rem", color: "hsl(220 15% 50%)", fontSize: "0.875rem" }}>
                        Loading your contracts…
                    </div>
                )}

                {!loading && filtered.map((job) => {
                    const milestones = job.milestones || [];
                    const released = milestones.filter(m => (m.status || '').toLowerCase() === 'paid').reduce((s, m) => s + (m.amount || 0), 0);
                    const total = job.budget || 0;
                    const pct = total > 0 ? Math.round((released / total) * 100) : 0;

                    return (
                        <div key={job.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {/* Header */}
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                <div style={{ flex: 1, paddingRight: "1rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                        <h3 className="font-heading" style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>{job.title}</h3>
                                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "hsl(145 65% 55%)", background: "hsl(145 65% 42% / 0.12)", border: "1px solid hsl(145 65% 42% / 0.25)", padding: "0.1rem 0.4rem", borderRadius: 4, textTransform: "uppercase" }}>Live</span>
                                    </div>
                                    <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "hsl(220 15% 55%)", flexWrap: "wrap" }}>
                                        <span>Employer: <strong style={{ color: "white" }}>{job.employer_name || "Client"}</strong></span>
                                        {job.deadline && <span>Deadline: {formatDate(job.deadline)}</span>}
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                                    <span style={{
                                        fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 6,
                                        textTransform: "uppercase",
                                        background: "hsl(217 91% 55% / 0.12)", color: "hsl(217 91% 70%)",
                                    }}>
                                        {(job.status || '').replace(/_/g, " ")}
                                    </span>
                                    <div className="font-heading" style={{ fontSize: "1.25rem", fontWeight: 800, color: "white" }}>
                                        {formatCurrency(total)}
                                    </div>
                                </div>
                            </div>

                            {/* Escrow bar */}
                            <div style={{ background: "hsl(220 20% 10%)", border: "1px solid hsl(220 20% 16%)", borderRadius: 8, padding: "1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <Lock size={14} color="hsl(145 65% 50%)"/>
                                        <span style={{ fontSize: "0.8rem", color: "white", fontWeight: 600 }}>ILP Escrow</span>
                                    </div>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(145 65% 50%)" }}>
                                        {formatCurrency(total)} Secured
                                    </span>
                                </div>
                                <div style={{ height: 6, background: "hsl(220 20% 16%)", borderRadius: 99, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, hsl(145 65% 42%), hsl(145 65% 55%))", borderRadius: 99, transition: "width 0.8s ease" }}/>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "0.75rem", color: "hsl(220 15% 55%)" }}>
                                    <span>{formatCurrency(released)} Paid to you</span>
                                    <span>{formatCurrency(total - released)} Pending</span>
                                </div>
                            </div>

                            {/* Milestones */}
                            <div>
                                <h4 className="font-heading" style={{ fontSize: "1rem", color: "white", marginBottom: "1rem" }}>Milestones & Deliverables</h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                    {milestones.map((m) => {
                                        const mStatus = (m.status || 'pending').toUpperCase();
                                        const isActive = mStatus === "IN_PROGRESS";
                                        const isRevision = mStatus === "NEEDS_REVISION";
                                        const isReview = mStatus === "UNDER_REVIEW" || mStatus === "IN_REVIEW";
                                        const isApproved = mStatus === "APPROVED";
                                        const isPaid = mStatus === "PAID";

                                        return (
                                            <div key={m.id} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
                                                padding: "1rem", borderRadius: 8,
                                                background: isPaid ? "hsl(145 65% 50% / 0.05)" : isApproved ? "hsl(38 92% 60% / 0.05)" : isActive ? "hsl(217 91% 55% / 0.05)" : isRevision ? "hsl(0 84% 60% / 0.05)" : "hsl(220 14% 10%)",
                                                border: isPaid ? "1px solid hsl(145 65% 50% / 0.2)" : isApproved ? "1px solid hsl(38 92% 60% / 0.2)" : isActive ? "1px solid hsl(217 91% 55% / 0.2)" : isRevision ? "1px solid hsl(0 84% 60% / 0.2)" : "1px solid hsl(220 20% 16%)",
                                            }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: 200 }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                                        background: isPaid ? "hsl(145 65% 42% / 0.15)" : isApproved ? "hsl(38 92% 60% / 0.15)" : isActive ? "hsl(217 91% 55% / 0.15)" : isRevision ? "hsl(0 84% 60% / 0.15)" : "hsl(220 20% 16%)",
                                                    }}>
                                                        <MilestoneStatusIcon status={mStatus}/>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "white", marginBottom: 2 }}>{m.title}</div>
                                                        <MilestoneStatusLabel status={mStatus}/>
                                                    </div>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                                    <div style={{ textAlign: "right" }}>
                                                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "white" }}>{formatCurrency(m.amount)}</div>
                                                        {isPaid && <div style={{ fontSize: "0.7rem", color: "hsl(145 65% 50%)" }}>Paid ✓</div>}
                                                        {isApproved && <div style={{ fontSize: "0.7rem", color: "hsl(38 92% 60%)" }}>Pending Release</div>}
                                                    </div>

                                                    {(isActive || isRevision) && (
                                                        <Link to={`/dashboard/freelancer/contracts/${job.id}/submit/${m.id}`} className="btn btn-primary btn-sm submit-milestone-btn">
                                                            <Upload size={14}/>
                                                            {isRevision ? "Resubmit" : "Submit Work"}
                                                        </Link>
                                                    )}
                                                    {isReview && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "hsl(38 92% 60%)" }}>
                                                            <Shield size={13}/> AI Reviewing…
                                                        </div>
                                                    )}
                                                    {isApproved && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "hsl(38 92% 60%)" }}>
                                                            <Clock size={13}/> Awaiting Employer
                                                        </div>
                                                    )}
                                                    {isPaid && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "hsl(145 65% 50%)" }}>
                                                            <Zap size={13}/> Paid
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {!loading && filtered.length === 0 && (
                    <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
                        <FileText size={48} color="hsl(220 15% 25%)" style={{ margin: "0 auto 1rem" }}/>
                        <h3 className="font-heading" style={{ fontSize: "1.1rem", color: "white", marginBottom: "0.5rem" }}>No active contracts</h3>
                        <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem" }}>
                            Contracts appear here once an employer hires you. Apply to jobs in Opportunities to get started.
                        </p>
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
