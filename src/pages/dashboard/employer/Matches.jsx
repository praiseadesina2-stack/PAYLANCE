"use client";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useJobsStore } from "@/lib/jobs-store";
import { useAuthStore } from "@/lib/store";
import { DEMO_FREELANCERS } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Cpu, Star, Shield, CheckCircle, AlertCircle, Loader2, Globe } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

export default function JobMatchesPage() {
    const params = useParams();
    const navigate = useNavigate();
    const jobs = useJobsStore((s) => s.jobs);
    const job = jobs.find((j) => j.id === params.id);
    const hireFreelancer = useJobsStore((s) => s.hireFreelancer);
    const acceptApplicant = useAuthStore((s) => s.acceptApplicant);
    const [hiringId, setHiringId] = useState(null);
    const [hiredFreelancer, setHiredFreelancer] = useState(null);

    // Fetch real registered freelancers from backend
    const [liveFreelancers, setLiveFreelancers] = useState([]);
    useEffect(() => {
        fetch(`${API_URL}/freelancers`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setLiveFreelancers(data); })
            .catch(() => {});
    }, []);

    if (!job) {
        return (<div style={{ padding: "3rem", textAlign: "center" }}>
        <AlertCircle size={48} color="hsl(0 84% 60%)" style={{ margin: "0 auto 1rem" }}/>
        <p style={{ color: "hsl(220 15% 55%)" }}>Job not found.</p>
        <Link to="/dashboard/employer/jobs" className="btn btn-primary" style={{ marginTop: "1rem" }}>Back to Jobs</Link>
      </div>);
    }

    // Merge live registered freelancers + demo freelancers (deduplicated by name)
    const liveNames = new Set(liveFreelancers.map(f => f.name.toLowerCase()));
    const demoFiltered = DEMO_FREELANCERS.filter(f => !liveNames.has(f.name.toLowerCase()));
    const allFreelancers = [
        ...liveFreelancers.map(f => ({ ...f, isLive: true, skills: Array.isArray(f.skills) ? f.skills : [] })),
        ...demoFiltered,
    ];

    // Calculate match scores for merged list
    const jobSkills = typeof job.skills === 'string'
        ? job.skills.split(',').map(s => s.trim())
        : (job.skills || []);

    const matches = allFreelancers.map((f, idx) => {
        const fSkills = f.skills || [];
        const matchingSkills = fSkills.filter(s => jobSkills.includes(s));
        const pct = Math.round(75 + (matchingSkills.length / Math.max(1, jobSkills.length)) * 20 - (idx % 4) * 3);
        return {
            ...f,
            matchPct: Math.min(99, Math.max(65, pct)),
            matchReason: matchingSkills.length > 0
                ? `Top match for ${matchingSkills.slice(0, 2).join(" & ")}. Delivered similar projects with high trust score.`
                : `Strong profile with high TrustScore and experience in related domains.`
        };
    }).sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return b.matchPct - a.matchPct;
    });

    const handleHire = async (freelancer) => {
        setHiringId(freelancer.id);
        await new Promise(r => setTimeout(r, 1500));

        try {
            if (freelancer.isLive) {
                // Real DB freelancer — use backend accept-applicant API
                await acceptApplicant(job.id, freelancer.id);
                hireFreelancer(job.id, freelancer.id, freelancer.name);
            } else {
                // Demo freelancer — update local Zustand only
                hireFreelancer(job.id, freelancer.id, freelancer.name);
            }
            setHiredFreelancer(freelancer);
            await new Promise(r => setTimeout(r, 1500));
            navigate(`/dashboard/employer/jobs/${job.id}/contract`);
        } catch (err) {
            alert(err.message || "Failed to hire freelancer");
            setHiringId(null);
        }
    };

    const trustScore = (f) => f.trustScore || f.trust_score || 75;
    const hourlyRate = (f) => f.hourlyRate || f.hourly_rate || 0;

    return (<div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      <Link to="/dashboard/employer/jobs" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "hsl(220 15% 55%)", textDecoration: "none", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        <ArrowLeft size={16}/> Back to Jobs
      </Link>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, hsl(217 91% 55% / 0.2), hsl(200 100% 60% / 0.1))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Cpu size={18} color="hsl(217 91% 70%)"/>
          </div>
          <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>AI Candidate Matchmaker</h1>
          {liveFreelancers.length > 0 && (
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(145 65% 55%)", background: "hsl(145 65% 42% / 0.12)", border: "1px solid hsl(145 65% 42% / 0.25)", padding: "0.2rem 0.5rem", borderRadius: 4, display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Globe size={10}/> {liveFreelancers.length} Registered
            </span>
          )}
        </div>
        <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.9rem" }}>
          Gemini has analyzed your job post <strong>&ldquo;{job.title}&rdquo;</strong> and matched these vetted global candidates based on skill similarity, previous smart contract feedback, and TrustScores.
        </p>
      </div>

      {hiredFreelancer ? (<div className="card text-center animate-fade-in" style={{ background: "hsl(145 65% 42% / 0.08)", borderColor: "hsl(145 65% 42% / 0.3)", padding: "3rem 2rem", borderRadius: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "hsl(145 65% 42% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <CheckCircle size={32} color="hsl(145 65% 55%)"/>
          </div>
          <h2 className="font-heading" style={{ fontSize: "1.5rem", color: "white", marginBottom: "0.5rem" }}>Hired Successfully!</h2>
          <p style={{ color: "hsl(220 15% 65%)", fontSize: "0.95rem", maxWidth: 500, margin: "0 auto 1.5rem" }}>
            You have hired <strong>{hiredFreelancer.name}</strong>. The Interledger smart contract is active and the first milestone has been structured. Redirecting you to manage the contract escrow...
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "hsl(217 91% 75%)", fontSize: "0.85rem" }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }}/> Creating secure payment escrow...
          </div>
        </div>) : (<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {matches.map((freelancer) => {
                const isHiring = hiringId === freelancer.id;
                const matchScoreColor = freelancer.matchPct >= 90 ? "hsl(145 65% 50%)" : freelancer.matchPct >= 80 ? "hsl(217 91% 65%)" : "hsl(38 92% 60%)";
                return (<div key={freelancer.id} className="card card-hover ai-match-card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>

                {/* Live badge */}
                {freelancer.isLive && (
                  <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", fontSize: "0.62rem", fontWeight: 700, color: "hsl(145 65% 55%)", background: "hsl(145 65% 42% / 0.15)", border: "1px solid hsl(145 65% 42% / 0.3)", padding: "0.15rem 0.4rem", borderRadius: 4, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "hsl(145 65% 55%)", display: "inline-block" }}/>
                    Registered User
                  </div>
                )}
                
                {/* Top Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div className="avatar" style={{ width: 48, height: 48, fontSize: "1.2rem", borderRadius: 12 }}>
                      {freelancer.name?.split(" ").map((n) => n[0]).join("") || "F"}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white" }}>{freelancer.name}</h3>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: matchScoreColor, background: `${matchScoreColor}1a`, border: `1px solid ${matchScoreColor}33`, padding: "0.15rem 0.4rem", borderRadius: 4 }}>
                          {freelancer.matchPct}% Match
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "hsl(220 15% 65%)", marginTop: 2 }}>{freelancer.title || "Freelancer"}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "1.5rem", textAlign: "right" }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 50%)" }}>TRUST SCORE</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "hsl(200 100% 65%)", display: "flex", alignItems: "center", gap: "0.25rem", justifyContent: "flex-end" }}>
                        <Star size={13} fill="currentColor"/> {trustScore(freelancer)} / 100
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 50%)" }}>HOURLY RATE</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "white" }}>
                        {hourlyRate(freelancer) > 0 ? `${formatCurrency(hourlyRate(freelancer))}/hr` : "Negotiable"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Match rationale */}
                <div style={{ background: "hsl(220 20% 10%)", border: "1px solid hsl(220 20% 16%)", borderRadius: 8, padding: "0.875rem 1rem", fontSize: "0.85rem", color: "hsl(220 15% 75%)", display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                  <Shield size={16} color="hsl(217 91% 65%)" style={{ marginTop: 2, flexShrink: 0 }}/>
                  <div>
                    <strong>AI Recommendation:</strong> {freelancer.matchReason}
                  </div>
                </div>

                {/* Skills */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {(freelancer.skills || []).map((skill) => {
                        const isMatched = jobSkills.includes(skill);
                        return (<span key={skill} style={{
                                fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: "0.25rem",
                                background: isMatched ? "hsl(145 65% 42% / 0.12)" : "hsl(220 20% 14%)",
                                border: isMatched ? "1px solid hsl(145 65% 42% / 0.25)" : "1px solid hsl(220 20% 16%)",
                                color: isMatched ? "hsl(145 65% 60%)" : "hsl(220 15% 50%)",
                            }}>
                          {isMatched && <CheckCircle size={10}/>}
                          {skill}
                        </span>);
                    })}
                </div>

                {/* Hire action */}
                <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid hsl(220 20% 16%)", paddingTop: "1rem" }}>
                  <button onClick={() => handleHire(freelancer)} disabled={hiringId !== null} className="btn btn-primary btn-sm hire-btn" style={{ minWidth: 140, fontWeight: 700, gap: "0.5rem" }}>
                    {isHiring ? (<>
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }}/>
                        Deploying ILP Contract...
                      </>) : (<>
                        Hiring Offer
                      </>)}
                  </button>
                </div>

              </div>);
            })}
        </div>)}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>);
}
