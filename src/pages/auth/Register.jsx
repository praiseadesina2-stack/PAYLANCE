"use client";
import { Suspense, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Zap, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store";
const STEPS = ["Account", "Profile", "Wallet"];
const SKILLS_LIST = ["React", "Node.js", "TypeScript", "Python", "Figma", "UI/UX", "Solidity", "AWS", "PostgreSQL", "GraphQL", "Next.js", "Rust", "Go", "Vue", "Data Science", "Mobile (React Native)", "DevOps", "Blockchain", "AI/ML", "Compliance"];
function RegisterForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const register = useAuthStore((s) => s.register);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(searchParams.get("role") || "freelancer");
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "", skills: [], walletAddress: "", bio: "", hourlyRate: "" });
  const [loading, setLoading] = useState(false);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleSkill = (s) => update("skills", form.skills.includes(s) ? form.skills.filter(x => x !== s) : [...form.skills, s]);
  async function handleFinish() {
    setLoading(true);
    try {
      await register({
        ...form,
        role
      });
      navigate(role === "freelancer" ? "/dashboard/freelancer" : "/dashboard/employer");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (<>
    {/* Step indicators */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
      {STEPS.map((s, i) => (<div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.75rem", fontWeight: 700, transition: "all 0.3s",
          background: i < step ? "hsl(145 65% 42%)" : i === step ? "hsl(217 91% 55%)" : "hsl(220 14% 12%)",
          color: i <= step ? "white" : "hsl(220 15% 45%)",
          border: i === step ? "none" : "1px solid hsl(220 20% 20%)",
        }}>
          {i < step ? <CheckCircle size={14} /> : i + 1}
        </div>
        <span style={{ fontSize: "0.75rem", color: i === step ? "white" : "hsl(220 15% 45%)", fontWeight: i === step ? 600 : 400 }}>{s}</span>
        {i < STEPS.length - 1 && <div style={{ width: 24, height: 1, background: i < step ? "hsl(217 91% 55%)" : "hsl(220 20% 20%)" }} />}
      </div>))}
    </div>

    <div className="card" style={{ padding: "2rem" }}>
      {step === 0 && (<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: "1.4rem", fontWeight: 800, color: "white" }}>Create your account</h1>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.85rem", marginTop: 4 }}>Join the global talent network</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {["freelancer", "employer"].map(r => (<button key={r} onClick={() => setRole(r)} style={{
            padding: "0.75rem", borderRadius: 8, cursor: "pointer", textTransform: "capitalize", fontWeight: 600, fontSize: "0.85rem",
            background: role === r ? "hsl(217 91% 55% / 0.15)" : "hsl(220 14% 10%)",
            border: role === r ? "1px solid hsl(217 91% 55% / 0.5)" : "1px solid hsl(220 20% 16%)",
            color: role === r ? "hsl(217 91% 70%)" : "hsl(220 15% 55%)",
            transition: "all 0.2s",
          }}>{r === "employer" ? "🏢 Employer" : "💼 Freelancer"}</button>))}
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Full Name</label>
          <input className="input" placeholder="Your full name" value={form.name} onChange={e => update("name", e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Email</label>
          <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => update("email", e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Password</label>
          <input className="input" type="password" placeholder="Min. 8 characters" value={form.password} onChange={e => update("password", e.target.value)} />
        </div>
        {role === "employer" && (<div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Company Name</label>
          <input className="input" placeholder="Your company" value={form.company} onChange={e => update("company", e.target.value)} />
        </div>)}
        <button className="btn btn-primary" onClick={() => setStep(1)} disabled={!form.name || !form.email} style={{ width: "100%", marginTop: "0.5rem" }}>
          Continue <ArrowRight size={16} />
        </button>
      </div>)}

      {step === 1 && (<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <h2 className="font-heading" style={{ fontSize: "1.3rem", fontWeight: 800, color: "white" }}>
            {role === "freelancer" ? "Your Skills" : "Company Profile"}
          </h2>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.85rem", marginTop: 4 }}>This helps our AI match you with the right {role === "freelancer" ? "jobs" : "talent"}</p>
        </div>
        {role === "freelancer" ? (<>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.75rem" }}>Select your skills</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {SKILLS_LIST.map(skill => (<button key={skill} onClick={() => toggleSkill(skill)} style={{
                padding: "0.3rem 0.7rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                background: form.skills.includes(skill) ? "hsl(217 91% 55% / 0.2)" : "hsl(220 14% 12%)",
                border: form.skills.includes(skill) ? "1px solid hsl(217 91% 55% / 0.5)" : "1px solid hsl(220 20% 18%)",
                color: form.skills.includes(skill) ? "hsl(217 91% 70%)" : "hsl(220 15% 55%)",
              }}>{skill}</button>))}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Hourly Rate (USD)</label>
            <input className="input" type="number" placeholder="e.g. 45" value={form.hourlyRate} onChange={e => update("hourlyRate", e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Bio</label>
            <textarea className="input" rows={3} placeholder="Tell clients about your experience…" value={form.bio} onChange={e => update("bio", e.target.value)} style={{ resize: "none" }} />
          </div>
        </>) : (<div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>What types of talent do you hire?</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {SKILLS_LIST.map(skill => (<button key={skill} onClick={() => toggleSkill(skill)} style={{
              padding: "0.3rem 0.7rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              background: form.skills.includes(skill) ? "hsl(217 91% 55% / 0.2)" : "hsl(220 14% 12%)",
              border: form.skills.includes(skill) ? "1px solid hsl(217 91% 55% / 0.5)" : "1px solid hsl(220 20% 18%)",
              color: form.skills.includes(skill) ? "hsl(217 91% 70%)" : "hsl(220 15% 55%)",
            }}>{skill}</button>))}
          </div>
        </div>)}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-ghost" onClick={() => setStep(0)}><ArrowLeft size={16} /></button>
          <button className="btn btn-primary" onClick={() => setStep(2)} style={{ flex: 1 }}>Continue <ArrowRight size={16} /></button>
        </div>
      </div>)}

      {step === 2 && (<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <h2 className="font-heading" style={{ fontSize: "1.3rem", fontWeight: 800, color: "white" }}>Connect your ILP Wallet</h2>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.85rem", marginTop: 4 }}>Your payment pointer — where you receive instant global payments</p>
        </div>
        <div style={{ background: "hsl(217 91% 55% / 0.08)", border: "1px solid hsl(217 91% 55% / 0.2)", borderRadius: 8, padding: "0.875rem", fontSize: "0.8rem", color: "hsl(217 91% 70%)" }}>
          <strong>What&apos;s an ILP wallet?</strong> A payment pointer like <code>$ilp.interledger-test.dev/you</code> is your global payment address. It works in 195+ countries, with any currency, at 0.4% FX spread — no bank account needed.
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>ILP Payment Pointer</label>
          <div style={{ display: "flex", alignItems: "center", background: "hsl(220 20% 12%)", borderRadius: 8, border: "1px solid hsl(220 20% 18%)", overflow: "hidden", transition: "border-color 0.2s" }}>
            <span style={{ padding: "0 0.75rem", fontSize: "0.85rem", color: "hsl(220 15% 55%)", borderRight: "1px solid hsl(220 20% 18%)", background: "hsl(220 20% 10%)" }}>$ilp.interledger-test.dev/</span>
            <input style={{ flex: 1, background: "transparent", border: "none", color: "white", padding: "0.625rem 0.75rem", fontSize: "0.85rem", outline: "none" }} placeholder="your-name" value={form.walletAddress} onChange={e => update("walletAddress", e.target.value)} />
          </div>
          <p style={{ fontSize: "0.75rem", color: "hsl(220 15% 45%)", marginTop: "0.35rem" }}>Leave blank to use your auto-generated Paylance wallet</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={16} /></button>
          <button className="btn btn-primary" onClick={handleFinish} disabled={loading} style={{ flex: 1, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Setting up account…" : <><CheckCircle size={16} /> Launch Paylance</>}
          </button>
        </div>
      </div>)}
    </div>
  </>);
}
export default function RegisterPage() {
  return (<div style={{ minHeight: "100vh", background: "hsl(0 0% 4%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
    <div style={{ position: "absolute", inset: 0 }} className="hero-bg" />
    <div style={{ position: "relative", width: "100%", maxWidth: 460 }}>
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center", marginBottom: "2rem", textDecoration: "none" }}>
        <img src="/Paylance_wordmark_white.png" alt="Paylance" style={{ height: 32, width: "auto", objectFit: "contain" }} />
      </Link>

      <Suspense fallback={<div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>}>
        <RegisterForm />
      </Suspense>

      <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.8rem", color: "hsl(220 15% 45%)" }}>
        Already have an account?{" "}
        <Link to="/auth/login" style={{ color: "hsl(217 91% 65%)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
      </p>
    </div>
  </div>);
}
