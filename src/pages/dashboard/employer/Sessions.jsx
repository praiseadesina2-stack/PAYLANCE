"use client";
import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import { DEMO_SESSIONS, DEMO_CONSULTANTS } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Calendar, Video, Clock, DollarSign, ArrowRight, X } from "lucide-react";
export default function EmployerSessionsPage() {
    const user = useAuthStore((s) => s.user);
    const [sessions, setSessions] = useState(DEMO_SESSIONS);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [selectedConsultant, setSelectedConsultant] = useState(null);
    const [bookingDate, setBookingDate] = useState("");
    const [bookingDuration, setBookingDuration] = useState("30");
    const handleBook = (c) => {
        setSelectedConsultant(c);
        setIsBookingOpen(true);
    };
    const confirmBooking = () => {
        if (!selectedConsultant || !bookingDate)
            return;
        const newSession = {
            id: `session_${Date.now()}`,
            title: "Advisory Call",
            consultantId: selectedConsultant.id,
            consultantName: selectedConsultant.name,
            employerId: user?.id || "e1",
            employerName: user?.name || "Client",
            date: bookingDate,
            duration: parseInt(bookingDuration),
            totalCharged: Math.round(selectedConsultant.ratePerMinute * parseInt(bookingDuration)),
            status: "SCHEDULED",
            freelancer: {
                name: selectedConsultant.name,
                title: selectedConsultant.title,
                avatar: selectedConsultant.avatar,
                ratePerMinute: selectedConsultant.ratePerMinute,
            }
        };
        setSessions([newSession, ...sessions]);
        setIsBookingOpen(false);
        setSelectedConsultant(null);
        setBookingDate("");
    };
    return (<div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>Consultation Sessions</h1>
          <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginTop: 4 }}>Pay-per-minute advisory calls via Web Monetization</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedConsultant(null); setIsBookingOpen(true); }}>
          Find a Consultant
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Sessions List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h2 className="font-heading" style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>Your Sessions</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {sessions.map(session => (<div key={session.id} className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div className="avatar" style={{ width: 48, height: 48, fontSize: "1.2rem", borderRadius: 12 }}>
                      {session.freelancer.name?.split(" ").map((n) => n[0]).join("") || "C"}
                    </div>
                    <div>
                      <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "0.2rem" }}>{session.freelancer.name}</h3>
                      <div style={{ fontSize: "0.8rem", color: "hsl(220 15% 65%)" }}>{session.freelancer.title}</div>
                    </div>
                  </div>
                  <div className={`badge ${session.status === "SCHEDULED" || session.status === "UPCOMING" ? "badge-cyan" : "badge-ghost"}`}>
                    {session.status}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", padding: "1rem", background: "hsl(220 20% 10%)", borderRadius: 8, border: "1px solid hsl(220 20% 16%)" }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 55%)", marginBottom: 4, display: "flex", alignItems: "center", gap: "0.3rem" }}><Calendar size={12}/> Date & Time</div>
                    <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>{formatDate(session.date)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 55%)", marginBottom: 4, display: "flex", alignItems: "center", gap: "0.3rem" }}><DollarSign size={12}/> Rate</div>
                    <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>{formatCurrency(session.freelancer.ratePerMinute)} / min</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 55%)", marginBottom: 4, display: "flex", alignItems: "center", gap: "0.3rem" }}><Clock size={12}/> Duration & Cost</div>
                    <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>
                      {session.duration ? `${session.duration} min` : "TBD"}
                      {session.totalCharged && <span style={{ color: "hsl(220 15% 55%)", marginLeft: "0.5rem", fontWeight: 400 }}>({formatCurrency(session.totalCharged)})</span>}
                    </div>
                  </div>
                </div>

                {(session.status === "SCHEDULED" || session.status === "UPCOMING") && (<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                    <button className="btn btn-ghost btn-sm">Reschedule</button>
                    <Link to={`/dashboard/sessions/room/${session.id}`} className="btn btn-primary btn-sm">
                      <Video size={14}/> Join Session
                    </Link>
                  </div>)}
              </div>))}
          </div>
        </div>

        {/* Sidebar / Recommended */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="card" style={{ background: "linear-gradient(135deg, hsl(200 100% 60% / 0.1), transparent)", borderColor: "hsl(200 100% 60% / 0.2)" }}>
            <h3 className="font-heading" style={{ fontSize: "1rem", color: "white", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <DollarSign size={16} color="hsl(200 100% 65%)"/> How it Works
            </h3>
            <p style={{ fontSize: "0.8rem", color: "hsl(220 15% 65%)", lineHeight: 1.6, marginBottom: "1rem" }}>
              When you join a session, you pre-authorize a maximum budget via Open Payments. Funds are streamed to the consultant <strong>per-second</strong>. If you end early, unspent funds are instantly released.
            </p>
          </div>

          <div className="card">
            <h3 className="font-heading" style={{ fontSize: "1rem", color: "white", marginBottom: "1rem" }}>Recommended Consultants</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {DEMO_CONSULTANTS.slice(0, 3).map(c => (<div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: "0.7rem", borderRadius: 8 }}>
                    {c.name?.split(" ").map((n) => n[0]).join("") || "C"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(220 15% 55%)" }}>{formatCurrency(c.ratePerMinute)} / min</div>
                  </div>
                  <button onClick={() => handleBook(c)} className="btn btn-ghost btn-sm" style={{ padding: "0.3rem 0.5rem" }}>
                    <ArrowRight size={14}/>
                  </button>
                </div>))}
            </div>
          </div>
        </div>

      </div>

      {/* Booking Form Modal */}
      {isBookingOpen && selectedConsultant && (<div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="card glass-strong" style={{ width: "100%", maxWidth: 450, padding: "2rem", position: "relative" }}>
            <button onClick={() => setIsBookingOpen(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "hsl(220 15% 55%)" }}>
              <X size={20}/>
            </button>
            <h3 className="font-heading" style={{ fontSize: "1.25rem", color: "white", marginBottom: "1rem" }}>Book Advisory Call</h3>
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", padding: "0.75rem", borderRadius: 8, background: "hsl(220 20% 10%)" }}>
              <div className="avatar" style={{ width: 40, height: 40, fontSize: "0.8rem", borderRadius: 8 }}>
                {selectedConsultant.name?.split(" ").map((n) => n[0]).join("") || "C"}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "white", fontSize: "0.9rem" }}>{selectedConsultant.name}</div>
                <div style={{ fontSize: "0.75rem", color: "hsl(220 15% 55%)" }}>{selectedConsultant.title}</div>
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Date & Time</label>
                <input className="input" type="datetime-local" value={bookingDate} onChange={e => setBookingDate(e.target.value)} required/>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Duration (Minutes)</label>
                <select className="input" value={bookingDuration} onChange={e => setBookingDuration(e.target.value)} style={{ background: "hsl(220 16% 12%)" }}>
                  <option value="15">15 Minutes ({formatCurrency(selectedConsultant.ratePerMinute * 15)})</option>
                  <option value="30">30 Minutes ({formatCurrency(selectedConsultant.ratePerMinute * 30)})</option>
                  <option value="60">60 Minutes ({formatCurrency(selectedConsultant.ratePerMinute * 60)})</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-ghost" onClick={() => setIsBookingOpen(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmBooking} disabled={!bookingDate} style={{ flex: 1 }}>Confirm Booking</button>
            </div>
          </div>
        </div>)}

      {/* Select Consultant Search Modal */}
      {isBookingOpen && !selectedConsultant && (<div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="card glass-strong" style={{ width: "100%", maxWidth: 500, maxHeight: "80vh", overflowY: "auto", padding: "2rem", position: "relative" }}>
            <button onClick={() => setIsBookingOpen(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "hsl(220 15% 55%)" }}>
              <X size={20}/>
            </button>
            <h3 className="font-heading" style={{ fontSize: "1.25rem", color: "white", marginBottom: "1rem" }}>Select a Consultant</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              {DEMO_CONSULTANTS.map(c => (<div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0.75rem", borderRadius: 8, background: "hsl(220 20% 10%)", border: "1px solid hsl(220 20% 16%)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div className="avatar" style={{ width: 40, height: 40, fontSize: "0.8rem", borderRadius: 8 }}>
                      {c.name?.split(" ").map((n) => n[0]).join("") || "C"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "white", fontSize: "0.9rem" }}>{c.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "hsl(220 15% 55%)" }}>{c.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "hsl(145 65% 50%)" }}>{formatCurrency(c.ratePerMinute)} / min</div>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setSelectedConsultant(c)}>Book</button>
                </div>))}
            </div>

            <button className="btn btn-ghost" onClick={() => setIsBookingOpen(false)} style={{ width: "100%" }}>Close</button>
          </div>
        </div>)}
    </div>);
}
