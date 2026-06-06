"use client";
import { useAuthStore } from "@/lib/store";
import { DEMO_SESSIONS } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Calendar, Video, Clock, DollarSign } from "lucide-react";
export default function FreelancerSessionsPage() {
    const user = useAuthStore((s) => s.user);
    // For demo, we just use the employer sessions and flip the perspective
    return (<div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>My Sessions</h1>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginTop: 4 }}>Manage your consulting calendar and streaming payments</p>
        </div>
        <button className="btn btn-outline">
          <Calendar size={16}/> Sync Calendar
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {DEMO_SESSIONS.map(session => (<div key={session.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="avatar" style={{ width: 48, height: 48, fontSize: "1.2rem", borderRadius: 12, background: "hsl(220 20% 16%)", color: "white" }}>
                  CLI
                </div>
                <div>
                  <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "0.2rem" }}>Client: FinTech Solutions</h3>
                  <div style={{ fontSize: "0.8rem", color: "hsl(220 15% 65%)" }}>Consultation / Advisory</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                <div className={`badge ${session.status === "SCHEDULED" || session.status === "UPCOMING" ? "badge-cyan" : "badge-ghost"}`}>
                  {session.status}
                </div>
                {session.status === "COMPLETED" && (<div className="font-heading" style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(145 65% 50%)" }}>+{formatCurrency(session.totalCharged || 0)}</div>)}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", padding: "1rem", background: "hsl(220 20% 10%)", borderRadius: 8, border: "1px solid hsl(220 20% 16%)" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 55%)", marginBottom: 4, display: "flex", alignItems: "center", gap: "0.3rem" }}><Calendar size={12}/> Date & Time</div>
                <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>{formatDate(session.date)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 55%)", marginBottom: 4, display: "flex", alignItems: "center", gap: "0.3rem" }}><DollarSign size={12}/> Your Rate</div>
                <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>{formatCurrency(session.freelancer?.ratePerMinute || 1.33)} / min</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 55%)", marginBottom: 4, display: "flex", alignItems: "center", gap: "0.3rem" }}><Clock size={12}/> Duration</div>
                <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>
                  {session.duration ? `${session.duration} min` : "TBD"}
                </div>
              </div>
            </div>

            {session.status === "UPCOMING" && (<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <Link to={`/dashboard/sessions/room/${session.id}`} className="btn btn-primary btn-sm">
                  <Video size={14}/> Start Session Room
                </Link>
              </div>)}
          </div>))}

        {DEMO_SESSIONS.length === 0 && (<div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <Calendar size={48} color="hsl(220 15% 25%)" style={{ margin: "0 auto 1rem" }}/>
            <h3 className="font-heading" style={{ fontSize: "1.1rem", color: "white", marginBottom: "0.5rem" }}>No sessions yet</h3>
            <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Set your availability to start accepting consulting calls.</p>
          </div>)}

      </div>
    </div>);
}
