import { Box, Stack, TextField, Typography, IconButton, CircularProgress, Chip, Tooltip } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { chat, hashStringSeed } from "../ai";
import { getProfile } from "../db";
import { useTranslation } from "react-i18next";

interface ChatTurn { role: "user" | "assistant"; content: string; ts: number }

const SYSTEM_PROMPT = `You are JOHN AI, a thoughtful, warm pastoral assistant. You help pastors with:
- Outlining and refining sermons (use clear structure: big idea → main points → illustrations → application → closing prayer)
- Counseling approach for common situations (grief, doubt, marriage, parenting, anxiety, addiction)
- Church administration ideas (small groups, outreach, volunteer coordination, budgeting)
- Devotional reflections and Bible study cross-references
- Prayer prompts and liturgies

Always be brief, warm, and practically applicable. Use clear paragraphs. When relevant, include a concrete next step the pastor can take this week. Avoid denominational language that assumes a specific tradition. If you're uncertain, say so honestly rather than inventing.`;

// In-memory chat history per session (persisted to localStorage so it survives reloads)
const STORAGE_KEY = "john:aichat-history";
function loadHistory(): ChatTurn[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return [];
}
function saveHistory(turns: ChatTurn[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-50))); } catch { /* ignore */ }
}

const QUICK_PROMPTS = [
  "Outline a sermon on finding peace in anxiety",
  "Counseling approach for someone grieving",
  "5 ideas to involve young adults in service",
  "Prayers for a hospital visit",
  "How to start a small group in our church"
];

export default function AIChatPage() {
  const { t } = useTranslation();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pastorName, setPastorName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTurns(loadHistory()); }, []);
  useEffect(() => { saveHistory(turns); }, [turns]);
  useEffect(() => {
    getProfile().then((p) => setPastorName(p?.pastorName ?? ""));
    if (turns.length === 0) {
      // Seed with a warm welcome so the page never looks empty.
      setTurns([{
        role: "assistant",
        content: pastorName
          ? `Shalom, Pastor ${pastorName}. I'm JOHN AI — your pastoral thought partner. Ask me anything: sermon outlines, counseling approach, outreach ideas, prayers, or just talk it through.`
          : "Shalom, Pastor. I'm JOHN AI — your pastoral thought partner. Ask me anything: sermon outlines, counseling approach, outreach ideas, prayers, or just talk it through.",
        ts: Date.now()
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastorName]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;
    const userTurn: ChatTurn = { role: "user", content: text, ts: Date.now() };
    const next: ChatTurn[] = [...turns, userTurn];
    setTurns(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await chat({
        messages: [
          { role: "system", content: SYSTEM_PROMPT + (pastorName ? `\n\nThe pastor's name is ${pastorName}.` : "") },
          ...next.slice(-10).filter((t) => t.role === "user" || t.role === "assistant")
            .map((t) => ({ role: t.role, content: t.content }))
        ],
        temperature: 0.75,
        maxTokens: 700,
        seed: hashStringSeed(text + Date.now().toString().slice(0, -3))
      });
      setTurns((cur) => [...cur, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch (e: any) {
      setTurns((cur) => [...cur, { role: "assistant", content: `Sorry — I hit a snag: ${e?.message ?? "unknown error"}. Try again or check Settings → AI.`, ts: Date.now() }]);
    } finally { setBusy(false); }
  };

  const clearChat = () => {
    setTurns([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2, gap: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2.5,
          display: "grid", placeItems: "center",
          background: "linear-gradient(135deg, #dc2626, #ef4444)",
          boxShadow: "0 8px 24px rgba(239,68,68,0.35)"
        }}>
          <AutoAwesomeIcon sx={{ fontSize: 24 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>Ask JOHN AI</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Free, private, runs on your device's AI (Pollinations → Groq → offline stub)
          </Typography>
        </Box>
        <Tooltip title="Clear conversation">
          <IconButton onClick={clearChat} aria-label="clear chat"><DeleteOutlineIcon /></IconButton>
        </Tooltip>
      </Stack>

      <AnimatedCard sx={{ p: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto", p: { xs: 2, md: 3 } }}>
          <AnimatePresence initial={false}>
            {turns.map((t, i) => (
              <motion.div
                key={`${t.ts}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                style={{ display: "flex", justifyContent: t.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}
              >
                <Box sx={{
                  maxWidth: "82%",
                  px: 2, py: 1.5,
                  borderRadius: t.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: t.role === "user"
                    ? "linear-gradient(135deg, #dc2626, #ef4444)"
                    : "rgba(255,255,255,0.06)",
                  border: t.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                  color: t.role === "user" ? "#fff" : "text.primary",
                  boxShadow: t.role === "user" ? "0 6px 16px rgba(239,68,68,0.3)" : "none"
                }}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                    {t.content}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
          {busy && (
            <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1.5 }}>
              <Box sx={{
                px: 2, py: 1.5, borderRadius: "16px 16px 16px 4px",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                display: "inline-flex", alignItems: "center", gap: 1.5
              }}>
                <CircularProgress size={14} />
                <Typography variant="caption" sx={{ opacity: 0.7 }}>JOHN AI is thinking…</Typography>
              </Box>
            </Box>
          )}
        </Box>

        {turns.length <= 1 && (
          <Box sx={{ px: 2, pb: 1.5, borderTop: "1px solid rgba(255,255,255,0.04)", pt: 1.5 }}>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1.5, fontSize: "0.6875rem" }}>
              Try one of these
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              {QUICK_PROMPTS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  size="small"
                  onClick={() => send(p)}
                  sx={{ cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{
          p: 1.5, borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
          display: "flex", alignItems: "flex-end", gap: 1
        }}>
          <TextField
            fullWidth
            multiline
            maxRows={5}
            placeholder="Ask anything: sermon ideas, counseling approach, outreach, prayers…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !busy) { e.preventDefault(); send(); }
            }}
            disabled={busy}
          />
          <Tooltip title="Send">
            <span>
              <IconButton
                onClick={() => send()}
                disabled={!input.trim() || busy}
                sx={{
                  width: 48, height: 48, borderRadius: 2,
                  background: "linear-gradient(135deg, #dc2626, #ef4444)",
                  color: "#fff",
                  "&:hover": { background: "linear-gradient(135deg, #ef4444, #f87171)" },
                  "&.Mui-disabled": { opacity: 0.4 }
                }}
                aria-label="send"
              >
                {busy ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : <SendIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </AnimatedCard>
    </Box>
  );
}
