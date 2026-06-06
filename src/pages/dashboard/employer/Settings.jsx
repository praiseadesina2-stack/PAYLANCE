"use client";
import { useState } from "react";
import { useAuthStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { User, CreditCard, Key, Check, Plus, Wallet, DollarSign } from "lucide-react";
export default function EmployerSettings() {
    const user = useAuthStore((s) => s.user);
    const login = useAuthStore((s) => s.login);
    const [activeTab, setActiveTab] = useState("profile");
    const [profileName, setProfileName] = useState(user?.name || "Sarah Chen");
    const [companyName, setCompanyName] = useState("Acme Labs");
    const [emailAddress, setEmailAddress] = useState("sarah@acmelabs.io");
    const [walletPointer, setWalletPointer] = useState(user?.walletAddress || "$ilp.interledger-test.dev/sarah");
    const [isSaved, setIsSaved] = useState(false);
    const [fundAmount, setFundAmount] = useState("");
    const [showFundModal, setShowFundModal] = useState(false);
    // Toggle state defaults
    const [streamAlerts, setStreamAlerts] = useState(true);
    const [twoFactor, setTwoFactor] = useState(false);
    const handleSaveProfile = (e) => {
        e.preventDefault();
        if (!user)
            return;
        // Use login to update auth store user fields
        login({
            ...user,
            name: profileName,
            walletAddress: walletPointer,
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };
    const handleFundWallet = () => {
        if (!user || !fundAmount)
            return;
        const addedAmount = parseFloat(fundAmount);
        if (isNaN(addedAmount) || addedAmount <= 0)
            return;
        login({
            ...user,
            balance: (user.balance || 0) + addedAmount,
        });
        setFundAmount("");
        setShowFundModal(false);
    };
    return (<div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>Settings</h1>
        <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginTop: 4 }}>
          Manage your Paylance workspace settings, billing accounts, and digital identities
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Navigation Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[
            { id: "profile", label: "Profile Details", icon: User },
            { id: "payments", label: "Payments & Escrow", icon: CreditCard },
            { id: "security", label: "Security & Keys", icon: Key },
        ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem",
                    borderRadius: 8, border: "none", cursor: "pointer", transition: "all 0.2s",
                    fontWeight: 600, fontSize: "0.85rem", textAlign: "left",
                    background: isActive ? "hsl(217 91% 55% / 0.15)" : "transparent",
                    color: isActive ? "hsl(217 91% 70%)" : "hsl(220 15% 55%)",
                }}>
                <Icon size={16}/> {tab.label}
              </button>);
        })}
        </div>

        {/* Configurations Column */}
        <div className="card" style={{ padding: "2rem" }}>
          {/* PROFILE TAB */}
          {activeTab === "profile" && (<form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h2 className="font-heading" style={{ fontSize: "1.2rem", color: "white", marginBottom: "0.5rem" }}>Profile Details</h2>
              
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Full Name</label>
                <input className="input" value={profileName} onChange={e => setProfileName(e.target.value)} required/>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Company Name</label>
                <input className="input" value={companyName} onChange={e => setCompanyName(e.target.value)} required/>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Email Address</label>
                <input className="input" type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} required/>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", borderTop: "1px solid hsl(220 20% 16%)", paddingTop: "1.25rem", marginTop: "0.5rem" }}>
                <button type="submit" className="btn btn-primary" style={{ minWidth: 120 }}>
                  Save Changes
                </button>
                {isSaved && (<span style={{ fontSize: "0.8rem", color: "hsl(145 65% 50%)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Check size={14}/> Profile updated successfully
                  </span>)}
              </div>
            </form>)}

          {/* PAYMENTS & ESCROW TAB */}
          {activeTab === "payments" && (<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h2 className="font-heading" style={{ fontSize: "1.2rem", color: "white", marginBottom: "0.5rem" }}>Payments & Escrow</h2>
                <p style={{ fontSize: "0.8rem", color: "hsl(220 15% 55%)" }}>Configure your Interledger Protocol wallet pointer and manage funded employer deposits.</p>
              </div>

              {/* Wallet Info Card */}
              <div style={{ background: "hsl(220 20% 10%)", border: "1px solid hsl(220 20% 16%)", borderRadius: 8, padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "hsl(217 91% 55% / 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Wallet size={20} color="hsl(217 91% 65%)"/>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "hsl(220 15% 50%)", textTransform: "uppercase" }}>Wallet Balance</div>
                    <div className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white", marginTop: 2 }}>
                      {formatCurrency(user?.balance || 0)}
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowFundModal(true)} className="btn btn-primary btn-sm" style={{ gap: "0.35rem" }}>
                  <Plus size={14}/> Fund Balance
                </button>
              </div>

              {/* Wallet Pointer input */}
              <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>ILP Payment Pointer</label>
                  <input className="input" value={walletPointer} onChange={e => setWalletPointer(e.target.value)} required/>
                  <p style={{ fontSize: "0.72rem", color: "hsl(220 15% 45%)", marginTop: "0.35rem" }}>
                    Funds from contract closures will be settled directly to this pointer address.
                  </p>
                </div>
                <div>
                  <button type="submit" className="btn btn-outline btn-sm">Update Pointer</button>
                </div>
              </form>
            </div>)}

          {/* SECURITY & KEYS TAB */}
          {activeTab === "security" && (<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h2 className="font-heading" style={{ fontSize: "1.2rem", color: "white", marginBottom: "0.5rem" }}>Security & Identity Keys</h2>
                <p style={{ fontSize: "0.8rem", color: "hsl(220 15% 55%)" }}>Configure Web Monetization keys and multi-factor verification settings.</p>
              </div>

              {/* Digital signature mock key */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Web Monetization Public Key</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input className="input" style={{ fontFamily: "monospace", fontSize: "0.78rem" }} value="ed25519_pub_7a2f9b8c6e4d5a1b2c3d4e5f6a7b8c9d0e1f" readOnly/>
                </div>
              </div>

              {/* Security settings checklist */}
              <div style={{ borderTop: "1px solid hsl(220 20% 16%)", paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "white" }}>Stream Settlement Notifications</div>
                    <div style={{ fontSize: "0.78rem", color: "hsl(220 15% 55%)" }}>Receive real-time emails when milestones are released.</div>
                  </div>
                  <input type="checkbox" checked={streamAlerts} onChange={() => setStreamAlerts(!streamAlerts)} style={{ width: 18, height: 18, cursor: "pointer" }}/>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "white" }}>Two-Factor Authorization (2FA)</div>
                    <div style={{ fontSize: "0.78rem", color: "hsl(220 15% 55%)" }}>Require key confirmation before releasing escrow milestones.</div>
                  </div>
                  <input type="checkbox" checked={twoFactor} onChange={() => setTwoFactor(!twoFactor)} style={{ width: 18, height: 18, cursor: "pointer" }}/>
                </div>
              </div>
            </div>)}
        </div>
      </div>

      {/* Funding Modal Dialog */}
      {showFundModal && (<div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="card glass-strong" style={{ width: "100%", maxWidth: 400, padding: "2rem", position: "relative" }}>
            <h3 className="font-heading" style={{ fontSize: "1.25rem", color: "white", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Plus size={20} color="hsl(217 91% 65%)"/> Fund Wallet Balance
            </h3>
            <p style={{ fontSize: "0.8rem", color: "hsl(220 15% 55%)", marginBottom: "1.25rem" }}>
              Deposit funds from your external bank account or ILP-enabled wallet into your Paylance escrow budget.
            </p>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220 15% 65%)", marginBottom: "0.4rem" }}>Deposit Amount (USD)</label>
              <div style={{ position: "relative" }}>
                <DollarSign size={16} color="hsl(220 15% 55%)" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}/>
                <input className="input" type="number" placeholder="e.g. 5000" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} style={{ paddingLeft: "1.75rem" }} required/>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-ghost" onClick={() => setShowFundModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFundWallet} disabled={!fundAmount} style={{ flex: 1 }}>Fund Balance</button>
            </div>
          </div>
        </div>)}
    </div>);
}
