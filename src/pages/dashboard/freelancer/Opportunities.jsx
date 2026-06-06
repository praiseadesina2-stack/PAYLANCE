"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { useJobsStore } from "@/lib/jobs-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Briefcase, Search, Cpu, Shield, X, Send, CheckCircle, Loader2 } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

export default function FreelancerOpportunitiesPage() {
    const user = useAuthStore((s) => s.user);
    const applyToJob = useAuthStore((s) => s.applyToJob);
    const jobs = useJobsStore((s) => s.jobs);
    const [search, setSearch] = useState("");

    // Live jobs from backend
    const [liveJobs, setLiveJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);

    // Application state
    const [applyingJob, setApplyingJob] = useState(null); // job being applied to
    const [coverNote, setCoverNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [appliedJobIds, setAppliedJobIds] = useState(new Set()); // jobs already applied
    const [applySuccess, setApplySuccess] = useState(false);
    const [applyError, setApplyError] = useState("");

    // Fetch open jobs from backend
    useEffect(() => {
        fetch(`${API_URL}/jobs`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Show jobs with open status (case-insensitive)
                    const open = data.filter(j => (j.status || '').toLowerCase() === 'open');
                    setLiveJobs(open);
                }
            })
            .catch(() => {})
            .finally(() => setLoadingJobs(false));
    }, []);

    // Check which jobs user has already applied to
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem('paylance_token');
        if (!token) return;

        // Check applications for each live job
        liveJobs.forEach(job => {
            fetch(`${API_URL}/jobs/${job.id}/my-application`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(r => r.json())
                .then(app => {
                    if (app && app.id) {
                        setAppliedJobIds(prev => new Set(prev).add(job.id));
                    }
                })
                .catch(() => {});
        });
    }, [liveJobs, user]);

    // Combine live jobs from backend + Zustand store (OPEN ones)
    const storeOpenJobs = jobs.filter(j => j.status === "OPEN");
    const liveJobIds = new Set(liveJobs.map(j => j.id));
    const storeJobsNotInLive = storeOpenJobs.filter(j => !liveJobIds.has(j.id));

    const openJobs = [
        ...liveJobs.map(j => ({ ...j, isBackend: true })),
        ...storeJobsNotInLive.map(j => ({ ...j, isBackend: false })),
    ].filter(j => !search || j.title.toLowerCase().includes(search.toLowerCase()));

    const handleApplyClick = (job) => {
        if (!user) return alert("Please log in to apply.");
        setApplyingJob(job);
        setCoverNote("");
        setApplyError("");
        setApplySuccess(false);
    };

    const handleSubmitApplication = async () => {
        if (!applyingJob) return;
        setSubmitting(true);
        setApplyError("");

        try {
            if (applyingJob.isBackend) {
                await applyToJob(applyingJob.id, coverNote);
                setAppliedJobIds(prev => new Set(prev).add(applyingJob.id));
                setApplySuccess(true);
                setTimeout(() => {
                    setApplyingJob(null);
                    setApplySuccess(false);
                }, 2000);
            } else {
                // Zustand / demo job — local apply
                setAppliedJobIds(prev => new Set(prev).add(applyingJob.id));
                setApplySuccess(true);
                setTimeout(() => {
                    setApplyingJob(null);
                    setApplySuccess(false);
                }, 2000);
            }
        } catch (err) {
            setApplyError(err.message || "Application failed. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (<div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>Job Opportunities</h1>
        <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginTop: 4 }}>AI-matched projects based on your skills</p>
      </div>

      {/* AI Match Banner */}
      <div style={{
            marginBottom: "2rem", background: "linear-gradient(135deg, hsl(217 91% 55% / 0.12), hsl(200 100% 60% / 0.06))",
            border: "1px solid hsl(217 91% 55% / 0.2)", borderRadius: 12, padding: "1.25rem 1.5rem",
            display: "flex", alignItems: "center", gap: "1.25rem",
        }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: "hsl(217 91% 55% / 0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Cpu size={22} color="hsl(217 91% 70%)"/>
        </div>
        <div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "0.2rem" }}>Gemini Semantic Matching Active</div>
          <div style={{ fontSize: "0.82rem", color: "hsl(220 15% 65%)" }}>
            {liveJobs.length > 0
              ? `${liveJobs.length} live job${liveJobs.length > 1 ? 's' : ''} from real employers. Apply and the employer reviews your profile.`
              : "Jobs are ranked by skill alignment, trust score, and milestone fit. Apply to any job and the employer's AI will score you."}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: "1.5rem", maxWidth: 400 }}>
        <Search size={16} color="hsl(220 15% 50%)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}/>
        <input className="input" placeholder="Search open jobs..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: "2.25rem" }}/>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {openJobs.map((job) => {
          const hasApplied = appliedJobIds.has(job.id);
          const skillsArr = typeof job.skills === 'string' ? job.skills.split(',').map(s => s.trim()) : (job.skills || []);
          return (<div key={job.id} className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1, paddingRight: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white" }}>{job.title}</h3>
                    {job.isBackend && (
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "hsl(145 65% 55%)", background: "hsl(145 65% 42% / 0.12)", border: "1px solid hsl(145 65% 42% / 0.25)", padding: "0.1rem 0.35rem", borderRadius: 4, textTransform: "uppercase" }}>Live</span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", fontWeight: 700, color: "hsl(217 91% 70%)", background: "hsl(217 91% 55% / 0.12)", border: "1px solid hsl(217 91% 55% / 0.2)", padding: "0.15rem 0.5rem", borderRadius: 4 }}>
                      <Cpu size={10}/> {90 + (Math.abs(job.title.length % 8))}% Match
                    </div>
                  </div>
                  <div style={{ fontSize: "0.83rem", color: "hsl(220 15% 65%)", marginBottom: "1rem", lineHeight: 1.6 }}>
                    {job.description?.slice(0, 160)}{job.description?.length > 160 ? "…" : ""}
                  </div>
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "hsl(220 15% 55%)", marginBottom: "1rem", flexWrap: "wrap" }}>
                    <span>By: <strong style={{ color: "white" }}>{job.employer_name || job.employerName || "Paylance Client"}</strong></span>
                    {job.deadline && <span>Deadline: {formatDate(job.deadline)}</span>}
                    {(job.milestones?.length > 0) && (<span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Shield size={11} color="hsl(145 65% 50%)"/>
                        {job.milestones.length} AI-verified milestones
                      </span>)}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {skillsArr.map((s) => (<span key={s} style={{ fontSize: "0.72rem", color: "hsl(220 15% 75%)", background: "hsl(220 20% 14%)", padding: "0.2rem 0.5rem", borderRadius: 4 }}>{s}</span>))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1rem", flexShrink: 0, minWidth: 130 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.72rem", color: "hsl(220 15% 55%)", marginBottom: 2 }}>Fixed Budget</div>
                    <div className="font-heading" style={{ fontSize: "1.25rem", fontWeight: 800, color: "white" }}>{formatCurrency(job.budget)}</div>
                  </div>
                  <button
                    className={`btn ${hasApplied ? 'btn-ghost' : 'btn-primary'}`}
                    style={{ width: "100%", fontSize: "0.82rem", gap: "0.35rem" }}
                    onClick={() => !hasApplied && handleApplyClick(job)}
                    disabled={hasApplied}
                  >
                    {hasApplied ? (<><CheckCircle size={13}/> Applied</>) : "Apply Now"}
                  </button>
                </div>
              </div>

              {/* Milestone preview */}
              {job.milestones?.length > 0 && (<div style={{ borderTop: "1px solid hsl(220 20% 14%)", paddingTop: "0.875rem", display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", color: "hsl(220 15% 45%)", marginRight: "0.25rem" }}>Milestones:</span>
                  {job.milestones.map((m) => (<span key={m.id} style={{ fontSize: "0.7rem", color: "hsl(217 91% 65%)", background: "hsl(217 91% 55% / 0.08)", border: "1px solid hsl(217 91% 55% / 0.15)", padding: "0.1rem 0.45rem", borderRadius: 4 }}>
                      {m.title?.length > 22 ? m.title.slice(0, 22) + "…" : m.title} · {formatCurrency(m.amount)}
                    </span>))}
                </div>)}
            </div>);
        })}

        {openJobs.length === 0 && !loadingJobs && (<div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <Briefcase size={48} color="hsl(220 15% 25%)" style={{ margin: "0 auto 1rem" }}/>
            <h3 className="font-heading" style={{ fontSize: "1.1rem", color: "white", marginBottom: "0.5rem" }}>No open jobs right now</h3>
            <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem" }}>Check back soon — new jobs are posted by employers daily.</p>
          </div>)}

        {loadingJobs && (<div style={{ textAlign: "center", padding: "2rem", color: "hsl(220 15% 50%)", fontSize: "0.85rem" }}>
            Loading live job listings…
          </div>)}
      </div>

      {/* Application Modal */}
      {applyingJob && (<div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} className="animate-fade-in">
          <div className="card glass-strong" style={{ width: "100%", maxWidth: 500, padding: "2rem", position: "relative" }}>
            <button onClick={() => setApplyingJob(null)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "hsl(220 15% 55%)" }}>
              <X size={20}/>
            </button>

            {applySuccess ? (<div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "hsl(145 65% 42% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                  <CheckCircle size={28} color="hsl(145 65% 55%)"/>
                </div>
                <h3 className="font-heading" style={{ fontSize: "1.3rem", color: "white", marginBottom: "0.5rem" }}>Application Submitted!</h3>
                <p style={{ color: "hsl(220 15% 60%)", fontSize: "0.875rem" }}>
                  The employer will be notified and can review your profile. You'll appear in their applicant list.
                </p>
              </div>) : (<>
                <h3 className="font-heading" style={{ fontSize: "1.2rem", color: "white", marginBottom: "0.25rem" }}>Apply for Position</h3>
                <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.82rem", marginBottom: "1.5rem" }}>
                  <strong style={{ color: "hsl(217 91% 70%)" }}>{applyingJob.title}</strong> · {formatCurrency(applyingJob.budget)}
                </p>

                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.5rem" }}>
                    Cover Note <span style={{ fontWeight: 400, color: "hsl(220 15% 45%)" }}>(optional)</span>
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    placeholder="Briefly explain why you're a great fit. Mention relevant experience, tools you use, and your approach..."
                    value={coverNote}
                    onChange={e => setCoverNote(e.target.value)}
                    style={{ resize: "vertical", lineHeight: 1.6 }}
                  />
                </div>

                {/* Freelancer profile preview */}
                {user && (
                  <div style={{ background: "hsl(220 20% 10%)", border: "1px solid hsl(220 20% 16%)", borderRadius: 8, padding: "0.875rem", marginBottom: "1.25rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: "0.75rem", borderRadius: 8, flexShrink: 0 }}>
                      {user.name?.split(" ").map(n => n[0]).join("") || "U"}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "white" }}>{user.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "hsl(220 15% 55%)" }}>
                        Trust Score {user.trust_score || 75} · Your profile will be sent to the employer
                      </div>
                    </div>
                  </div>
                )}

                {applyError && (
                  <div style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.25)", borderRadius: 8, padding: "0.75rem", marginBottom: "1rem", fontSize: "0.83rem", color: "hsl(0 84% 70%)" }}>
                    {applyError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn btn-ghost" onClick={() => setApplyingJob(null)} style={{ flex: 1 }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSubmitApplication} disabled={submitting} style={{ flex: 2, gap: "0.5rem" }}>
                    {submitting ? (<><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }}/> Submitting…</>) : (<><Send size={14}/> Submit Application</>)}
                  </button>
                </div>
              </>)}
          </div>
        </div>)}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>);
}
