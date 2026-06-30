import { Box, Stack, TextField, Typography, MenuItem, Chip, ToggleButton, ToggleButtonGroup } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useState } from "react";
import { motion } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { sermonOutline, type OutlineVariant, type MinutesPreset } from "../ai";
import { SermonNotesStore } from "../db";
import { useTranslation } from "react-i18next";

const TOPICS = [
  "Grace", "Faith", "Hope", "Love", "Forgiveness", "Prayer", "Worship",
  "Holy Spirit", "Suffering", "Stewardship", "Marriage", "Parenting",
  "Leadership", "Evangelism", "Thanksgiving", "Repentance"
];

const VARIANT_HINT: Record<OutlineVariant, string> = {
  short: "≈280 words · quick sketch",
  medium: "≈700 words · balanced",
  long: "≈1500 words · deep study"
};

export default function SermonAssistantPage() {
  const { t } = useTranslation();
  const [topic, setTopic] = useState("");
  const [scripture, setScripture] = useState("");
  const [variant, setVariant] = useState<OutlineVariant>("medium");
  const [minutes, setMinutes] = useState<MinutesPreset | "">("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  const generate = async () => {
    if (!topic.trim()) return;
    setBusy(true); setOut(""); setSavedNoteId(null);
    try {
      const minutesNum = minutes === "" ? undefined : (minutes as MinutesPreset);
      setOut(await sermonOutline(topic.trim(), scripture.trim() || undefined, variant, minutesNum));
    } finally { setBusy(false); }
  };

  const saveAsNote = async () => {
    if (!out) return;
    const minutesTag = minutes ? `${minutes}min` : "";
    const note = await SermonNotesStore.upsert({
      title: `Outline: ${topic}${scripture ? ` (${scripture})` : ""}${minutesTag ? ` · ${minutesTag}` : ""}`,
      date: new Date().toISOString().slice(0, 10),
      scripture,
      intro: out.split("\n").slice(0, 3).join("\n"),
      points: out.split("\n").filter((l) => /^\*\*\d\./.test(l) || /^\d\./.test(l)),
      tags: ["ai-outline", topic.toLowerCase(), variant]
    });
    setSavedNoteId(note.id);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{t("sermonAssistant")}</Typography>
      <Typography variant="body2" sx={{ opacity: 0.65, mb: 3 }}>
        Pick a length that matches your service, set a minutes target, anchor in scripture, and let JOHN AI draft a starter outline.
      </Typography>

      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2.5}>
          <TextField
            select label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}
            helperText="Or type your own below"
          >
            {TOPICS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField label="Or type your own topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <TextField label="Anchor scripture (optional)" value={scripture} onChange={(e) => setScripture(e.target.value)} placeholder="e.g. Romans 8:28" />

          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1.5, fontSize: "0.6875rem" }}>
              Length
            </Typography>
            <ToggleButtonGroup
              exclusive value={variant}
              onChange={(_, v) => v && setVariant(v)}
              size="small"
              sx={{ mt: 0.5, "& .MuiToggleButton-root": { px: 2.5, py: 0.75, fontWeight: 600 } }}
            >
              <ToggleButton value="short">Short</ToggleButton>
              <ToggleButton value="medium">Medium</ToggleButton>
              <ToggleButton value="long">Long</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.55 }}>
              {VARIANT_HINT[variant]}
            </Typography>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1.5, fontSize: "0.6875rem" }}>
              Target length (minutes, optional)
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <ToggleButtonGroup
                exclusive value={minutes === "" ? "auto" : "preset"}
                onChange={(_, v) => v === "preset" ? setMinutes(30) : setMinutes("")}
                size="small"
                sx={{ "& .MuiToggleButton-root": { px: 2, py: 0.6, fontWeight: 600 } }}
              >
                <ToggleButton value="auto">Auto</ToggleButton>
                <ToggleButton value="preset">By minutes</ToggleButton>
              </ToggleButtonGroup>
              {minutes !== "" && (
                <TextField
                  select size="small" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) as MinutesPreset)}
                  sx={{ minWidth: 100 }}
                >
                  {[5, 10, 15, 30, 45, 60].map((m) => (
                    <MenuItem key={m} value={m}>{m} min</MenuItem>
                  ))}
                </TextField>
              )}
              {minutes !== "" && (
                <Typography variant="caption" sx={{ opacity: 0.55 }}>
                  ≈ {Math.round(minutes * 130)} spoken words · {Math.round(minutes * 1.2)} points
                </Typography>
              )}
            </Stack>
          </Box>

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
            <Stack direction="row" alignItems="center" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                Outline
              </Typography>
              <Chip size="small" label={variant} sx={{ textTransform: "capitalize" }} />
              {minutes !== "" && <Chip size="small" label={`${minutes} min`} color="primary" variant="outlined" />}
              {savedNoteId ? (
                <Chip label="Saved to Sermon Notes" color="success" />
              ) : (
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
