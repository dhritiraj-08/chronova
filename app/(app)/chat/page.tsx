"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Brain, Send, Trash2, RefreshCw, User, Clock, Check, 
  Download, Calendar, Plus, Mic, MicOff, Sparkles, BookOpen, 
  Award, Moon, Target, Shield, HelpCircle, X
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useScheduleStore, ScheduleEvent } from "@/lib/store/scheduleStore";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: Date | string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

const QUICK_CHIPS = [
  "I'm exhausted — lighten my day",
  "I have an exam in 3 days",
  "Move math to evening",
  "I missed today's sessions",
  "Give me a study tip",
  "Add gym at 6 PM tomorrow"
];

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: `Hi! I'm **Chronova**, your AI Academic Mentor.\n\nI can help you:\n- Build and optimize your study schedule\n- Manage cognitive workload when you're tired or overwhelmed\n- Automatically redistribute missed revision blocks\n- Advise you on evidence-based study strategies\n\nWhat's on your mind?`,
  time: new Date(),
};

// Shown only when the model actually proposed a timetable change but gave no
// surrounding explanation text (rare, but happens with some free-tier models).
const FALLBACK_ASSISTANT_TEXT_WITH_TIMETABLE = "I've updated your schedule. Check the calendar to see the changes.";
// Shown when the model's response had no usable text AND no timetable block —
// i.e. it just failed to answer. Saying "I've updated your schedule" here would
// be false (nothing was updated), which used to make every failed reply look
// identical regardless of what was asked.
const FALLBACK_ASSISTANT_TEXT_NO_CONTENT = "Sorry, I didn't quite catch that — could you rephrase your question?";

// Strips the <timetable_data> JSON block out of an assistant message so only the
// natural-language explanation is shown, keeping any text that comes before OR
// after the block (the model is expected to put text before it, but this is
// robust either way). While the block is only partially streamed in (opening
// tag seen, closing tag not yet), everything from the opening tag onward is
// hidden so raw/partial JSON never flashes on screen.
//
// Some responses (especially from the smaller free-tier fallback models) come
// back as ONLY the <timetable_data> block with no surrounding explanation at
// all — once streaming has finished, that would otherwise leave the message
// bubble completely blank. `isStreaming` lets the caller say whether more text
// might still be coming, so the fallback text is only substituted once we know
// the final response really did contain no natural language at all.
function renderMarkdown(text: string, isStreaming: boolean = false) {
  const fullBlockMatch = text.match(/<timetable_data>[\s\S]*?<\/timetable_data>/);
  const hadTimetable = !!fullBlockMatch || text.includes("<timetable_data>");
  let cleanText: string;
  if (fullBlockMatch) {
    cleanText = text.replace(fullBlockMatch[0], "").trim();
  } else {
    const openTagIdx = text.indexOf("<timetable_data>");
    cleanText = (openTagIdx !== -1 ? text.substring(0, openTagIdx) : text).trim();
  }

  if (!cleanText) {
    if (isStreaming) return "";
    cleanText = hadTimetable ? FALLBACK_ASSISTANT_TEXT_WITH_TIMETABLE : FALLBACK_ASSISTANT_TEXT_NO_CONTENT;
  }

  return cleanText
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code style="background:var(--c-surface-2);padding:2px 6px;border-radius:var(--r-sm);font-size:12px;color:var(--c-text-primary);border:1px solid var(--c-border-1)">$1</code>')
    .replace(/\n/g, "<br/>");
}

function fmtHour(h: number) {
  const hr = Math.floor(h);
  const min = String(Math.round((h % 1) * 60)).padStart(2, "0");
  const ampm = hr >= 12 ? "PM" : "AM";
  const displayHr = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${displayHr}:${min} ${ampm}`;
}

export default function ChatPage() {
  const { events, setEvents, exams, loadFromDatabase } = useScheduleStore();
  // createClient() returns a new client instance every call. Keeping it in a
  // plain const meant every render produced a new `supabase` reference, which
  // made the mount effect below (depending on `supabase`) re-run on every
  // state change — including right after starting a new, not-yet-persisted
  // chat, silently wiping it back to whatever was last saved in Supabase.
  // useState's lazy initializer creates it exactly once.
  const [supabase] = useState(() => createClient());

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Per-message feedback for the "Apply Changes" button, shown inline instead
  // of a browser alert() — keyed by message id.
  const [applyStatus, setApplyStatus] = useState<Record<string, "success" | "none">>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Layout sidebar states
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  const [showContextSidebar, setShowContextSidebar] = useState(true);

  // Profile Context from Supabase
  const [profileContext, setProfileContext] = useState<{
    sleepStart: string;
    sleepEnd: string;
    goals: string[];
  }>({ sleepStart: "23:00", sleepEnd: "07:00", goals: [] });

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Load chat history & context on mount
  useEffect(() => {
    loadFromDatabase();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("sleep_start, sleep_end, goals")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setProfileContext({
                sleepStart: data.sleep_start || "23:00",
                sleepEnd: data.sleep_end || "07:00",
                goals: data.goals || []
              });
            }
          });
      }
    });

    loadConversationsFromDB();
  }, [loadFromDatabase, supabase]);

  // Generates a stable id for a new conversation thread, client-side.
  const newConversationId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

  // A conversation's title is just its first user message, truncated —
  // there's no separate "title" column in chat_messages, so it's derived
  // the same way whether the conversation was just started or loaded back
  // from Supabase.
  const deriveTitle = (firstUserContent: string | undefined) => {
    if (!firstUserContent) return "New Chat";
    return firstUserContent.length > 25 ? firstUserContent.substring(0, 22) + "..." : firstUserContent;
  };

  const freshDefaultConversation = (): Conversation => ({
    id: newConversationId(),
    title: "New Chat",
    messages: [WELCOME],
    createdAt: new Date().toISOString()
  });

  // Loads every chat_messages row for the current user and regroups it into
  // conversation threads via metadata.conversation_id (the schema has no
  // dedicated conversations table, so this JSON field is what keeps separate
  // chat threads apart — see FIX 7 notes).
  const loadConversationsFromDB = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const fresh = freshDefaultConversation();
      setConversations([fresh]);
      setActiveConversationId(fresh.id);
      return;
    }

    const { data: rows, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load chat history from Supabase:", error);
    }

    const groups = new Map<string, Conversation>();
    (rows || []).forEach((row: any) => {
      const convId: string = row.metadata?.conversation_id || "legacy";
      if (!groups.has(convId)) {
        groups.set(convId, { id: convId, title: "New Chat", messages: [WELCOME], createdAt: row.created_at });
      }
      groups.get(convId)!.messages.push({
        id: row.id,
        role: row.role,
        content: row.content,
        time: row.created_at
      });
    });

    groups.forEach((conv) => {
      const firstUserMsg = conv.messages.find((m) => m.role === "user");
      conv.title = deriveTitle(firstUserMsg?.content);
    });

    const loaded = Array.from(groups.values()).sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.time ?? a.createdAt;
      const bLast = b.messages[b.messages.length - 1]?.time ?? b.createdAt;
      return new Date(bLast as string).getTime() - new Date(aLast as string).getTime();
    });

    if (loaded.length === 0) {
      const fresh = freshDefaultConversation();
      setConversations([fresh]);
      setActiveConversationId(fresh.id);
    } else {
      setConversations(loaded);
      setActiveConversationId(loaded[0].id);
    }
  };

  // Voice speech setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onstart = () => setIsListening(true);
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? " " : "") + transcript);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
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

  const activeConv = conversations.find(c => c.id === activeConversationId) || conversations[0];
  const activeMessages = activeConv ? activeConv.messages : [WELCOME];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  const startNewChat = () => {
    // Nothing to persist yet — a conversation only gets written to
    // chat_messages once it actually has a real message in it (see send()).
    const newConv = freshDefaultConversation();
    setConversations([newConv, ...conversations]);
    setActiveConversationId(newConv.id);
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", user.id)
        .eq("metadata->>conversation_id", id);
      if (error) console.error("Failed to delete conversation from Supabase:", error);
    }

    const filtered = conversations.filter(c => c.id !== id);
    if (filtered.length === 0) {
      const fresh = freshDefaultConversation();
      setConversations([fresh]);
      setActiveConversationId(fresh.id);
    } else {
      setConversations(filtered);
      if (activeConversationId === id) {
        setActiveConversationId(filtered[0].id);
      }
    }
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const { data: { user } } = await supabase.auth.getUser();

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, time: new Date() };
    const aiId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiId, role: "assistant", content: "", time: new Date() };

    let nextTitle = activeConv ? activeConv.title : "New Chat";
    if (activeMessages.length === 1 && nextTitle === "New Chat") {
      nextTitle = deriveTitle(msg);
    }

    const updatedMessages = [...activeMessages, userMsg, aiMsg];
    const initialConvs = conversations.map(c =>
      c.id === activeConversationId
        ? { ...c, title: nextTitle, messages: updatedMessages }
        : c
    );
    setConversations(initialConvs);
    setLoading(true);

    // Persist the user's message right away — no need to wait for the AI reply.
    if (user) {
      const { error } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "user",
        content: msg,
        metadata: { conversation_id: activeConversationId }
      });
      if (error) console.error("Failed to save user message to Supabase:", error);
    }

    try {
      const history = activeMessages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: msg }],
          userContext: { events, goals: profileContext.goals }
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

          setConversations(prev => prev.map(c =>
            c.id === activeConversationId
              ? { ...c, messages: c.messages.map(m => m.id === aiId ? { ...m, content: full } : m) }
              : c
          ));
        }
      }

      // Persist the finished assistant reply once streaming has completed —
      // there's no need (and no real benefit) to write a row per chunk.
      if (user && full) {
        const { error } = await supabase.from("chat_messages").insert({
          user_id: user.id,
          role: "assistant",
          content: full,
          metadata: { conversation_id: activeConversationId }
        });
        if (error) console.error("Failed to save assistant message to Supabase:", error);
      }
    } catch {
      // A transient client-side connection error, not a real AI reply —
      // shown locally but intentionally not written to chat_messages.
      setConversations(prev => prev.map(c =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: c.messages.map(m => m.id === aiId
                ? { ...m, content: "Error communicating. Ensure the AI Assistant is configured correctly." }
                : m
              )
            }
          : c
      ));
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const todayEvents = events.filter(e => e.day === todayIdx).sort((a,b) => a.start - b.start);

  const subjectHours: Record<string, number> = {};
  events.forEach(e => {
    subjectHours[e.title] = (subjectHours[e.title] || 0) + (e.end - e.start);
  });

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", height: "calc(100vh - 120px)", display: "flex", gap: "16px" }} className="animate-fade">
      
      {/* COLUMN 1: Sidebar - Chat History */}
      {showHistorySidebar && (
        <div style={{ 
          width: "220px", 
          background: "var(--c-surface-0)", 
          border: "1px solid var(--c-border-1)", 
          borderRadius: "var(--r-lg)", 
          display: "flex", 
          flexDirection: "column", 
          overflow: "hidden",
          flexShrink: 0
        }}>
          <div style={{ padding: "12px", borderBottom: "1px solid var(--c-border-1)" }}>
            <button 
              onClick={startNewChat} 
              className="btn btn-primary" 
              style={{ width: "100%", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", height: "32px" }}
            >
              <Plus size={13} /> New Chat
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {conversations.map(conv => {
              const isActive = conv.id === activeConversationId;
              return (
                <div 
                  key={conv.id} 
                  onClick={() => setActiveConversationId(conv.id)}
                  style={{
                    padding: "6px 8px", 
                    borderRadius: "var(--r-md)", 
                    cursor: "pointer", 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    background: isActive ? "var(--c-surface-1)" : "transparent",
                    border: "1px solid " + (isActive ? "var(--c-border-1)" : "transparent"),
                    transition: "all var(--t-fast)",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", flex: 1 }}>
                    <Brain size={12} color={isActive ? "var(--c-text-primary)" : "var(--c-text-tertiary)"} style={{ flexShrink: 0 }} />
                    <span style={{ 
                      fontSize: "12px", 
                      fontWeight: isActive ? 500 : 400, 
                      color: isActive ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                      overflow: "hidden", 
                      textOverflow: "ellipsis", 
                      whiteSpace: "nowrap" 
                    }}>
                      {conv.title}
                    </span>
                  </div>
                  {conversations.length > 1 && (
                    <button 
                      onClick={(e) => deleteChat(conv.id, e)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-tertiary)", display: "flex" }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COLUMN 2: Center Panel - Active Chat Screen */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", background: "var(--c-surface-0)", border: "1px solid var(--c-border-1)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
        
        {/* Chat Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid var(--c-border-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button 
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              style={{
                width: "28px", height: "28px", borderRadius: "var(--r-md)", border: "1px solid var(--c-border-1)",
                background: showHistorySidebar ? "var(--c-surface-2)" : "transparent",
                color: "var(--c-text-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}
              title="Toggle History Sidebar"
            >
              <Brain size={13} />
            </button>

            {/* AI Avatar with status beacon */}
            <div style={{ position: "relative" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--c-accent-dim)", border: "1.5px solid var(--c-accent-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={14} color="var(--c-accent)" />
              </div>
              <span style={{ position: "absolute", bottom: 0, right: 0, width: "7.5px", height: "7.5px", borderRadius: "50%", background: "var(--c-success)", border: "1.5px solid var(--c-base)", display: "block" }} />
            </div>
            
            <div>
              <p style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--c-text-primary)", lineHeight: 1.2 }}>AI Academic Mentor</p>
              <span style={{ fontSize: "9.5px", color: "var(--c-text-secondary)" }}>Online • Cognitive Study Advisor</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <button
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const { error } = await supabase
                    .from("chat_messages")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("metadata->>conversation_id", activeConversationId);
                  if (error) console.error("Failed to clear conversation in Supabase:", error);
                }
                setConversations(conversations.map(c => c.id === activeConversationId ? { ...c, messages: [WELCOME] } : c));
              }}
              className="btn btn-ghost"
              style={{ fontSize: "11px", padding: "4px 8px" }}
            >
              Clear
            </button>
            
            <button 
              onClick={() => setShowContextSidebar(!showContextSidebar)}
              style={{
                width: "28px", height: "28px", borderRadius: "var(--r-md)", border: "1px solid var(--c-border-1)",
                background: showContextSidebar ? "var(--c-surface-2)" : "transparent",
                color: "var(--c-text-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}
              title="Toggle Context Panel"
            >
              <Target size={13} />
            </button>
          </div>
        </div>

        {/* Message Feed Area */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
          {activeMessages.map((msg, msgIdx) => {
            // Only the last assistant message can still be actively streaming in —
            // every earlier message is already final, so its content should never
            // be treated as "more text might still be coming".
            const isStreamingMsg = loading && msgIdx === activeMessages.length - 1 && msg.role === "assistant";
            return (
            <div key={msg.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexDirection: "row" }}>
              
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                background: msg.role === "assistant" ? "var(--c-surface-2)" : "var(--c-surface-1)",
                border: "1px solid var(--c-border-1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginTop: "2px",
                position: "relative"
              }}>
                {msg.role === "assistant" ? (
                  <>
                    <Brain size={12} color="var(--c-accent)" />
                    <span style={{ position: "absolute", bottom: "-1px", right: "-1px", width: "6px", height: "6px", borderRadius: "50%", background: "var(--c-success)", border: "1px solid var(--c-base)" }} />
                  </>
                ) : <User size={12} color="var(--c-text-secondary)" />}
              </div>

              {/* Reduced Chat Bubble to Clean Text Block */}
              <div style={{
                flex: 1,
                minWidth: 0,
                color: "var(--c-text-primary)",
                paddingRight: "20px"
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 650, color: "var(--c-text-primary)" }}>
                    {msg.role === "assistant" ? "AI Academic Mentor" : "You"}
                  </span>
                  <span style={{ fontSize: "9px", color: "var(--c-text-secondary)" }}>
                    {new Date(msg.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div style={{
                  padding: msg.role === "user" ? "8px 12px" : "0",
                  background: msg.role === "user" ? "var(--c-surface-1)" : "transparent",
                  border: msg.role === "user" ? "1px solid var(--c-border-1)" : "none",
                  borderRadius: "var(--r-md)",
                  display: "inline-block",
                  maxWidth: "100%",
                }}>
                  {msg.content === "" && loading ? (
                    <div style={{ display: "flex", gap: "4px", padding: "6px 0" }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--c-text-secondary)", animation: "pulsingBeacon 1s infinite alternate" }} />
                      ))}
                    </div>
                  ) : (() => {
                    let parsedEvents: ScheduleEvent[] | null = null;
                    const match = msg.content.match(/<timetable_data>([\s\S]*?)<\/timetable_data>/);
                    if (match) {
                      try {
                        parsedEvents = JSON.parse(match[1].trim());
                      } catch (e) {
                        console.error("Failed to parse", e);
                      }
                    }

                    // Compute side-by-side suggested comparisons
                    const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                    const shifts: { original: ScheduleEvent; proposed: ScheduleEvent }[] = [];
                    const additions: ScheduleEvent[] = [];

                    if (parsedEvents) {
                      parsedEvents.forEach(pe => {
                        const matching = events.find(ce => ce.title === pe.title || ce.title.replace(" (Rescheduled)", "") === pe.title);
                        if (matching) {
                          if (matching.day !== pe.day || matching.start !== pe.start || matching.end !== pe.end) {
                            shifts.push({ original: matching, proposed: pe });
                          }
                        } else {
                          additions.push(pe);
                        }
                      });
                    }

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: msg.role === "user" ? "var(--c-text-primary)" : "var(--c-text-secondary)" }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content, isStreamingMsg) }} />
                        
                        {/* Side-by-Side Suggested Comparisons Widgets */}
                        {parsedEvents && (shifts.length > 0 || additions.length > 0) && (
                          <div className="card" style={{ padding: "14px", marginTop: "8px", border: "1px solid var(--c-border-2)", background: "var(--c-surface-1)", boxShadow: "var(--sh-sm)", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "450px" }}>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", borderBottom: "1px solid var(--c-border-1)", paddingBottom: "6px" }}>
                              <Sparkles size={12} color="var(--c-accent)" />
                              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--c-text-primary)" }}>Proposed Schedule Adjustments</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {shifts.map(({ original, proposed }, idx) => (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", background: "var(--c-surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--c-border-1)" }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: "8.5px", color: "var(--c-text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>Current</span>
                                    <p style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--c-text-secondary)" }} className="truncate">{original.title}</p>
                                    <p style={{ fontSize: "9.5px", color: "var(--c-text-tertiary)" }}>{DAYS_SHORT[original.day]} {fmtHour(original.start)}</p>
                                  </div>
                                  <div style={{ color: "var(--c-accent)", fontWeight: 750, fontSize: "13px" }}>→</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: "8.5px", color: "var(--c-accent)", fontWeight: 700, textTransform: "uppercase" }}>Suggested</span>
                                    <p style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--c-text-primary)" }} className="truncate">{proposed.title}</p>
                                    <p style={{ fontSize: "9.5px", color: "var(--c-text-secondary)" }}>{DAYS_SHORT[proposed.day]} {fmtHour(proposed.start)}</p>
                                  </div>
                                </div>
                              ))}

                              {additions.map((added, idx) => (
                                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", background: "var(--c-accent-dim)", borderRadius: "var(--r-md)", border: "1px dashed var(--c-accent-border)" }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: "8.5px", color: "var(--c-accent)", fontWeight: 700, textTransform: "uppercase" }}>➕ Suggested New Slot</span>
                                    <p style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--c-text-primary)" }} className="truncate">{added.title}</p>
                                    <p style={{ fontSize: "9.5px", color: "var(--c-text-secondary)" }}>{DAYS_SHORT[added.day]} {fmtHour(added.start)} - {fmtHour(added.end)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Styled Action Recommendation Card Buttons */}
                        {msg.role === "assistant" && msg.id !== "welcome" && (
                          <div style={{ 
                            display: "flex", 
                            gap: "6px", 
                            flexWrap: "wrap",
                            marginTop: "8px",
                            paddingTop: "8px",
                            borderTop: "1px solid var(--c-border-1)"
                          }}>
                            <button
                              onClick={() => {
                                if (parsedEvents) {
                                  // The model now sends only new/changed/removed events (see
                                  // CHAT_SYSTEM_PROMPT) — merge them into the existing schedule
                                  // by id instead of replacing the whole week, which is also what
                                  // lets small/free models reply reliably without truncating a
                                  // full-week JSON array before it becomes valid.
                                  const merged = [...events];
                                  parsedEvents.forEach(pe => {
                                    const idx = merged.findIndex(e => String(e.id) === String(pe.id));
                                    if ((pe as any).deleted) {
                                      if (idx !== -1) merged.splice(idx, 1);
                                      return;
                                    }
                                    if (idx !== -1) merged[idx] = { ...merged[idx], ...pe };
                                    else merged.push(pe);
                                  });
                                  setEvents(merged);
                                  setApplyStatus(prev => ({ ...prev, [msg.id]: "success" }));
                                } else {
                                  setApplyStatus(prev => ({ ...prev, [msg.id]: "none" }));
                                }
                              }}
                              className="btn btn-primary"
                              style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "var(--r-md)", background: "var(--c-accent-dark)", color: "#FFFFFF", borderColor: "var(--c-accent-dark)" }}
                            >
                              Apply Changes
                            </button>
                            <button 
                              onClick={() => {
                                setInput("Can you adjust this study schedule slightly to make study slots shorter?");
                                textareaRef.current?.focus();
                              }}
                              className="btn btn-secondary" 
                              style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "var(--r-md)" }}
                            >
                              Modify
                            </button>
                            <button 
                              onClick={() => {
                                send("Can you explain the cognitive logic behind this recommendation?");
                              }}
                              className="btn btn-secondary" 
                              style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "var(--r-md)" }}
                            >
                              Explain
                            </button>
                            <button
                              onClick={(e) => {
                                const target = e.currentTarget.parentElement;
                                if (target) target.style.display = "none";
                              }}
                              className="btn btn-secondary"
                              style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "var(--r-md)" }}
                            >
                              Dismiss
                            </button>
                          </div>
                        )}

                        {/* Inline feedback for "Apply Changes" — replaces the old alert() popup */}
                        {applyStatus[msg.id] === "success" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", fontSize: "11px", color: "#047857", fontWeight: 600 }}>
                            <Check size={12} /> Schedule updated — check your calendar to see the changes.
                          </div>
                        )}
                        {applyStatus[msg.id] === "none" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px", fontSize: "11px", color: "var(--c-text-secondary)" }}>
                            <HelpCircle size={12} /> No new timetable was proposed in this message — nothing to apply.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Quick Chips input shortcuts */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", padding: "8px 12px", background: "var(--c-surface-0)", borderTop: "1px solid var(--c-border-1)" }}>
          {QUICK_CHIPS.map(chip => (
            <button 
              key={chip} 
              onClick={() => send(chip)} 
              style={{
                padding: "4px 10px", borderRadius: "var(--r-full)", border: "1px solid var(--c-border-1)",
                background: "var(--c-surface-1)", color: "var(--c-text-secondary)", fontSize: "11px",
                cursor: "pointer", whiteSpace: "nowrap", transition: "all var(--t-fast)"
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--c-text-primary)"; e.currentTarget.style.borderColor = "var(--c-border-2)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--c-text-secondary)"; e.currentTarget.style.borderColor = "var(--c-border-1)"; }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Message Input controls */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--c-border-1)", display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            id="chat-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Chronova to adjust schedule, plan recovery sessions..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "var(--c-text-primary)", fontSize: "12.5px", resize: "none",
              fontFamily: "var(--font-sans)", lineHeight: 1.5, maxHeight: "100px"
            }}
          />
          
          <button
            onClick={toggleListening}
            style={{
              width: "32px", height: "32px", borderRadius: "var(--r-md)", border: "none",
              background: isListening ? "rgba(239, 68, 68, 0.05)" : "transparent",
              color: isListening ? "var(--c-danger)" : "var(--c-text-tertiary)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            }}
            title={isListening ? "Listening..." : "Speech Command"}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>

          <button
            id="chat-send-btn"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: "32px", height: "32px", borderRadius: "var(--r-md)", border: "none",
              background: input.trim() && !loading ? "var(--c-text-primary)" : "transparent",
              color: input.trim() && !loading ? "var(--c-base)" : "var(--c-text-tertiary)",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            {loading ? <RefreshCw size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Send size={13} />}
          </button>
        </div>
      </div>

      {/* COLUMN 3: Right Panel - Current Context Center */}
      {showContextSidebar && (
        <div style={{
          width: "260px",
          background: "var(--c-surface-0)",
          border: "1px solid var(--c-border-1)",
          borderRadius: "var(--r-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          padding: "14px",
          overflowY: "auto",
          flexShrink: 0
        }}>
          <div style={{ borderBottom: "1px solid var(--c-border-1)", paddingBottom: "8px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-display)", color: "var(--c-text-primary)" }}>
              Current Context
            </h3>
            <p style={{ fontSize: "10.5px", color: "var(--c-text-secondary)", marginTop: "1px" }}>
              Active student parameters
            </p>
          </div>

          {/* Today's Schedule */}
          <div>
            <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "var(--c-accent-dark)", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
              Today's Schedule
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {todayEvents.length === 0 ? (
                <p style={{ fontSize: "11px", color: "var(--c-text-secondary)" }}>No sessions today</p>
              ) : (
                todayEvents.map(e => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px", background: "var(--c-surface-1)", borderRadius: "var(--r-sm)", border: "1px solid var(--c-border-1)" }}>
                    <span style={{ fontSize: "11px", color: "var(--c-text-secondary)" }} className="truncate">{e.title}</span>
                    <span style={{ fontSize: "9.5px", color: "var(--c-text-secondary)", fontWeight: 600 }}>{fmtHour(e.start)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Exams */}
          <div>
            <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "#B45309", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
              Upcoming Exams
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {exams.length === 0 ? (
                <p style={{ fontSize: "11px", color: "var(--c-text-secondary)" }}>No exams scheduled</p>
              ) : (
                exams.slice(0, 3).map(ex => (
                  <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 6px", background: "var(--c-surface-1)", borderRadius: "var(--r-sm)", border: "1px solid var(--c-border-1)" }}>
                    <span style={{ fontSize: "11px", color: "var(--c-text-secondary)" }} className="truncate">{ex.name}</span>
                    <span style={{ fontSize: "9.5px", color: "#B45309", fontWeight: 600 }}>{ex.date}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sleep Hours & Goals */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px", background: "var(--c-surface-1)", border: "1px solid var(--c-border-1)", borderRadius: "var(--r-md)" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Moon size={12} color="var(--c-text-secondary)" />
              <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--c-text-secondary)" }}>
                Sleep: {profileContext.sleepStart} - {profileContext.sleepEnd}
              </span>
            </div>
            
            {profileContext.goals.length > 0 && (
              <div style={{ borderTop: "1px solid var(--c-border-0)", paddingTop: "6px" }}>
                <span style={{ fontSize: "8.5px", color: "var(--c-text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>Goals</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "3px" }}>
                  {profileContext.goals.map(g => (
                    <span key={g} style={{ fontSize: "9px", padding: "1px 4px", borderRadius: "var(--r-sm)", background: "var(--c-surface-2)", border: "1px solid var(--c-border-1)", color: "var(--c-text-secondary)" }}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subject Study Progress */}
          <div>
            <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", color: "#047857", letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>
              Study Hours
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {Object.entries(subjectHours).map(([sub, hours], i) => {
                const colors = ["var(--c-accent)", "var(--c-secondary)", "var(--c-success)", "var(--c-orange)"];
                const c = colors[i % colors.length];
                return (
                  <div key={sub}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", marginBottom: "2px" }}>
                      <span style={{ color: "var(--c-text-secondary)" }} className="truncate">{sub}</span>
                      <span style={{ color: "var(--c-text-primary)", fontWeight: 600 }}>{hours.toFixed(1)}h</span>
                    </div>
                    <div className="progress-track" style={{ height: "3px" }}>
                      <div style={{ width: `${Math.min(100, (hours / 10) * 100)}%`, height: "100%", background: c, borderRadius: "999px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      <style jsx global>{`
        @media (max-width: 1024px) {
          .mobile-column-flex {
            display: flex !important;
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
