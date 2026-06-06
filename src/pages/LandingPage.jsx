"use client";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Zap, Globe, Shield, ChevronRight, Star, TrendingUp, Users, CheckCircle, ArrowRight, Cpu, Lock, Wifi, BarChart2, Menu, X } from "lucide-react";
const STATS = [
    { label: "Active Freelancers", value: "12,400+", icon: Users },
    { label: "Avg. Time to Payment", value: "< 8 sec", icon: Zap },
    { label: "Countries Served", value: "195+", icon: Globe },
    { label: "FX Cost vs Legacy", value: "−82%", icon: TrendingUp },
];
const HOW_IT_WORKS = [
    { step: "01", title: "Post a Job", desc: "Describe your project. Our AI structures it into milestones, deliverables, and acceptance criteria instantly." },
    { step: "02", title: "AI Matches Talent", desc: "Semantic embeddings rank the top 3–5 freelancers by skill, trust score, delivery history, and timezone fit." },
    { step: "03", title: "Fund Escrow via ILP", desc: "Lock payment in a secure Open Payments escrow wallet. Funds are visible to both parties — before work starts." },
    { step: "04", title: "AI Verifies & Pays", desc: "Submit work. AI reviews it against the brief. If approved, payment streams instantly to the freelancer's ILP wallet. No invoices." },
];
const FEATURES = [
    { icon: Cpu, title: "AI Delivery Verification", desc: "The first platform that auto-releases escrow based on AI review of actual deliverables — code, documents, designs.", color: "blue" },
    { icon: Lock, title: "Download Lock", desc: "Employers cannot download final files until payment is released. Enforced at the platform level. Not by trust.", color: "cyan" },
    { icon: Globe, title: "ILP-Native Payments", desc: "Open Payments protocol. 195+ countries. 0.4–0.6% FX spread. No SWIFT. No correspondent banks. No geo-blocks.", color: "blue" },
    { icon: Wifi, title: "Pay-Per-Minute Sessions", desc: "Real-time streaming payments for consultations. The meter runs live. Only consumed time is billed.", color: "cyan" },
    { icon: Shield, title: "Escrow You Can See", desc: "Funds are locked in a transparent ILP escrow wallet. Freelancers see the balance before starting a single line of work.", color: "blue" },
    { icon: BarChart2, title: "TrustScore System", desc: "A composite reputation built from verified deliveries, employer ratings, dispute history, and platform tenure.", color: "cyan" },
];
const TESTIMONIALS = [
    { name: "Amara Osei", role: "Full-Stack Engineer · Accra, Ghana", quote: "I got paid in 8 seconds after my client approved the build. Eight seconds. After years of waiting 14 days on PayPal.", avatar: "AO", rating: 5 },
    { name: "Sarah Chen", role: "CTO · FinTech Solutions Ltd", quote: "We hired 6 developers across 4 countries in one week. The AI matched us perfectly. Zero disputes because the escrow model just works.", avatar: "SC", rating: 5 },
    { name: "Dr. Ngozi Adeyemi", role: "Consultant · Lagos, Nigeria", quote: "My session marketplace earns me $3,000/month from global clients. The pay-per-minute model removed every barrier I had.", avatar: "NA", rating: 5 },
];
function FloatingCard({ children, className = "", delay = 0 }) {
    return (<div className={`glass rounded-2xl p-4 animate-float ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>);
}
export default function LandingPage() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handler);
        return () => window.removeEventListener("scroll", handler);
    }, []);
    return (<div style={{ background: "hsl(0 0% 4%)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
            transition: "all 0.3s",
            background: scrolled ? "hsl(220 14% 8% / 0.95)" : "transparent",
            backdropFilter: scrolled ? "blur(20px)" : "none",
            borderBottom: scrolled ? "1px solid hsl(220 20% 16%)" : "none",
        }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link to="/" style={{ display: "flex", alignItems: "center" }}>
               <img src="/Paylance_wordmark_white.png" alt="Paylance" style={{ height: 28, width: "auto", objectFit: "contain" }} />
            </Link>
          </div>

          <div style={{ display: "flex", gap: "2rem", alignItems: "center" }} className="hidden-mobile">
            {["How It Works", "Features", "For Freelancers", "Pricing"].map(item => (<a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} style={{ color: "hsl(220 15% 65%)", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color = "white")} onMouseLeave={e => (e.currentTarget.style.color = "hsl(220 15% 65%)")}>
                {item}
              </a>))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link to="/auth/login" className="btn btn-ghost btn-sm" style={{ color: "hsl(220 15% 65%)" }}>Log in</Link>
            <Link to="/auth/register" className="btn btn-primary btn-sm">Get Started</Link>
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none", background: "none", border: "none", color: "white", cursor: "pointer", padding: 4 }}>
              {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-bg" style={{ padding: "160px 1.5rem 100px", position: "relative", overflow: "hidden" }}>
        <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: 0.3 }}/>

        {/* Floating UI cards */}
        <div style={{ position: "absolute", top: 140, right: "8%", opacity: 0.85 }}>
          <FloatingCard delay={0.4}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div className="status-dot online"/>
              <div>
                <div style={{ fontSize: "0.75rem", color: "hsl(220 15% 65%)" }}>Payment Released</div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "white", fontSize: "1rem" }}>+$1,200.00</div>
              </div>
              <CheckCircle size={20} color="hsl(145 65% 42%)"/>
            </div>
          </FloatingCard>
        </div>

        <div style={{ position: "absolute", bottom: 160, left: "5%", opacity: 0.85 }}>
          <FloatingCard delay={1.2}>
            <div style={{ fontSize: "0.72rem", color: "hsl(220 15% 65%)", marginBottom: 4 }}>AI Match Score</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Cpu size={14} color="hsl(217 91% 65%)"/>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "white" }}>96% match</span>
            </div>
            <div className="meter-bar" style={{ marginTop: 8, width: 140 }}>
              <div className="meter-fill" style={{ width: "96%" }}/>
            </div>
          </FloatingCard>
        </div>

        <div style={{ position: "absolute", top: 200, left: "3%", opacity: 0.7 }}>
          <FloatingCard delay={0.8}>
            <div style={{ fontSize: "0.72rem", color: "hsl(220 15% 65%)" }}>Live Session</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: 4 }}>
              <div className="status-dot online animate-blink"/>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "white" }}>12:34 · $15.04</span>
            </div>
          </FloatingCard>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div className="badge badge-blue" style={{ marginBottom: "1.5rem", display: "inline-flex" }}>
            <Zap size={10}/>
            Built on Interledger Protocol · Open Payments Standard
          </div>

          <h1 className="font-heading animate-fade-up" style={{
            fontSize: "clamp(2.5rem, 7vw, 5rem)", fontWeight: 800,
            lineHeight: 1.05, letterSpacing: "-0.04em", color: "white", marginBottom: "1.5rem"
        }}>
            Where Talent Meets<br />
            <span className="text-gradient-blue">Capital, Instantly.</span><br />
            Globally.
          </h1>

          <p className="animate-fade-up" style={{
            animationDelay: "100ms", fontSize: "1.15rem", color: "hsl(220 15% 65%)",
            maxWidth: 580, margin: "0 auto 2.5rem", lineHeight: 1.7
        }}>
            Work first. Get paid automatically. AI verifies your deliverables. ILP releases payment in seconds — anywhere in the world.
            <strong style={{ color: "white" }}> No invoices. No ghosting. No banks.</strong>
          </p>

          <div className="animate-fade-up stagger" style={{ animationDelay: "200ms", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/auth/register?role=employer" className="btn btn-primary btn-lg" style={{ gap: "0.5rem" }}>
              Hire Global Talent <ArrowRight size={18}/>
            </Link>
            <Link to="/auth/register?role=freelancer" className="btn btn-ghost btn-lg">
              Start Earning Globally
            </Link>
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
            {["No setup fees", "Instant first payment", "195+ countries"].map(t => (<span key={t} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "hsl(220 15% 65%)", fontSize: "0.8rem" }}>
                <CheckCircle size={13} color="hsl(145 65% 42%)"/> {t}
              </span>))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "0 1.5rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1px", background: "hsl(220 20% 16%)", border: "1px solid hsl(220 20% 16%)", borderRadius: 16, overflow: "hidden"
        }}>
            {STATS.map(({ label, value, icon: Icon }) => (<div key={label} className="metric-card" style={{ background: "hsl(220 14% 8%)", padding: "2rem 1.5rem", textAlign: "center" }}>
                <Icon size={20} color="hsl(217 91% 65%)" style={{ margin: "0 auto 0.75rem" }}/>
                <div className="font-heading" style={{ fontSize: "2rem", fontWeight: 800, color: "white", letterSpacing: "-0.03em" }}>{value}</div>
                <div style={{ fontSize: "0.8rem", color: "hsl(220 15% 65%)", marginTop: 4 }}>{label}</div>
              </div>))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: "100px 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div className="badge badge-blue" style={{ marginBottom: "1rem", display: "inline-flex" }}>How It Works</div>
            <h2 className="font-heading" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "white", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Four steps. Zero friction.
            </h2>
            <p style={{ color: "hsl(220 15% 65%)", marginTop: "0.75rem", maxWidth: 500, margin: "0.75rem auto 0" }}>
              From job post to payment in your wallet — fully automated, AI-verified.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {HOW_IT_WORKS.map(({ step, title, desc }) => (<div key={step} className="card card-hover" style={{ position: "relative", overflow: "hidden" }}>
                <div style={{
                position: "absolute", top: -10, right: -10,
                fontFamily: "var(--font-heading)", fontSize: "5rem", fontWeight: 900,
                color: "hsl(217 91% 55% / 0.06)", lineHeight: 1, userSelect: "none"
            }}>{step}</div>
                <div className="badge badge-blue" style={{ marginBottom: "1rem", display: "inline-flex" }}>{step}</div>
                <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>{title}</h3>
                <p style={{ fontSize: "0.875rem", color: "hsl(220 15% 65%)", lineHeight: 1.65 }}>{desc}</p>
              </div>))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "0 1.5rem 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div className="badge badge-cyan" style={{ marginBottom: "1rem", display: "inline-flex" }}>Features</div>
            <h2 className="font-heading" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "white", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Built different.<br /><span className="text-gradient-blue">Genuinely new.</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (<div key={title} className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{
                width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                background: color === "blue" ? "hsl(217 91% 55% / 0.15)" : "hsl(200 100% 60% / 0.12)",
                border: `1px solid ${color === "blue" ? "hsl(217 91% 55% / 0.25)" : "hsl(200 100% 60% / 0.2)"}`,
            }}>
                  <Icon size={20} color={color === "blue" ? "hsl(217 91% 65%)" : "hsl(200 100% 60%)"}/>
                </div>
                <div>
                  <h3 className="font-heading" style={{ fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "0.4rem" }}>{title}</h3>
                  <p style={{ fontSize: "0.85rem", color: "hsl(220 15% 65%)", lineHeight: 1.65 }}>{desc}</p>
                </div>
              </div>))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "0 1.5rem 100px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="font-heading" style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)", color: "white", fontWeight: 800, letterSpacing: "-0.03em" }}>
              Real people. Real payments.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {TESTIMONIALS.map(({ name, role, quote, avatar, rating }) => (<div key={name} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  {Array.from({ length: rating }).map((_, i) => <Star key={i} size={14} color="hsl(38 92% 50%)" fill="hsl(38 92% 50%)"/>)}
                </div>
                <p style={{ fontSize: "0.9rem", color: "hsl(220 15% 75%)", lineHeight: 1.7, fontStyle: "italic" }}>&ldquo;{quote}&rdquo;</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "auto" }}>
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: "0.75rem" }}>{avatar}</div>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "white" }}>{name}</div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(220 15% 55%)" }}>{role}</div>
                  </div>
                </div>
              </div>))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 1.5rem 100px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{
            borderRadius: 24, padding: "4rem 2rem", textAlign: "center",
            background: "linear-gradient(135deg, hsl(217 91% 55% / 0.15), hsl(200 100% 60% / 0.08))",
            border: "1px solid hsl(217 91% 55% / 0.25)",
            boxShadow: "0 0 80px hsl(217 91% 55% / 0.12)",
        }}>
            <h2 className="font-heading" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: "white", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
              Ready for the next payment?
            </h2>
            <p style={{ color: "hsl(220 15% 65%)", maxWidth: 460, margin: "0 auto 2rem", lineHeight: 1.7 }}>
              Join 12,400+ freelancers and 1,800+ companies already using Paylance to work and pay across borders — instantly.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/auth/register?role=freelancer" className="btn btn-primary btn-lg">
                Start as Freelancer <ChevronRight size={18}/>
              </Link>
              <Link to="/auth/register?role=employer" className="btn btn-outline btn-lg">
                Hire Global Talent
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid hsl(220 20% 16%)", padding: "2rem 1.5rem", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
          <img src="/Paylance_wordmark_white.png" alt="Paylance" style={{ height: 24, width: "auto", objectFit: "contain" }} />
        </div>
        <p style={{ color: "hsl(220 15% 45%)", fontSize: "0.8rem" }}>
          © 2025 Paylance · The Next Connection. The Next Payment. The Next Economy.
        </p>
        <p style={{ color: "hsl(220 15% 35%)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
          Built on Interledger Protocol · Open Payments Standard · W3C Web Monetization
        </p>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>);
}
