"use client";
import { Link, Outlet } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Zap, LayoutDashboard, Briefcase, FileText, Wallet, Calendar, Users, Bell, Settings, LogOut, ChevronRight, Menu, TrendingUp, Star, MessageSquare } from "lucide-react";
import { useAuthStore, useUIStore } from "@/lib/store";
import { formatCurrency, getInitials } from "@/lib/utils";
import { io } from "socket.io-client";
import { useEffect, useRef } from "react";
const EMPLOYER_NAV = [
    { href: "/dashboard/employer", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/employer/jobs", label: "Jobs", icon: Briefcase },
    { href: "/dashboard/employer/contracts", label: "Contracts", icon: FileText },
    { href: "/dashboard/employer/sessions", label: "Book a Session", icon: Calendar },
    { href: "/dashboard/chat", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
];
const FREELANCER_NAV = [
    { href: "/dashboard/freelancer", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/freelancer/opportunities", label: "Opportunities", icon: TrendingUp },
    { href: "/dashboard/freelancer/contracts", label: "My Contracts", icon: FileText },
    { href: "/dashboard/freelancer/sessions", label: "My Sessions", icon: Calendar },
    { href: "/dashboard/chat", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
];
export default function DashboardLayout() {
    const location = useLocation();
    const pathname = location.pathname;
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const notifications = useUIStore((s) => s.notifications);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [toast, setToast] = useState(null); // { title, message, type }
    const socketRef = useRef(null);
    const nav = user?.role === "employer" ? EMPLOYER_NAV : FREELANCER_NAV;

    useEffect(() => {
        if (!user) return;
        socketRef.current = io((import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"));
        socketRef.current.emit("join_user_room", user.id);

        socketRef.current.on("notification", (data) => {
            setToast(data);
            setTimeout(() => setToast(null), 8000);
            
            // Also flash the notification dot
            useUIStore.setState({ notifications: useUIStore.getState().notifications + 1 });
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [user]);

    function handleLogout() {
        logout();
        navigate("/");
    }
    if (!user) {
        if (typeof window !== "undefined")
            navigate("/auth/login");
        return null;
    }
    const Sidebar = () => (<aside style={{
            width: 260, background: "hsl(220 14% 7%)", borderRight: "1px solid hsl(220 20% 14%)",
            display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0,
            overflowY: "auto",
        }}>
      {/* Logo */}
      <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid hsl(220 20% 12%)" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img src="/Paylance_wordmark_white.png" alt="Paylance" style={{ height: 26, width: "auto", objectFit: "contain" }} />
        </Link>
      </div>

      {/* User card */}
      <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: "1px solid hsl(220 20% 12%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div className="avatar" style={{ width: 38, height: 38, fontSize: "0.8rem" }}>{getInitials(user.name)}</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span className="badge badge-blue" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>{user.role}</span>
              {user.trustScore && <span style={{ fontSize: "0.72rem", color: "hsl(145 65% 45%)" }}>★ {user.trustScore}</span>}
            </div>
          </div>
        </div>
        {/* Balance */}
        <div style={{ marginTop: "0.75rem", background: "hsl(220 20% 12%)", borderRadius: 8, padding: "0.6rem 0.75rem" }}>
          <div style={{ fontSize: "0.7rem", color: "hsl(220 15% 50%)", marginBottom: 2 }}>Wallet Balance</div>
          <div className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 800, color: "white" }}>{formatCurrency(user.balance || 0)}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "0.75rem 0.75rem", flex: 1 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(220 15% 40%)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 0.5rem", marginBottom: "0.35rem" }}>
          {user.role === "employer" ? "Employer" : "Freelancer"}
        </div>
        {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== `/dashboard/${user.role}` && pathname.startsWith(href));
            return (<Link key={href} to={href} style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    padding: "0.55rem 0.625rem", borderRadius: 8, textDecoration: "none",
                    marginBottom: "0.15rem", transition: "all 0.2s",
                    background: active ? "hsl(217 91% 55% / 0.15)" : "transparent",
                    color: active ? "hsl(217 91% 70%)" : "hsl(220 15% 55%)",
                    fontWeight: active ? 600 : 500, fontSize: "0.875rem",
                    borderLeft: active ? "2px solid hsl(217 91% 55%)" : "2px solid transparent",
                }} onMouseEnter={e => { if (!active) {
                e.currentTarget.style.background = "hsl(220 20% 13%)";
                e.currentTarget.style.color = "white";
            } }} onMouseLeave={e => { if (!active) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "hsl(220 15% 55%)";
            } }}>
              <Icon size={16}/>
              {label}
              {active && <ChevronRight size={13} style={{ marginLeft: "auto" }}/>}
            </Link>);
        })}

        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(220 15% 40%)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0.75rem 0.5rem 0.35rem" }}>General</div>
        <Link to="/dashboard/employer/sessions" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.625rem", borderRadius: 8, textDecoration: "none", color: "hsl(220 15% 55%)", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.15rem" }} onMouseEnter={e => { e.currentTarget.style.background = "hsl(220 20% 13%)"; e.currentTarget.style.color = "white"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "hsl(220 15% 55%)"; }}>
            <Star size={16}/> Find Consultants
          </Link>
        <Link to="/dashboard/employer/settings" className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.625rem", borderRadius: 8, textDecoration: "none", color: "hsl(220 15% 55%)", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.15rem" }} onMouseEnter={e => { e.currentTarget.style.background = "hsl(220 20% 13%)"; e.currentTarget.style.color = "white"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "hsl(220 15% 55%)"; }}>
          <Settings size={16}/> Settings
        </Link>
        <Link to="/dashboard/employer/network" className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.625rem", borderRadius: 8, textDecoration: "none", color: "hsl(220 15% 55%)", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.15rem" }} onMouseEnter={e => { e.currentTarget.style.background = "hsl(220 20% 13%)"; e.currentTarget.style.color = "white"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "hsl(220 15% 55%)"; }}>
          <Users size={16}/> Talent Network
        </Link>
      </nav>

      {/* ILP indicator */}
      <div style={{ margin: "0 0.75rem 0.75rem", background: "hsl(200 100% 60% / 0.08)", border: "1px solid hsl(200 100% 60% / 0.2)", borderRadius: 8, padding: "0.625rem 0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
          <div className="status-dot online" style={{ width: 6, height: 6 }}/>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "hsl(200 100% 65%)", textTransform: "uppercase", letterSpacing: "0.06em" }}>ILP Network Active</span>
        </div>
        {user.walletAddress && <div style={{ fontSize: "0.68rem", color: "hsl(220 15% 45%)", fontFamily: "monospace" }}>{user.walletAddress}</div>}
      </div>

      {/* Logout */}
      <div style={{ borderTop: "1px solid hsl(220 20% 12%)", padding: "0.75rem" }}>
        <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: "0.625rem", width: "100%",
            padding: "0.55rem 0.625rem", borderRadius: 8, background: "none", border: "none",
            cursor: "pointer", color: "hsl(0 84% 60%)", fontSize: "0.875rem", fontWeight: 500, transition: "all 0.2s",
        }} onMouseEnter={e => { e.currentTarget.style.background = "hsl(0 84% 60% / 0.1)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
          <LogOut size={16}/> Sign Out
        </button>
      </div>
    </aside>);
    return (<div style={{ display: "flex", minHeight: "100vh", background: "hsl(0 0% 4%)" }}>
      {/* Desktop sidebar */}
      <div style={{ display: "none" }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (<div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setSidebarOpen(false)}/>
          <div style={{ position: "relative", zIndex: 1 }}>
            <Sidebar />
          </div>
        </div>)}

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
            height: 56, borderBottom: "1px solid hsl(220 20% 12%)",
            display: "flex", alignItems: "center", padding: "0 1.25rem", gap: "1rem",
            background: "hsl(220 14% 7%)", position: "sticky", top: 0, zIndex: 40,
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(220 15% 55%)", display: "flex" }}>
            <Menu size={20}/>
          </button>
          <div style={{ flex: 1 }}/>
          {/* Notifications */}
          <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", color: "hsl(220 15% 55%)", padding: 4 }}>
            <Bell size={18}/>
            {notifications > 0 && <span className="notif-dot"/>}
          </button>
          <div className="avatar" style={{ width: 30, height: 30, fontSize: "0.7rem", cursor: "pointer" }}>{getInitials(user.name)}</div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          <Outlet />

          {/* Toast Notification */}
          {toast && (
            <div style={{
              position: "absolute", bottom: "2rem", right: "2rem", zIndex: 1000,
              background: toast.type === "success" ? "hsl(145 65% 15%)" : "hsl(0 84% 15%)",
              border: `1px solid ${toast.type === "success" ? "hsl(145 65% 40%)" : "hsl(0 84% 40%)"}`,
              padding: "1rem", borderRadius: "8px", color: "white", minWidth: "300px",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
              animation: "slideIn 0.3s ease-out forwards"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Bell size={16} color={toast.type === "success" ? "hsl(145 65% 55%)" : "hsl(0 84% 55%)"} />
                <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>{toast.title}</h4>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "hsl(220 15% 85%)", lineHeight: 1.4 }}>{toast.message}</p>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @media (min-width: 1024px) {
          .desktop-sidebar { display: block !important; }
          header button:first-child { display: none !important; }
        }
      `}</style>
    </div>);
}
