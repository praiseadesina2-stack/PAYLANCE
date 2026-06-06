import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function IlpCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const interactRef = searchParams.get("interact_ref");
    const completeILPTransfer = useAuthStore(s => s.completeILPTransfer);
    
    const [status, setStatus] = useState("loading"); // loading, success, error
    const [message, setMessage] = useState("Finalizing Interledger transfer...");

    const hasCalled = useRef(false);

    useEffect(() => {
        if (!interactRef) {
            setStatus("error");
            setMessage("Invalid callback. Missing interact_ref.");
            return;
        }

        if (hasCalled.current) return;
        hasCalled.current = true;

        const completeTransfer = async () => {
            try {
                await completeILPTransfer(interactRef);
                setStatus(prev => {
                    if (prev === "success") return prev;
                    setMessage("Transfer complete! Redirecting you back to your wallet...");
                    setTimeout(() => {
                        navigate("/dashboard/wallet", { replace: true });
                    }, 2500);
                    return "success";
                });
            } catch (err) {
                setStatus(prev => {
                    if (prev === "success") return prev; // Ignore error if already succeeded
                    setMessage(err.message || "Failed to complete transfer.");
                    return "error";
                });
            }
        };

        completeTransfer();
    }, [interactRef, completeILPTransfer, navigate]);

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "hsl(220 25% 6%)",
            color: "white",
            fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
            <div style={{
                background: "hsl(220 20% 10%)",
                border: "1px solid hsl(220 20% 16%)",
                borderRadius: "16px",
                padding: "2.5rem 2rem",
                textAlign: "center",
                maxWidth: "400px",
                width: "90%",
                boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
            }}>
                {status === "loading" && (
                    <Loader2 size={48} color="hsl(217 91% 60%)" style={{ animation: "spin 2s linear infinite", margin: "0 auto 1.5rem" }} />
                )}
                {status === "success" && (
                    <CheckCircle size={48} color="hsl(145 65% 50%)" style={{ margin: "0 auto 1.5rem" }} />
                )}
                {status === "error" && (
                    <XCircle size={48} color="hsl(0 84% 60%)" style={{ margin: "0 auto 1.5rem" }} />
                )}

                <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    {status === "loading" ? "Processing..." : status === "success" ? "Success!" : "Error"}
                </h1>
                
                <p style={{ color: "hsl(220 15% 65%)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                    {message}
                </p>

                {status === "success" && (
                    <button 
                        onClick={() => navigate("/dashboard/wallet")}
                        style={{
                            marginTop: "1.5rem",
                            background: "hsl(220 20% 16%)",
                            color: "white",
                            border: "none",
                            padding: "0.6rem 1.25rem",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: 600
                        }}
                    >
                        Return to Wallet
                    </button>
                )}
            </div>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
