"use client";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatDuration } from "@/lib/utils";
import { Video, Mic, VideoOff, PhoneOff, Users, MessageSquare, Zap, MicOff } from "lucide-react";
import { io } from "socket.io-client";

export default function SessionRoom() {
    const params = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    
    const [inCall, setInCall] = useState(false);
    const [duration, setDuration] = useState(0); // in seconds
    const ratePerMinute = 1.20; // Hardcoded demo rate
    const amountEarned = (duration / 60) * ratePerMinute;
    
    // WebRTC State
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [remoteStream, setRemoteStream] = useState(null);
    const [connected, setConnected] = useState(false);
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    
    const roomId = params.id;

    useEffect(() => {
        let interval;
        if (inCall) {
            interval = setInterval(() => {
                setDuration((d) => d + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [inCall]);

    // Handle remote video stream
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, connected]);

    const startCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            
            setInCall(true);
            
            // Connect to Socket
            socketRef.current = io((import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"));
            
            socketRef.current.on('connect', () => {
                socketRef.current.emit('join_video_room', roomId);
            });

            // Set up WebRTC
            const peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            peerConnectionRef.current = peerConnection;

            // Add local tracks
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });

            // Listen for remote tracks
            peerConnection.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
                setConnected(true);
            };

            // Listen for ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socketRef.current.emit('ice_candidate', { roomId, candidate: event.candidate });
                }
            };

            // Socket Events for Signaling
            socketRef.current.on('user_joined_video', async () => {
                // If we are the original person in the room, create an offer
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socketRef.current.emit('offer', { roomId, offer });
            });

            socketRef.current.on('offer', async (data) => {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socketRef.current.emit('answer', { roomId, answer });
            });

            socketRef.current.on('answer', async (data) => {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            });

            socketRef.current.on('ice_candidate', async (data) => {
                if (data.candidate) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            });

        } catch (err) {
            console.error("Error accessing media devices.", err);
            alert("Could not access camera/microphone.");
        }
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const endCall = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        setInCall(false);
        setRemoteStream(null);
        setConnected(false);
        alert(`Session ended. Total streamed: ${formatCurrency(amountEarned)}`);
        navigate(-1);
    };

    return (
        <div style={{ height: "calc(100vh - 56px)", display: "flex", flexDirection: "column", background: "black" }}>
            {/* Room Header */}
            <div style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "hsl(220 14% 6%)", borderBottom: "1px solid hsl(220 20% 12%)" }}>
                <div>
                    <h1 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white" }}>Advisory Session</h1>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "hsl(220 15% 55%)", marginTop: 4 }}>
                        <span className="badge badge-blue" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>{user?.role}</span>
                        <span>Room ID: {params.id}</span>
                    </div>
                </div>

                {/* Live Meter */}
                {inCall && (
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", background: "hsl(220 20% 10%)", padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid hsl(200 100% 60% / 0.3)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div className="status-dot online animate-blink" />
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "white", fontFamily: "monospace" }}>{formatDuration(duration)}</span>
                        </div>
                        <div style={{ width: 1, height: 20, background: "hsl(220 20% 16%)" }} />
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Zap size={14} color="hsl(200 100% 65%)" className="pulse-blue" style={{ borderRadius: "50%" }} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: "0.65rem", color: "hsl(220 15% 55%)", lineHeight: 1 }}>Streaming via ILP</span>
                                <span className="font-heading" style={{ fontSize: "1rem", fontWeight: 800, color: "hsl(200 100% 65%)", lineHeight: 1 }}>
                                    {formatCurrency(amountEarned)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Video Area */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", position: "relative" }}>
                {!inCall ? (
                    <div className="card" style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
                        <Video size={48} color="hsl(217 91% 55%)" style={{ margin: "0 auto 1rem" }} />
                        <h2 className="font-heading" style={{ fontSize: "1.2rem", color: "white", marginBottom: "0.5rem" }}>Ready to join?</h2>
                        <p style={{ color: "hsl(220 15% 55%)", fontSize: "0.85rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                            {user?.role === "employer"
                                ? `You will pre-authorize a budget. Payment streams at ${formatCurrency(ratePerMinute)}/min while connected.`
                                : `Payment will stream directly to your ILP wallet at ${formatCurrency(ratePerMinute)}/min.`}
                        </p>
                        <button className="btn btn-primary" onClick={startCall} style={{ width: "100%" }}>
                            Join & Start Streaming Payment
                        </button>
                    </div>
                ) : (
                    <div style={{ width: "100%", height: "100%", maxWidth: 1000, background: "hsl(220 14% 10%)", borderRadius: 16, border: "1px solid hsl(220 20% 16%)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        
                        {/* Remote Video */}
                        {!connected ? (
                            <div style={{ textAlign: "center", zIndex: 10 }}>
                                <div className="spinner" style={{ margin: "0 auto 1rem", width: 40, height: 40, border: "3px solid hsl(220 20% 20%)", borderTopColor: "hsl(200 100% 60%)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                                <div style={{ fontSize: "0.85rem", color: "hsl(220 15% 55%)", marginTop: 4 }}>Waiting for others to join...</div>
                            </div>
                        ) : (
                            <video 
                                ref={remoteVideoRef}
                                autoPlay 
                                playsInline 
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                            />
                        )}

                        {/* Self view pip */}
                        <div style={{ position: "absolute", bottom: "1.5rem", right: "1.5rem", width: 240, height: 160, background: "hsl(220 20% 14%)", borderRadius: 12, border: "2px solid hsl(220 20% 20%)", overflow: "hidden" }}>
                            <video 
                                ref={localVideoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} 
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            {inCall && (
                <div style={{ padding: "1rem", background: "hsl(220 14% 6%)", borderTop: "1px solid hsl(220 20% 12%)", display: "flex", justifyContent: "center", gap: "1rem" }}>
                    <button onClick={toggleMute} className="btn btn-ghost" style={{ width: 48, height: 48, borderRadius: "50%", padding: 0, background: isMuted ? "hsl(0 84% 50% / 0.2)" : "transparent", color: isMuted ? "hsl(0 84% 60%)" : "white" }}>
                        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button onClick={toggleVideo} className="btn btn-ghost" style={{ width: 48, height: 48, borderRadius: "50%", padding: 0, background: isVideoOff ? "hsl(0 84% 50% / 0.2)" : "transparent", color: isVideoOff ? "hsl(0 84% 60%)" : "white" }}>
                        {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                    <button className="btn btn-ghost" style={{ width: 48, height: 48, borderRadius: "50%", padding: 0 }}>
                        <Users size={20} />
                    </button>
                    <button className="btn btn-ghost" style={{ width: 48, height: 48, borderRadius: "50%", padding: 0 }}>
                        <MessageSquare size={20} />
                    </button>
                    <div style={{ width: 1, height: 48, background: "hsl(220 20% 16%)", margin: "0 0.5rem" }} />
                    <button onClick={endCall} style={{
                        width: 48, height: 48, borderRadius: "50%", padding: 0, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                        background: "hsl(0 84% 50%)", color: "white"
                    }}>
                        <PhoneOff size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
