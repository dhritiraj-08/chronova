"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Brain, User, RefreshCw, Mic, MicOff } from "lucide-react";
import { useScheduleStore } from "@/lib/store/scheduleStore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: Date | string;
}

const WELCOME: Message = {
  id: "welcome-quick",
  role: "assistant",
  content: "Hi! I'm **Chronova Quick Assist**. 🧠\n\nAsk me to adjust your study times, move sessions (e.g. \"move math to 9 to 10 today\"), or ask study science questions. Any schedule updates will apply to your calendar instantly!",
  time: new Date(),
};

function renderMarkdown(text: string) {
  let cleanText = text;
  const tagIdx = text.indexOf("<timetable_data>");
  if (tagIdx !== -1) {
    cleanText = text.substring(0, tagIdx);
  }
  return cleanText
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code style="background:rgba(139,92,246,0.1);padding:2px 6px;border-radius:4px;font-size:12.5px;color:var(--c-accent-light);border:1px solid rgba(139,92,246,0.2)">$1</code>')
    .replace(/\n/g, "<br/>");
}

export default function FloatingAssistant() {
  const { events, setEvents } = useScheduleStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Load quick chat from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chronova_quick_chat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse quick chat", e);
      }
    }
    setMessages([WELCOME]);
  }, []);

  // Save messages
  const saveMessages = (updated: Message[]) => {
    setMessages(updated);
    localStorage.setItem("chronova_quick_chat", JSON.stringify(updated));
  };

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Voice recognition init
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? " " : "") + transcript);
      };

      rec.onerror = (e: any) => {
        console.error("Quick assistant voice recognition error", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, time: new Date() };
    const aiId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiId, role: "assistant", content: "", time: new Date() };

    const nextMessages = [...messages, userMsg, aiMsg];
    saveMessages(nextMessages);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== "welcome-quick")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...history, { role: "user", content: msg }],
          userContext: { events }
        }),
      });

      if (!res.ok) throw new Error("API error");
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += dec.decode(value, { stream: true });
          
          setMessages(prev => {
            const updated = prev.map(m => m.id === aiId ? { ...m, content: full } : m);
            localStorage.setItem("chronova_quick_chat", JSON.stringify(updated));
            return updated;
          });
        }

        // Auto-apply schedule changes in real-time when streaming is complete
        const match = full.match(/<timetable_data>([\s\S]*?)<\/timetable_data>/);
        if (match) {
          try {
            const parsedEvents = JSON.parse(match[1].trim());
            if (Array.isArray(parsedEvents) && parsedEvents.length > 0) {
              setEvents(parsedEvents);
            }
          } catch (e) {
            console.error("Failed to auto-apply quick assistant timetable JSON", e);
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = prev.map(m => m.id === aiId
          ? { ...m, content: "I couldn't connect to my AI brain. Please check your network connection or try again in a moment." }
          : m
        );
        localStorage.setItem("chronova_quick_chat", JSON.stringify(updated));
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--c-accent), var(--c-secondary))",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 8px 32px rgba(139, 92, 246, 0.35), 0 0 16px var(--c-accent-glow)",
          color: "#ffffff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          transition: "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.25s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "scale(1.08) translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 12px 36px rgba(139, 92, 246, 0.45), 0 0 20px var(--c-accent-glow)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1) translateY(0)";
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(139, 92, 246, 0.35), 0 0 16px var(--c-accent-glow)";
        }}
        title="Quick Chat Assistant"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {/* Quick Chat Overlay Card */}
      {isOpen && (
        <div 
          style={{
            position: "fixed",
            bottom: "92px",
            right: "24px",
            width: "380px",
            height: "520px",
            background: "rgba(10, 11, 18, 0.94)",
            border: "1px solid var(--c-border-2)",
            borderRadius: "20px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
            animation: "overlaySlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {/* Header */}
          <div 
            style={{ 
              padding: "16px 20px", 
              borderBottom: "1px solid var(--c-border-1)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              background: "rgba(8, 9, 15, 0.4)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--c-accent-dim)", border: "1px solid var(--c-accent-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} color="var(--c-accent-light)" />
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--c-text-primary)", fontFamily: "var(--font-display)" }}>Chronova Assist</p>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "1px" }}>
                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--c-success)" }} />
                  <span style={{ fontSize: "10px", color: "var(--c-text-tertiary)" }}>Online</span>
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "6px" }}>
              <button 
                onClick={() => saveMessages([WELCOME])}
                style={{ background: "none", border: "none", color: "var(--c-text-tertiary)", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--c-text-primary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--c-text-tertiary)"}
              >
                Clear
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: "none", border: "none", color: "var(--c-text-tertiary)", cursor: "pointer", display: "flex" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--c-text-primary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--c-text-tertiary)"}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: "flex", gap: "10px", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                  background: msg.role === "assistant" ? "var(--c-accent-dim)" : "var(--c-secondary-dim)",
                  border: msg.role === "assistant" ? "1px solid var(--c-accent-border)" : "1px solid var(--c-secondary-border)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {msg.role === "assistant" ? <Brain size={14} color="var(--c-accent-light)" /> : <User size={13} color="var(--c-secondary-light)" />}
                </div>

                <div style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                  background: msg.role === "user" ? "rgba(22, 26, 41, 0.85)" : "var(--c-surface-paper)",
                  border: msg.role === "user" ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid var(--c-border-paper)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}>
                  {msg.content === "" && loading ? (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "4px 0" }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: "6px", height: "6px", borderRadius: "50%", background: "var(--c-accent)",
                          animation: `pulsingBeacon 1.2s ease-in-out ${i * 0.2}s infinite`
                        }} />
                      ))}
                    </div>
                  ) : (
                    <p style={{ 
                      fontSize: "13px", 
                      lineHeight: 1.5, 
                      color: msg.role === "user" ? "var(--c-text-primary)" : "var(--c-text-paper)"
                    }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  )}
                  <span style={{ fontSize: "9px", color: "var(--c-text-tertiary)", display: "block", marginTop: "6px", textAlign: msg.role === "user" ? "right" : "left" }}>
                    {new Date(msg.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input Panel */}
          <div style={{ padding: "14px 18px", borderTop: "1px solid var(--c-border-1)", background: "rgba(8, 9, 15, 0.4)", display: "flex", gap: "10px", alignItems: "center" }}>
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              placeholder="Ask Quick Assist..."
              disabled={loading}
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--c-border-1)",
                borderRadius: "10px",
                padding: "8px 12px",
                color: "var(--c-text-primary)",
                fontSize: "13px",
                outline: "none",
                fontFamily: "var(--font-sans)",
              }}
            />
            {/* Mic Toggle Button */}
            <button
              onClick={toggleListening}
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: isListening ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.03)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all var(--t-base)", flexShrink: 0,
                color: isListening ? "#ef4444" : "var(--c-text-tertiary)",
                border: isListening ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid transparent",
              }}
              className={isListening ? "pulsing-mic-active" : ""}
              title={isListening ? "Listening... Click to stop" : "Voice Input"}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: "36px", height: "36px", borderRadius: "10px", border: "none",
                background: input.trim() && !loading ? "var(--c-accent)" : "rgba(255,255,255,0.03)",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: input.trim() && !loading ? "0 4px 12px var(--c-accent-glow)" : "none",
                transition: "all var(--t-base)", flexShrink: 0,
              }}
            >
              {loading
                ? <RefreshCw size={14} color="var(--c-text-tertiary)" style={{ animation: "spin 0.8s linear infinite" }} />
                : <Send size={14} color={input.trim() ? "#fff" : "var(--c-text-tertiary)"} />
              }
            </button>
          </div>
        </div>
      )}

      {/* Animation definition */}
      <style jsx global>{`
        @keyframes overlaySlideUp {
          from {
            transform: translateY(30px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
