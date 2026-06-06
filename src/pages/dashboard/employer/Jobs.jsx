"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { useJobsStore } from "@/lib/jobs-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Briefcase, Cpu, Lock, Users, X, CheckCircle, Loader2, Star, ArrowRight, UserCheck } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

export default function EmployerJobsPage() {
    const user = useAuthStore((s) => s.user);
    const acceptApplicant = useAuthStore((s) => s.acceptApplicant);
    const jobs = useJobsStore((s) => s.jobs);
    const navigate = useNavigate();

    const liveJobs = jobs.filter((j) => j.employerId === (user?.id || ""));
    const [filter, setFilter] = useState("ALL");
    const [search, setSearch] = useState("");

    // Backend jobs (if user is logged in)
    const [backendJobs, setBackendJobs] = useState([]);
    const [loadingBackend, setLoadingBackend] = useState(false);

    // Applicants panel state
    const [viewingApplicantsJob, setViewingApplicantsJob] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [acceptingId, setAcceptingId] = useState(null);
    const [acceptSuccess, setAcceptSuccess] = useState(null);

    // Applicant counts per job
    const [applicantCounts, setApplicantCounts] = useState({});

    const token = localStorage.getItem('paylance_token');

    // Fetch backend jobs for this employer
    useEffect(() => {
        if (!user || !token) return;
        setLoadingBackend(true);
        fetch(`${API_URL}/jobs?employer_id=${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setBackendJobs(data);
            })
            .catch(() => {})
            .finally(() => setLoadingBackend(false));
    }, [user]);

    // Fetch applicant counts for backend jobs
    useEffect(() => {
        if (!token || backendJobs.length === 0) return;
        backendJobs.filter(j => j.status === 'open').forEach(job => {
            fetch(`${API_URL}/jobs/${job.id}/applications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(r => r.json())
                .then(apps => {
                    if (Array.isArray(apps)) {
                        setApplicantCounts(prev => ({ ...prev, [job.id]: apps.length }));
                    }
                })
                .catch(() => {});
        });
    }, [backendJobs, token]);

    const handleViewApplicants = (job) => {
        setViewingApplicantsJob(job);
        setLoadingApplicants(true);
        setApplicants([]);
        setAcceptSuccess(null);
        fetch(`${API_URL}/jobs/${job.id}/applications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setApplicants(data);
            })
            .catch(() => {})
            .finally(() => setLoadingApplicants(false));
    };

    const handleAccept = async (applicant) => {
        if (!viewingApplicantsJob) return;
        setAcceptingId(applicant.freelancer_id);
        try {
            const result = await acceptApplicant(viewingApplicantsJob.id, applicant.freelancer_id);
            setAcceptSuccess(result.freelancerName || applicant.name);
            // Refresh backend jobs
            setTimeout(() => {
                fetch(`${API_URL}/jobs?employer_id=${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json()).then(d => { if (Array.isArray(d)) setBackendJobs(d); });
                navigate(`/dashboard/employer/jobs/${viewingApplicantsJob.id}/contract`);
                setViewingApplicantsJob(null);
            }, 1500);
        } catch (err) {
            alert(err.message || "Failed to accept applicant");
        } finally {
            setAcceptingId(null);
        }
    };

    // Merge backend jobs + Zustand store jobs (deduplicated)
    const backendJobIds = new Set(backendJobs.map(j => j.id));
    const storeJobsNotInBackend = liveJobs.filter(j => !backendJobIds.has(j.id));

    // Normalize backend jobs to match Zustand structure
    const normalizedBackend = backendJobs.map(j => ({
        ...j,
        employerId: j.employer_id,
        employerName: j.employer_name,
        freelancerName: j.freelancer_name,
        status: j.status?.toUpperCase() || 'OPEN',
        isBackend: true,
        skills: typeof j.skills === 'string' ? j.skills.split(',').map(s => s.trim()) : (j.skills || []),
    }));

    const allJobs = [...normalizedBackend, ...storeJobsNotInBackend];
    const filteredJobs = allJobs.filter((j) => {
        if (filter !== "ALL" && j.status !== filter) return false;
        if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (<div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>Jobs & Contracts</h1>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginTop: 4 }}>Manage your active projects and review applicants</p>
        </div>
        <Link to="/dashboard/employer/jobs/new" className="btn btn-primary">
          <Plus size={16}/> Post New Job
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <Search size={16} color="hsl(220 15% 50%)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}/>
          <input className="input" placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: "2.25rem" }}/>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {["ALL", "OPEN", "IN_PROGRESS", "COMPLETED"].map((f) => (<button key={f} onClick={() => setFilter(f)} style={{
                padding: "0.5rem 1rem", borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap",
                background: filter === f ? "hsl(217 91% 55% / 0.15)" : "hsl(220 14% 10%)",
                border: filter === f ? "1px solid hsl(217 91% 55% / 0.5)" : "1px solid hsl(220 20% 16%)",
                color: filter === f ? "hsl(217 91% 70%)" : "hsl(220 15% 55%)",
            }}>
              {f.replace("_", " ")}
            </button>))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filteredJobs.map((job) => {
            const pct = job.escrow ? Math.round((job.escrow.released / job.escrow.total) * 100) : 0;
            const applicantCount = applicantCounts[job.id] || 0;

            return (<div key={job.id} className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1, paddingRight: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                    <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white" }}>{job.title}</h3>
                    {job.isBackend && (<span style={{ fontSize: "0.65rem", fontWeight: 700, color: "hsl(145 65% 55%)", background: "hsl(145 65% 42% / 0.12)", border: "1px solid hsl(145 65% 42% / 0.25)", padding: "0.1rem 0.4rem", borderRadius: 4, textTransform: "uppercase" }}>
                        Live
                      </span>)}
                    {/* Applicant count badge */}
                    {job.status === "OPEN" && job.isBackend && applicantCount > 0 && (
                      <button
                        onClick={() => handleViewApplicants(job)}
                        style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.68rem", fontWeight: 700, color: "hsl(217 91% 70%)", background: "hsl(217 91% 55% / 0.12)", border: "1px solid hsl(217 91% 55% / 0.3)", padding: "0.15rem 0.5rem", borderRadius: 4, cursor: "pointer" }}
                      >
                        <Users size={10}/> {applicantCount} Applicant{applicantCount > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "hsl(220 15% 55%)", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                    {job.createdAt && <span>Posted: {formatDate(job.createdAt)}</span>}
                    {job.deadline && <span>Deadline: {formatDate(job.deadline)}</span>}
                    <span>Budget: <strong style={{ color: "white" }}>{formatCurrency(job.budget)}</strong></span>
                    {(job.freelancerName || job.freelancer_name) && <span>Freelancer: <strong style={{ color: "white" }}>{job.freelancerName || job.freelancer_name}</strong></span>}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {job.skills?.map((s) => (<span key={s} style={{ fontSize: "0.7rem", color: "hsl(220 15% 65%)", background: "hsl(220 20% 14%)", padding: "0.2rem 0.5rem", borderRadius: 4 }}>{s}</span>))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem", flexShrink: 0 }}>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 6,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    background: job.status === "OPEN" ? "hsl(200 100% 60% / 0.12)" : job.status === "COMPLETED" ? "hsl(145 65% 42% / 0.12)" : "hsl(217 91% 55% / 0.12)",
                    color: job.status === "OPEN" ? "hsl(200 100% 70%)" : job.status === "COMPLETED" ? "hsl(145 65% 55%)" : "hsl(217 91% 70%)",
                  }}>
                    {job.status.replace("_", " ")}
                  </span>

                  {job.status === "OPEN" && job.isBackend && applicantCount > 0 && (
                    <button onClick={() => handleViewApplicants(job)} className="btn btn-primary btn-sm" style={{ gap: "0.35rem" }}>
                      <UserCheck size={13}/> Review Applicants
                    </button>
                  )}
                  {job.status === "OPEN" && job.isBackend && applicantCount === 0 && (
                    <Link to={`/dashboard/employer/jobs/${job.id}/matches`} className="btn btn-outline btn-sm">
                      <Cpu size={14}/> AI Matches
                    </Link>
                  )}
                  {(job.status === "IN_PROGRESS" || job.status === "COMPLETED") && (
                    <Link to={`/dashboard/employer/jobs/${job.id}/contract`} className="btn btn-outline btn-sm">
                      <Lock size={14}/> Manage Contract
                    </Link>
                  )}
                </div>
              </div>

              {/* Escrow progress bar */}
              {job.status !== "OPEN" && job.escrow && (<div style={{ borderTop: "1px solid hsl(220 20% 16%)", paddingTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Lock size={12} color="hsl(145 65% 50%)"/>
                      <span style={{ fontSize: "0.75rem", color: "hsl(220 15% 55%)" }}>Escrow Progress</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(145 65% 50%)" }}>
                      {formatCurrency(job.escrow.released)} released of {formatCurrency(job.escrow.total)}
                    </span>
                  </div>
                  <div style={{ height: 8, background: "hsl(220 20% 14%)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, hsl(145 65% 42%), hsl(145 65% 55%))", borderRadius: 99, transition: "width 0.8s ease" }}/>
                  </div>
                </div>)}
            </div>);
        })}

        {filteredJobs.length === 0 && !loadingBackend && (<div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <Briefcase size={48} color="hsl(220 15% 25%)" style={{ margin: "0 auto 1rem" }}/>
            <h3 className="font-heading" style={{ fontSize: "1.1rem", color: "white", marginBottom: "0.5rem" }}>No jobs yet</h3>
            <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Post your first job and let Gemini AI structure it into verified milestones.</p>
            <Link to="/dashboard/employer/jobs/new" className="btn btn-primary">
              <Plus size={16}/> Post First Job
            </Link>
          </div>)}
      </div>

      {/* Applicants Panel Modal */}
      {viewingApplicantsJob && (<div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} className="animate-fade-in">
          <div className="card" style={{ width: "100%", maxWidth: 600, padding: "1.75rem", position: "relative", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <button onClick={() => setViewingApplicantsJob(null)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "hsl(220 15% 55%)" }}>
              <X size={20}/>
            </button>

            <div style={{ marginBottom: "1.25rem" }}>
              <h3 className="font-heading" style={{ fontSize: "1.2rem", color: "white", marginBottom: "0.25rem" }}>
                Applicants for "{viewingApplicantsJob.title}"
              </h3>
              <p style={{ fontSize: "0.82rem", color: "hsl(220 15% 55%)" }}>
                Select a freelancer to hire — they'll be notified and a contract will be created.
              </p>
            </div>

            {acceptSuccess ? (<div style={{ textAlign: "center", padding: "2rem" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "hsl(145 65% 42% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                  <CheckCircle size={28} color="hsl(145 65% 55%)"/>
                </div>
                <h4 className="font-heading" style={{ color: "white", fontSize: "1.1rem", marginBottom: "0.5rem" }}>Hired {acceptSuccess}!</h4>
                <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.85rem" }}>Redirecting to contract management…</p>
              </div>) : (<div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
                {loadingApplicants && (<div style={{ textAlign: "center", padding: "2rem", color: "hsl(220 15% 50%)", fontSize: "0.85rem" }}>
                    Loading applicants…
                  </div>)}

                {!loadingApplicants && applicants.length === 0 && (<div style={{ textAlign: "center", padding: "2rem" }}>
                    <Users size={40} color="hsl(220 15% 30%)" style={{ margin: "0 auto 1rem" }}/>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem" }}>No applicants yet. Share the job or wait for freelancers to apply.</p>
                  </div>)}

                {applicants.map(app => (
                  <div key={app.freelancer_id} className="card" style={{ display: "flex", gap: "1rem", alignItems: "flex-start", padding: "1rem" }}>
                    <div className="avatar" style={{ width: 40, height: 40, fontSize: "0.9rem", borderRadius: 10, flexShrink: 0 }}>
                      {app.name?.split(" ").map(n => n[0]).join("") || "F"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: "white", fontSize: "0.9rem" }}>{app.name}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.72rem", color: "hsl(38 92% 60%)" }}>
                          <Star size={11} fill="currentColor"/> {app.trust_score || 75}/100
                        </span>
                        {app.hourly_rate > 0 && (
                          <span style={{ fontSize: "0.72rem", color: "hsl(220 15% 55%)" }}>{formatCurrency(app.hourly_rate)}/hr</span>
                        )}
                      </div>
                      {app.cover_note && (
                        <p style={{ fontSize: "0.8rem", color: "hsl(220 15% 65%)", lineHeight: 1.5, marginBottom: "0.5rem" }}>
                          "{app.cover_note}"
                        </p>
                      )}
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {(app.skills || []).slice(0, 4).map(s => (
                          <span key={s} style={{ fontSize: "0.68rem", color: "hsl(220 15% 55%)", background: "hsl(220 20% 12%)", padding: "0.1rem 0.4rem", borderRadius: 4 }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flexShrink: 0, gap: "0.35rem" }}
                      onClick={() => handleAccept(app)}
                      disabled={acceptingId !== null}
                    >
                      {acceptingId === app.freelancer_id
                        ? (<><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }}/> Hiring…</>)
                        : (<><ArrowRight size={13}/> Hire</>)}
                    </button>
                  </div>
                ))}
              </div>)}
          </div>
        </div>)}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>);
}
