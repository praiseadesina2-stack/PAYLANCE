"use client";
import { useAuthStore } from "@/lib/store";
import { useJobsStore } from "@/lib/jobs-store";
import { DEMO_JOBS, DEMO_FREELANCERS } from "@/lib/data";
import { formatCurrency, getInitials } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Briefcase, Users, FileText, Wallet, ArrowRight, Plus, Search, Zap } from "lucide-react";
export default function EmployerDashboard() {
    const user = useAuthStore((s) => s.user);
    const jobs = useJobsStore((s) => s.jobs);
    const liveJobs = jobs.filter((j) => j.employerId === (user?.id || ""));
    const allJobs = liveJobs.length > 0 ? liveJobs : DEMO_JOBS;
    const activeJobs = allJobs.filter(j => j.status === "IN_PROGRESS" || j.status === "OPEN");
    const escrowLocked = allJobs
        .filter(j => j.status === "IN_PROGRESS")
        .reduce((sum, j) => sum + (j.escrow?.funded - j.escrow?.released || 0), 0);
    const stats = [
        { label: "Total Spent", value: formatCurrency(0), sub: "Based on completed work", icon: Wallet, color: "blue" },
        { label: "Active Jobs", value: "0", sub: `0 seeking talent`, icon: Briefcase, color: "cyan" },
        { label: "ILP Balance", value: formatCurrency(user?.balance || 0), sub: "Secured on ILP", icon: FileText, color: "blue" },
        { label: "Talent Network", value: "0", sub: "Verified freelancers", icon: Users, color: "cyan" },
    ];
    return (<div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <div className="status-dot online"/>
            <span style={{ fontSize: "0.78rem", color: "hsl(145 65% 45%)", fontWeight: 600 }}>ILP Network Connected</span>
          </div>
          <h1 className="font-heading" style={{ fontSize: "1.75rem", fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>
            Welcome back, {user?.name} 🏢
          </h1>
        </div>
        <Link to="/dashboard/employer/jobs/new" className="btn btn-primary">
          <Plus size={16}/> Post New Job
        </Link>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
        {stats.map(({ label, value, sub, icon: Icon, color }) => (<div key={label} className="card metric-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.78rem", color: "hsl(220 15% 55%)", fontWeight: 600 }}>{label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                background: color === "cyan" ? "hsl(200 100% 60% / 0.12)" : "hsl(217 91% 55% / 0.15)",
            }}>
                <Icon size={16} color={color === "cyan" ? "hsl(200 100% 65%)" : "hsl(217 91% 70%)"}/>
              </div>
            </div>
            <div>
              <div className="font-heading" style={{ fontSize: "1.4rem", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>{value}</div>
              <div style={{ fontSize: "0.75rem", color: "hsl(220 15% 50%)", marginTop: 2 }}>{sub}</div>
            </div>
          </div>))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", alignItems: "start" }}>
        {/* Active Jobs */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 className="font-heading" style={{ fontSize: "1rem", fontWeight: 700, color: "white" }}>Active Projects</h2>
            <Link to="/dashboard/employer/jobs" className="btn btn-ghost btn-sm" style={{ fontSize: "0.78rem" }}>View all <ArrowRight size={13}/></Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {activeJobs.map(job => (<div key={job.id} className="card card-hover" style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div>
                    <div className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700, color: "white", marginBottom: "0.2rem" }}>{job.title}</div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {(job.skills || []).slice(0, 3).map(s => (<span key={s} style={{ fontSize: "0.7rem", color: "hsl(220 15% 55%)", background: "hsl(220 20% 12%)", padding: "0.1rem 0.4rem", borderRadius: 4 }}>{s}</span>))}
                      {(job.skills || []).length > 3 && <span style={{ fontSize: "0.7rem", color: "hsl(220 15% 55%)" }}>+{(job.skills || []).length - 3}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white" }}>{formatCurrency(job.budget)}</div>
                    <span className={`badge ${job.status === "OPEN" ? "badge-cyan" : "badge-blue"}`} style={{ marginTop: 4 }}>{job.status.replace("_", " ")}</span>
                  </div>
                </div>

                {job.status === "OPEN" ? (<div style={{ background: "hsl(200 100% 60% / 0.08)", border: "1px solid hsl(200 100% 60% / 0.2)", borderRadius: 8, padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(200 100% 60% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Search size={16} color="hsl(200 100% 65%)"/>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "white" }}>3 AI Matches Found</div>
                        <div style={{ fontSize: "0.72rem", color: "hsl(220 15% 55%)" }}>Top match: 96% fit</div>
                      </div>
                    </div>
                    <Link to={`/dashboard/employer/jobs/${job.id}/matches`} className="btn btn-outline btn-sm" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}>Review Matches</Link>
                  </div>) : (<>
                    {/* Escrow bar */}
                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.72rem", color: "hsl(220 15% 50%)" }}>Escrow Funded</span>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "hsl(145 65% 50%)" }}>{formatCurrency(job.escrow.funded)} / {formatCurrency(job.escrow.total)}</span>
                      </div>
                      <div className="meter-bar">
                        <div className="meter-fill" style={{ width: `${(job.escrow.funded / job.escrow.total) * 100}%` }}/>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid hsl(220 20% 16%)", paddingTop: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div className="avatar" style={{ width: 24, height: 24, fontSize: "0.6rem" }}>{getInitials(job.freelancerName || "")}</div>
                        <span style={{ fontSize: "0.8rem", color: "hsl(220 15% 75%)" }}>{job.freelancerName}</span>
                      </div>
                      <Link to={`/dashboard/employer/jobs/${job.id}/contract`} className="btn btn-ghost btn-sm" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}>Manage Contract</Link>
                    </div>
                  </>)}
              </div>))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Top Talent */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
              <h2 className="font-heading" style={{ fontSize: "1rem", fontWeight: 700, color: "white" }}>Your Top Talent</h2>
            </div>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {DEMO_FREELANCERS.slice(0, 2).map((f) => (<div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: "0.75rem", overflow: "hidden" }}>
                    {f.avatar && f.avatar.startsWith('http') ? (
                      <img src={f.avatar} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      getInitials(f.name)
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
                      <span style={{ fontSize: "0.72rem", color: "hsl(145 65% 50%)" }}>★ {f.trustScore}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(220 15% 55%)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.title}</div>
                  </div>
                </div>))}
              <Link to="/dashboard/employer/network" className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: "0.25rem", fontSize: "0.78rem" }}>View entire network</Link>
            </div>
          </div>

          {/* Verification Activity */}
          <div className="card" style={{ background: "linear-gradient(135deg, hsl(217 91% 55% / 0.08), transparent)", borderColor: "hsl(217 91% 55% / 0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <Zap size={16} color="hsl(217 91% 65%)"/>
              <span className="font-heading" style={{ fontSize: "0.9rem", fontWeight: 700, color: "white" }}>AI Verification Log</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem" }}>
                <span style={{ color: "hsl(145 65% 50%)", fontWeight: 600 }}>✓ Approved</span><span style={{ color: "hsl(220 15% 65%)" }}>: M1 Deliverable (FinTech API)</span>
                <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 45%)", marginTop: 2 }}>2 hours ago • $1,200 released</div>
              </div>
              <div style={{ fontSize: "0.8rem" }}>
                <span style={{ color: "hsl(38 92% 50%)", fontWeight: 600 }}>⚠ Revision</span><span style={{ color: "hsl(220 15% 65%)" }}>: M2 Docs (Missing setup guide)</span>
                <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 45%)", marginTop: 2 }}>Yesterday • $800 locked</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
}
