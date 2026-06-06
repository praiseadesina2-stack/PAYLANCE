"use client";
import { Suspense, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Zap, Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store";
function LoginForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const login = useAuthStore((s) => s.login);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [role, setRole] = useState("freelancer");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const user = await login(email, password);
            navigate(user.role === "freelancer" ? "/dashboard/freelancer" : "/dashboard/employer");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
    return (<>
      {/* Role selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {["freelancer", "employer"].map((r) => (<button key={r} id={`role-${r}`} onClick={() => setRole(r)} style={{
                padding: "0.625rem", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", fontWeight: 600, fontSize: "0.8rem", textTransform: "capitalize",
                background: role === r ? "hsl(217 91% 55% / 0.15)" : "hsl(220 14% 10%)",
                border: role === r ? "1px solid hsl(217 91% 55% / 0.5)" : "1px solid hsl(220 20% 16%)",
                color: role === r ? "hsl(217 91% 70%)" : "hsl(220 15% 55%)",
            }}>{r}</button>))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Email</label>
          <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Password</label>
          <div style={{ position: "relative" }}>
            <input className="input" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: "2.5rem" }}/>
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(220 15% 55%)" }}>
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
        </div>
        {error && <p style={{ color: "hsl(0 84% 60%)", fontSize: "0.8rem" }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: "0.5rem", width: "100%", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Signing in…" : <><span>Sign In</span><ArrowRight size={16}/></>}
        </button>
      </form>
    </>);
}
export default function LoginPage() {
    return (<div style={{ minHeight: "100vh", background: "hsl(0 0% 4%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ position: "absolute", inset: 0 }} className="hero-bg"/>
      <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", textDecoration: "none" }}>
          <img src="/Paylance_wordmark_white.png" alt="Paylance" style={{ height: 36, width: "auto", objectFit: "contain" }} />
        </Link>

        <div className="card" style={{ padding: "2rem" }}>
          <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white", marginBottom: "0.25rem" }}>Welcome back</h1>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Sign in to your Paylance account</p>

          <Suspense fallback={<div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>}>
            <LoginForm />
          </Suspense>

          <div className="divider" style={{ margin: "1.25rem 0" }}/>
          <div style={{ background: "hsl(217 91% 55% / 0.08)", border: "1px solid hsl(217 91% 55% / 0.2)", borderRadius: 8, padding: "0.75rem", fontSize: "0.78rem", color: "hsl(217 91% 70%)" }}>
            <CheckCircle size={12} style={{ display: "inline", marginRight: 6 }}/>
            <strong>Demo mode:</strong> Enter any email & password to explore
          </div>
          <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.8rem", color: "hsl(220 15% 55%)" }}>
            No account?{" "}
            <Link to="/auth/register" style={{ color: "hsl(217 91% 65%)", fontWeight: 600, textDecoration: "none" }}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>);
}
