"use client";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useJobsStore } from "@/lib/jobs-store";
import { verifyDeliverable } from "@/lib/gemini";
import { Upload, FileText, ArrowLeft, Shield, Cpu, CheckCircle, AlertTriangle, RotateCcw, X, Zap, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/store";
function formatCurrency(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
export default function SubmitMilestonePage() {
    const params = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const token = localStorage.getItem('paylance_token');

    const [job, setJob] = useState(null);
    const [milestone, setMilestone] = useState(null);
    const [loading, setLoading] = useState(true);

    const [notes, setNotes] = useState("");
    const [files, setFiles] = useState([]);
    const [fileInput, setFileInput] = useState("");
    const [verifyState, setVerifyState] = useState("idle");
    const [verdict, setVerdict] = useState(null);
    const [error, setError] = useState("");

    // Fetch the job and milestone from the backend
    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/jobs/${params.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setJob(data);
                    const m = data.milestones?.find(ms => ms.id === params.milestoneId);
                    if (m) {
                        try { m.deliverables = typeof m.deliverables === 'string' ? JSON.parse(m.deliverables) : m.deliverables; } catch(e) { m.deliverables = []; }
                        try { m.acceptanceCriteria = m.acceptance_criteria || m.acceptanceCriteria || ""; } catch(e) {}
                        setMilestone(m);
                    }
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchJob();
    }, [params.id, params.milestoneId, token]);

    if (loading) {
        return <div style={{ padding: "3rem", textAlign: "center", color: "hsl(220 15% 55%)" }}>Loading milestone...</div>;
    }

    if (!job || !milestone) {
        return (<div style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "hsl(220 15% 55%)" }}>Milestone not found.</p>
        <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ marginTop: "1rem" }}>Go Back</button>
      </div>);
    }
    
    // Status can be lower/uppercase from DB
    const mStatus = (milestone.status || 'pending').toUpperCase();

    if (mStatus !== "IN_PROGRESS" && mStatus !== "NEEDS_REVISION") {
        return (<div style={{ padding: "3rem", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "hsl(220 16% 14%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
          <Lock size={24} color="hsl(220 15% 40%)"/>
        </div>
        <h2 className="font-heading" style={{ color: "white", marginBottom: "0.5rem" }}>
          {mStatus === "APPROVED" || mStatus === "PAID" ? "This milestone is already approved." : "This milestone is not ready for submission."}
        </h2>
        <p style={{ color: "hsl(220 15% 55%)", marginBottom: "1.5rem", fontSize: "0.875rem" }}>Status: {mStatus}</p>
        <button onClick={() => navigate(-1)} className="btn btn-outline">← Back to Contracts</button>
      </div>);
    }
    function addFile() {
        const f = fileInput.trim();
        if (f && !files.includes(f)) {
            setFiles([...files, f]);
            setFileInput("");
        }
    }
    async function handleSubmit() {
        if (!job || !milestone)
            return;
        const currentFiles = [...files];
        if (fileInput.trim() && !currentFiles.includes(fileInput.trim())) {
            currentFiles.push(fileInput.trim());
        }
        const finalNotes = notes.trim() || "Delivered milestone project files and repositories.";
        if (finalNotes === "" && currentFiles.length === 0) {
            setError("Please add submission notes or attach files.");
            return;
        }
        setError("");
        setVerifyState("uploading");
        
        // Use the backend deliverable endpoint
        try {
            setVerifyState("verifying");
            
            // Generate the verification payload
            const deliverablePayload = JSON.stringify({ notes: finalNotes, files: currentFiles });
            
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/deliverables`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    milestone_id: milestone.id,
                    freelancer_id: user.id,
                    content: deliverablePayload
                })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to submit deliverable");
            }
            
            const result = await verifyDeliverable(milestone.title, milestone.description, milestone.acceptanceCriteria, milestone.deliverables || [], finalNotes, currentFiles, milestone.amount);
            
            // Always set status to UNDER_REVIEW — employer must manually approve, AI verdict is advisory only
                await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/milestones/${milestone.id}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ status: 'UNDER_REVIEW' })
                });
                
                // Record the AI verdict locally so the employer can read the report, but status stays UNDER_REVIEW
                useJobsStore.getState().recordVerdict(job.id, milestone.id, { ...result, verdict: 'UNDER_REVIEW_AI_COMPLETE' });
            
            setVerdict(result);
            setVerifyState("done");
        } catch (e) {
            setError("Submission failed: " + (e.message || "Unknown error."));
            setVerifyState("error");
        }
    }
    const verdictColor = verdict?.verdict === "APPROVED"
        ? "hsl(145 65% 45%)"
        : verdict?.verdict === "NEEDS_REVISION"
            ? "hsl(0 84% 60%)"
            : "hsl(38 92% 50%)";
    return (<div style={{ padding: "1.5rem", maxWidth: 700, margin: "0 auto" }}>
      <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", color: "hsl(220 15% 55%)", cursor: "pointer", fontSize: "0.875rem", marginBottom: "1.25rem", padding: 0 }}>
        <ArrowLeft size={16}/> Back to Contracts
      </button>

      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ fontSize: "0.78rem", color: "hsl(217 91% 60%)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.35rem" }}>Submit Milestone</div>
        <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>
          {milestone.title}
        </h1>
        <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {job.title} · {formatCurrency(milestone.amount)} on approval
        </p>
      </div>

      {/* Milestone context */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "white", marginBottom: "0.75rem" }}>What you need to deliver</h2>
        <p style={{ fontSize: "0.85rem", color: "hsl(220 15% 65%)", lineHeight: 1.6, marginBottom: "1rem" }}>{milestone.description}</p>
        
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "hsl(220 15% 45%)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Required Deliverables</div>
          {milestone.deliverables.map((d, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "hsl(200 100% 60%)", flexShrink: 0 }}/>
              <span style={{ fontSize: "0.82rem", color: "hsl(220 15% 65%)" }}>{d}</span>
            </div>))}
        </div>

        <div style={{ background: "hsl(145 65% 42% / 0.06)", border: "1px solid hsl(145 65% 42% / 0.15)", borderRadius: 8, padding: "0.75rem 0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
            <Shield size={13} color="hsl(145 65% 55%)"/>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "hsl(145 65% 55%)", textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Will Check</span>
          </div>
          <p style={{ fontSize: "0.8rem", color: "hsl(220 15% 60%)", lineHeight: 1.5 }}>{milestone.acceptanceCriteria}</p>
        </div>
      </div>

      {/* Submission form */}
      {verifyState === "idle" && (<div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "white" }}>Your Submission</h2>

          {milestone.status === "NEEDS_REVISION" && (<div style={{ background: "hsl(0 84% 60% / 0.08)", border: "1px solid hsl(0 84% 60% / 0.25)", borderRadius: 8, padding: "0.75rem", display: "flex", gap: "0.6rem" }}>
              <RotateCcw size={15} color="hsl(0 84% 65%)" style={{ flexShrink: 0, marginTop: 1 }}/>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "hsl(0 84% 70%)", marginBottom: "0.25rem" }}>Resubmission — address the feedback from the previous review</div>
                {milestone.verificationResult?.suggestedRevisions?.map((r, i) => (<div key={i} style={{ fontSize: "0.78rem", color: "hsl(220 15% 60%)", marginBottom: "0.15rem" }}>• {r}</div>))}
              </div>
            </div>)}

          {/* Notes */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Submission Notes *
            </label>
            <textarea className="input" placeholder="Explain what you built and how it meets each acceptance criterion. Gemini AI will use this to evaluate your submission..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} style={{ resize: "vertical", lineHeight: 1.6 }}/>
            <div style={{ fontSize: "0.72rem", color: "hsl(220 15% 40%)", marginTop: "0.3rem" }}>
              Pro tip: explicitly address each acceptance criterion. The more specific, the better your verification result.
            </div>
          </div>

          {/* Files */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Deliverable Files / Links
            </label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
              <input id="deliverable-url" className="input" placeholder="e.g. github.com/user/repo, figma.com/design/xxx, report.pdf" value={fileInput} onChange={(e) => setFileInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFile()} style={{ flex: 1 }}/>
              <button onClick={addFile} className="btn btn-outline" style={{ flexShrink: 0 }}>
                <Upload size={15}/> Add
              </button>
            </div>
            {files.length > 0 && (<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {files.map((f) => (<span key={f} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "hsl(217 91% 70%)", background: "hsl(217 91% 55% / 0.1)", border: "1px solid hsl(217 91% 55% / 0.25)", padding: "0.2rem 0.5rem", borderRadius: 4 }}>
                    <FileText size={11}/> {f}
                    <button onClick={() => setFiles(files.filter((x) => x !== f))} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(220 15% 45%)", display: "flex", padding: 0 }}>
                      <X size={11}/>
                    </button>
                  </span>))}
              </div>)}
          </div>

          {error && (<div style={{ background: "hsl(0 84% 60% / 0.1)", border: "1px solid hsl(0 84% 60% / 0.3)", borderRadius: 8, padding: "0.75rem", fontSize: "0.82rem", color: "hsl(0 84% 70%)", display: "flex", gap: "0.5rem" }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }}/> {error}
            </div>)}

          {/* AI info */}
          <div style={{ background: "hsl(217 91% 55% / 0.06)", border: "1px solid hsl(217 91% 55% / 0.15)", borderRadius: 8, padding: "0.75rem 0.875rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <Cpu size={16} color="hsl(217 91% 65%)" style={{ flexShrink: 0, marginTop: 1 }}/>
            <p style={{ fontSize: "0.8rem", color: "hsl(220 15% 60%)", lineHeight: 1.5 }}>
              Gemini AI will review your submission against the acceptance criteria. Approved submissions release <strong style={{ color: "white" }}>{formatCurrency(milestone.amount)}</strong> instantly to your ILP wallet. Average review time: under 30 seconds.
            </p>
          </div>

          <button id="submit-deliverable-btn" onClick={handleSubmit} className="btn btn-primary" style={{ padding: "0.875rem 1.5rem", fontSize: "1rem", fontWeight: 700 }}>
            <Shield size={18}/> Submit for AI Verification
          </button>
        </div>)}

      {/* Loading states */}
      {(verifyState === "uploading" || verifyState === "verifying") && (<div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "hsl(217 91% 55% / 0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", border: "1px solid hsl(217 91% 55% / 0.2)" }}>
            {verifyState === "uploading"
                ? <Upload size={28} color="hsl(217 91% 65%)" style={{ animation: "pulse 1s ease-in-out infinite" }}/>
                : <Cpu size={28} color="hsl(217 91% 65%)" style={{ animation: "spin 2s linear infinite" }}/>}
          </div>
          <h2 className="font-heading" style={{ fontSize: "1.25rem", color: "white", marginBottom: "0.5rem" }}>
            {verifyState === "uploading" ? "Securing your submission..." : "Gemini is reviewing your work..."}
          </h2>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", maxWidth: 360, margin: "0 auto" }}>
            {verifyState === "uploading"
                ? "Files are being uploaded to encrypted storage."
                : "Comparing your deliverables against the acceptance criteria. This takes 10–30 seconds."}
          </p>
          {verifyState === "verifying" && (<div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
              {["Reading submission notes", "Checking deliverables", "Evaluating criteria", "Computing verdict"].map((s, i) => (<span key={s} style={{ fontSize: "0.72rem", color: "hsl(217 91% 60%)", background: "hsl(217 91% 55% / 0.1)", padding: "0.2rem 0.6rem", borderRadius: 4, border: "1px solid hsl(217 91% 55% / 0.2)" }}>
                  {s}
                </span>))}
            </div>)}
        </div>)}

      {/* Verdict */}
      {verifyState === "done" && verdict && (<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Main verdict */}
          <div style={{
                borderRadius: 12, padding: "1.5rem",
                background: verdict.verdict === "APPROVED" ? "hsl(145 65% 42% / 0.08)" : verdict.verdict === "NEEDS_REVISION" ? "hsl(0 84% 60% / 0.08)" : "hsl(38 92% 50% / 0.08)",
                border: `1px solid ${verdictColor}33`,
                textAlign: "center"
            }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${verdictColor}1a`, border: `2px solid ${verdictColor}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
              {verdict.verdict === "APPROVED" ? <CheckCircle size={32} color={verdictColor}/> : verdict.verdict === "NEEDS_REVISION" ? <RotateCcw size={28} color={verdictColor}/> : <AlertTriangle size={28} color={verdictColor}/>}
            </div>
            <div className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: verdictColor, marginBottom: "0.5rem" }}>
              {verdict.verdict === "APPROVED" ? "✓ Approved!" : verdict.verdict === "NEEDS_REVISION" ? "Revisions Required" : "Escalated to Human Review"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "hsl(220 15% 50%)", marginBottom: "0.75rem" }}>AI Confidence: {verdict.confidence}%</div>
            <p style={{ fontSize: "0.875rem", color: "hsl(220 15% 65%)", lineHeight: 1.6, maxWidth: 480, margin: "0 auto" }}>{verdict.summary}</p>
          </div>

          {/* If approved: payment info */}
          {verdict.verdict === "APPROVED" && (<div style={{ background: "hsl(145 65% 42% / 0.06)", border: "1px solid hsl(145 65% 42% / 0.2)", borderRadius: 10, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
              <Zap size={20} color="hsl(145 65% 55%)" style={{ flexShrink: 0 }}/>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "white", marginBottom: "0.2rem" }}>
                  {formatCurrency(milestone.amount)} queued for release
                </div>
                <div style={{ fontSize: "0.8rem", color: "hsl(220 15% 55%)" }}>
                  The employer will release payment from escrow. You'll receive it instantly to your ILP wallet.
                </div>
              </div>
            </div>)}

          {/* Checklist */}
          {verdict.checklist?.length > 0 && (<div className="card">
              <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "white", marginBottom: "0.875rem" }}>Verification Checklist</h3>
              {verdict.checklist.map((item, i) => (<div key={i} style={{ display: "flex", gap: "0.6rem", marginBottom: "0.6rem", padding: "0.5rem", background: "hsl(220 16% 10%)", borderRadius: 6 }}>
                  {item.passed
                        ? <CheckCircle size={15} color="hsl(145 65% 55%)" style={{ flexShrink: 0, marginTop: 1 }}/>
                        : <AlertTriangle size={15} color="hsl(0 84% 60%)" style={{ flexShrink: 0, marginTop: 1 }}/>}
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: item.passed ? "hsl(145 65% 55%)" : "hsl(0 84% 65%)" }}>{item.criterion}</div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(220 15% 55%)" }}>{item.note}</div>
                  </div>
                </div>))}
            </div>)}

          {/* Revisions */}
          {verdict.verdict === "NEEDS_REVISION" && verdict.suggestedRevisions && (<div className="card" style={{ background: "hsl(0 84% 60% / 0.04)", border: "1px solid hsl(0 84% 60% / 0.15)" }}>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "hsl(0 84% 65%)", marginBottom: "0.75rem" }}>Required Changes</h3>
              {verdict.suggestedRevisions.map((r, i) => (<div key={i} style={{ fontSize: "0.82rem", color: "hsl(220 15% 65%)", padding: "0.4rem 0", borderBottom: i < verdict.suggestedRevisions.length - 1 ? "1px solid hsl(220 20% 14%)" : "none" }}>
                  {i + 1}. {r}
                </div>))}
            </div>)}

          <button onClick={() => navigate("/dashboard/freelancer/contracts")} className="btn btn-outline">
            ← Back to My Contracts
          </button>
        </div>)}

      {verifyState === "error" && (<div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <AlertTriangle size={32} color="hsl(0 84% 60%)" style={{ margin: "0 auto 1rem" }}/>
          <h2 className="font-heading" style={{ color: "white", marginBottom: "0.5rem" }}>Verification Error</h2>
          <p style={{ color: "hsl(220 15% 55%)", marginBottom: "1.5rem", fontSize: "0.875rem" }}>{error}</p>
          <button onClick={() => setVerifyState("idle")} className="btn btn-primary">Try Again</button>
        </div>)}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>);
}
