"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, ArrowUpRight, ArrowDownRight, Zap, Globe, RefreshCw, ExternalLink, Plus, Minus } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

export default function WalletPage() {
    const user = useAuthStore((s) => s.user);
    const fundWallet = useAuthStore((s) => s.fundWallet);
    const withdrawWallet = useAuthStore((s) => s.withdrawWallet);
    const fetchILPBalance = useAuthStore((s) => s.fetchILPBalance);

    const [ilpData, setIlpData] = useState(null);
    const [ilpInfo, setIlpInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [amount, setAmount] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    const isFreelancer = user?.role === "freelancer";

    const loadData = async () => {
        setRefreshing(true);
        try {
            const data = await fetchILPBalance();
            setIlpData(data);
            const r = await fetch(`${API_URL}/wallet/ilp-info`);
            if (r.ok) setIlpInfo(await r.json());
        } catch (e) {}
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleAction = async (type) => {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) return;
        setActionLoading(true);
        setMsg(null);
        
        try {
            let res;
            if (type === "fund") {
                res = await fundWallet(amt);
            } else {
                res = await withdrawWallet(amt);
            }

            if (res && res.requiresInteraction) {
                setMsg({ ok: true, text: "Redirecting to Interledger for secure transfer..." });
                window.location.href = res.interactUrl;
                // Do not setActionLoading(false) here, let the page unload gracefully
                return;
            } else {
                setMsg({ ok: true, text: `$${amt} ${type === "fund" ? 'added to' : 'withdrawn from'} your wallet` });
                setAmount("");
                await loadData();
            }
        } catch (err) {
            setMsg({ ok: false, text: err.message });
        }
        setActionLoading(false);
    };

    const balance = user?.balance || 0;
    const transactions = ilpData?.transactions || [];
    const ilpPointer = ilpData?.ilpWalletPointer || user?.wallet_address || "";
    const ilpWalletInfo = ilpData?.ilpWalletInfo;

    // Employer or freelancer platform wallet info
    const platformWallet = isFreelancer ? ilpInfo?.freelancer : ilpInfo?.employer;

    return (
        <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}>ILP Wallet</h1>
                    <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.875rem", marginTop: 4 }}>
                        Powered by Interledger Open Payments · Testnet
                    </p>
                </div>
                <button onClick={loadData} className="btn btn-ghost btn-sm" style={{ gap: "0.4rem" }} disabled={refreshing}>
                    <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}/> Refresh
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    {/* Balance Card */}
                    <div className="card" style={{
                        background: "linear-gradient(135deg, hsl(217 91% 55% / 0.15), hsl(200 100% 60% / 0.05))",
                        border: "1px solid hsl(217 91% 55% / 0.3)",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                    <Wallet size={16} color="hsl(217 91% 70%)"/>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(220 15% 75%)" }}>Available Balance</span>
                                    <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "hsl(145 65% 55%)", background: "hsl(145 65% 42% / 0.12)", border: "1px solid hsl(145 65% 42% / 0.25)", padding: "0.1rem 0.35rem", borderRadius: 4, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }}/>
                                        ILP Live
                                    </span>
                                </div>
                                <div className="font-heading" style={{ fontSize: "3rem", fontWeight: 800, color: "white", letterSpacing: "-0.04em", lineHeight: 1 }}>
                                    {formatCurrency(balance)}
                                </div>
                                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "hsl(220 20% 12%)", padding: "0.3rem 0.75rem", borderRadius: 99, width: "fit-content" }}>
                                    <Zap size={12} color="hsl(145 65% 50%)"/>
                                    <span style={{ fontSize: "0.72rem", color: "hsl(220 15% 65%)", fontFamily: "monospace" }}>
                                        {ilpPointer || user?.wallet_address || "$ilp.interledger-test.dev/…"}
                                    </span>
                                    <a href="https://wallet.interledger-test.dev" target="_blank" rel="noreferrer" style={{ color: "hsl(217 91% 65%)", display: "flex" }}>
                                        <ExternalLink size={11}/>
                                    </a>
                                </div>
                                {ilpWalletInfo && (
                                    <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "hsl(220 15% 50%)" }}>
                                        {ilpWalletInfo.publicName} · {ilpWalletInfo.assetCode} · Interledger Testnet
                                    </div>
                                )}
                            </div>

                            {/* Manual Funding Controls */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 200 }}>
                                <div style={{ fontSize: "0.8rem", color: "hsl(220 15% 60%)", marginBottom: "0.25rem" }}>
                                    Manage ILP Funds
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <input 
                                        type="number" 
                                        placeholder="Amount ($)" 
                                        value={amount} 
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="input"
                                        style={{ width: "120px" }}
                                    />
                                    <button 
                                        onClick={() => handleAction("fund")}
                                        disabled={actionLoading || !amount}
                                        className="btn btn-primary"
                                        style={{ padding: "0 0.75rem", fontSize: "0.85rem" }}
                                    >
                                        {actionLoading ? "..." : "Add Funds"}
                                    </button>
                                    <button 
                                        onClick={() => handleAction("withdraw")}
                                        disabled={actionLoading || !amount || balance < parseFloat(amount)}
                                        className="btn btn-outline"
                                        style={{ padding: "0 0.75rem", fontSize: "0.85rem" }}
                                    >
                                        Withdraw
                                    </button>
                                </div>
                                {msg && (
                                    <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: msg.ok ? "hsl(145 65% 50%)" : "hsl(0 84% 60%)" }}>
                                        {msg.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Transactions */}
                    <div className="card">
                        <h2 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "1.25rem" }}>
                            Transaction History
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            {loading && <p style={{ color: "hsl(220 15% 50%)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>Loading…</p>}
                            {!loading && transactions.length === 0 && (
                                <p style={{ color: "hsl(220 15% 50%)", fontSize: "0.85rem", textAlign: "center", padding: "2rem 0" }}>
                                    No transactions yet. Fund your wallet or complete a milestone to see activity here.
                                </p>
                            )}
                            {transactions.map((tx, i) => {
                                const isIncoming = tx.to_user_id === user?.id;
                                return (
                                    <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 0", borderBottom: i < transactions.length - 1 ? "1px solid hsl(220 20% 14%)" : "none" }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: isIncoming ? "hsl(145 65% 42% / 0.15)" : "hsl(220 20% 16%)" }}>
                                            {isIncoming ? <ArrowDownRight size={17} color="hsl(145 65% 50%)"/> : <ArrowUpRight size={17} color="hsl(220 15% 65%)"/>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "white", marginBottom: 2 }}>
                                                {tx.description || (tx.type || '').replace(/_/g, " ")}
                                            </div>
                                            <div style={{ fontSize: "0.73rem", color: "hsl(220 15% 55%)" }}>
                                                {isIncoming ? `From: ${tx.from_name || "Employer"}` : `To: ${tx.to_name || "Freelancer"}`} · {formatDate(tx.created_at)}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div className="font-heading" style={{ fontSize: "0.95rem", fontWeight: 700, color: isIncoming ? "hsl(145 65% 50%)" : "white" }}>
                                                {isIncoming ? "+" : "-"}{formatCurrency(tx.amount)}
                                            </div>
                                            <div style={{ fontSize: "0.65rem", color: "hsl(217 91% 65%)", fontFamily: "monospace" }}>
                                                {(tx.id || '').slice(0, 12)}…
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    {/* ILP Wallet Info */}
                    <div className="card" style={{ background: "hsl(220 20% 10%)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                            <Globe size={15} color="hsl(145 65% 55%)"/>
                            <h3 className="font-heading" style={{ fontSize: "0.95rem", color: "white" }}>ILP Wallet</h3>
                        </div>
                        {[
                            { label: "Network", value: "Interledger Testnet" },
                            { label: "Asset", value: platformWallet?.info ? `${platformWallet.info.assetCode} (scale ${platformWallet.info.assetScale})` : "USD" },
                            { label: "Status", value: "Connected" },
                            { label: "Mode", value: "Open Payments" },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderTop: "1px solid hsl(220 20% 16%)" }}>
                                <span style={{ fontSize: "0.75rem", color: "hsl(220 15% 55%)" }}>{label}</span>
                                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(145 65% 50%)" }}>{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Platform Wallets */}
                    <div className="card">
                        <h3 className="font-heading" style={{ fontSize: "0.95rem", color: "white", marginBottom: "0.875rem" }}>Platform Wallets</h3>
                        {[
                            { label: "Employer", wallet: ilpInfo?.employer },
                            { label: "Freelancer", wallet: ilpInfo?.freelancer },
                        ].map(({ label, wallet }) => (
                            <div key={label} style={{ padding: "0.65rem 0.75rem", background: "hsl(220 16% 12%)", borderRadius: 8, border: "1px solid hsl(220 20% 16%)", marginBottom: "0.5rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "white" }}>{label}</span>
                                    <span style={{ fontSize: "0.62rem", color: "hsl(145 65% 55%)" }}>● Live</span>
                                </div>
                                <div style={{ fontSize: "0.67rem", color: "hsl(220 15% 55%)", fontFamily: "monospace", wordBreak: "break-all" }}>{wallet?.pointer}</div>
                                {wallet?.info && <div style={{ fontSize: "0.65rem", color: "hsl(217 91% 65%)", marginTop: 2 }}>{wallet.info.publicName} · {wallet.info.assetCode}</div>}
                            </div>
                        ))}
                        <a href="https://wallet.interledger-test.dev" target="_blank" rel="noreferrer" className="btn btn-outline" style={{ width: "100%", marginTop: "0.5rem", fontSize: "0.8rem", gap: "0.4rem" }}>
                            <ExternalLink size={13}/> Open Testnet Dashboard
                        </a>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
