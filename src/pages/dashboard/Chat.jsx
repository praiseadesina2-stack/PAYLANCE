import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store";
import { io } from "socket.io-client";
import { Send, UserCircle } from "lucide-react";

export default function Chat() {
    const user = useAuthStore((s) => s.user);
    const token = useAuthStore((s) => s.token);
    const [contacts, setContacts] = useState([]);
    const [activeContact, setActiveContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Fetch contacts
        const fetchContacts = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/contacts", {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setContacts(data);
                }
            } catch (err) {
                console.error("Failed to fetch contacts", err);
            } finally {
                setLoading(false);
            }
        };
        fetchContacts();
    }, [token]);

    useEffect(() => {
        if (!user) return;

        // Initialize Socket.io
        socketRef.current = io((import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"));
        
        socketRef.current.on('connect', () => {
            socketRef.current.emit('join_user_room', user.id);
        });

        socketRef.current.on('receive_message', (message) => {
            setMessages((prev) => {
                // If it's a message in the current active chat or sent by us
                if (activeContact && (message.sender_id === activeContact.id || message.receiver_id === activeContact.id)) {
                    // Prevent duplicates
                    if (!prev.find(m => m.id === message.id)) {
                        return [...prev, message];
                    }
                }
                return prev;
            });
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, [user, activeContact]);

    useEffect(() => {
        if (activeContact) {
            const fetchChatHistory = async () => {
                try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/chat/${activeContact.id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setMessages(data);
                    }
                } catch (err) {
                    console.error("Failed to fetch chat history", err);
                }
            };
            fetchChatHistory();
        } else {
            setMessages([]);
        }
    }, [activeContact, token]);

    useEffect(() => {
        // Auto scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || !activeContact) return;

        const data = {
            sender_id: user.id,
            receiver_id: activeContact.id,
            content: input.trim()
        };

        socketRef.current.emit('send_message', data);
        setInput("");
    };

    if (loading) return <div style={{ padding: "2rem", color: "white" }}>Loading contacts...</div>;

    return (
        <div style={{ height: "calc(100vh - 56px)", display: "flex", background: "hsl(220 14% 6%)" }}>
            {/* Sidebar (Contacts) */}
            <div style={{ width: "300px", borderRight: "1px solid hsl(220 20% 12%)", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "1.5rem", borderBottom: "1px solid hsl(220 20% 12%)" }}>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>Messages</h2>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {contacts.length === 0 ? (
                        <div style={{ padding: "1.5rem", color: "hsl(220 15% 55%)", fontSize: "0.85rem", textAlign: "center" }}>No contacts found.</div>
                    ) : (
                        contacts.map(contact => (
                            <div 
                                key={contact.id} 
                                onClick={() => setActiveContact(contact)}
                                style={{ 
                                    padding: "1rem 1.5rem", 
                                    borderBottom: "1px solid hsl(220 20% 10%)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    background: activeContact?.id === contact.id ? "hsl(220 20% 14%)" : "transparent",
                                    transition: "background 0.2s"
                                }}
                            >
                                <UserCircle size={40} color="hsl(220 15% 55%)" />
                                <div>
                                    <div style={{ color: "white", fontWeight: 600, fontSize: "0.95rem" }}>{contact.name}</div>
                                    <div style={{ color: "hsl(220 15% 55%)", fontSize: "0.75rem", textTransform: "capitalize" }}>{contact.role}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "hsl(220 14% 8%)" }}>
                {!activeContact ? (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(220 15% 55%)" }}>
                        Select a contact to start chatting
                    </div>
                ) : (
                    <>
                        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid hsl(220 20% 12%)", display: "flex", alignItems: "center", gap: "1rem", background: "hsl(220 14% 6%)" }}>
                            <UserCircle size={32} color="hsl(200 100% 65%)" />
                            <div>
                                <h3 style={{ color: "white", fontWeight: 600, margin: 0 }}>{activeContact.name}</h3>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {messages.map(msg => {
                                const isMe = msg.sender_id === user.id;
                                return (
                                    <div key={msg.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                                        <div style={{
                                            background: isMe ? "hsl(200 100% 40%)" : "hsl(220 20% 16%)",
                                            color: "white",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "12px",
                                            borderBottomRightRadius: isMe ? "2px" : "12px",
                                            borderBottomLeftRadius: !isMe ? "2px" : "12px",
                                            fontSize: "0.95rem",
                                            lineHeight: 1.5
                                        }}>
                                            {msg.content}
                                        </div>
                                        <div style={{ fontSize: "0.65rem", color: "hsl(220 15% 55%)", marginTop: "0.25rem", textAlign: isMe ? "right" : "left" }}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div style={{ padding: "1.5rem", borderTop: "1px solid hsl(220 20% 12%)", background: "hsl(220 14% 6%)" }}>
                            <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "1rem" }}>
                                <input 
                                    className="input" 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..." 
                                    style={{ flex: 1 }}
                                />
                                <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
