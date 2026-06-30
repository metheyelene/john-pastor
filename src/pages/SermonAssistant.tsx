import { Box, Stack, TextField, Typography, MenuItem, Chip } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useState } from "react";
import { motion } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { sermonOutline } from "../ai";
import { SermonNotesStore } from "../db";
import { useTranslation } from "react-i18next";

const TOPICS = [
  "Grace", "Faith", "Hope", "Love", "Forgiveness", "Prayer", "Worship",
  "Holy Spirit", "Suffering", "Stewardship", "Marriage", "Parenting",
  "Leadership", "Evangelism", "Thanksgiving", "Repentance"
];

export default function SermonAssistantPage() {
  const { t } = useTranslation();
  const [topic, setTopic] = useState("");
  const [scripture, setScripture] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  const generate = async () => {
    if (!topic.trim()) return;
    setBusy(true); setOut(""); setSavedNoteId(null);
    try { setOut(await sermonOutline(topic.trim(), scripture.trim() || undefined)); }
    finally { setBusy(false); }
  };

  const saveAsNote = async () => {
    if (!out) return;
    const note = await SermonNotesStore.upsert({
      title: `Outline: ${topic}${scripture ? ` (${scripture})` : ""}`,
      date: new Date().toISOString().slice(0, 10),
      scripture,
      intro: out.split("\n").slice(0, 3).join("\n"),
      points: out.split("\n").filter((l) => /^\*\*\d\./.test(l) || /^\d\./.test(l)),
      tags: ["ai-outline", topic.toLowerCase()]
    });
    setSavedNoteId(note.id);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>{t("sermonAssistant")}</Typography>

      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            select label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}
            helperText="Or type your own below"
          >
            {TOPICS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField label="Or type your own topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <TextField label="Anchor scripture (optional)" value={scripture} onChange={(e) => setScripture(e.target.value)} placeholder="e.g. Romans 8:28" />
          <GlassyButton
            variant="contained" startIcon={<AutoAwesomeIcon />}
            onClick={generate} disabled={!topic.trim() || busy}
          >
            {busy ? t("loading") : "Generate outline"}
          </GlassyButton>
        </Stack>
      </AnimatedCard>

      {out && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <AnimatedCard sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>Outline</Typography>
              {savedNoteId ? <Chip label="Saved to Sermon Notes" color="success" /> : (
                <GlassyButton size="small" variant="contained" onClick={saveAsNote}>Save as note</GlassyButton>
              )}
            </Stack>
            <Box sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7, "& strong": { color: "#ffb74d" } }}
              dangerouslySetInnerHTML={{ __html: out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          </AnimatedCard>
        </motion.div>
      )}
    </Box>
  );
}
