import { Box, Stack, TextField, Typography, MenuItem, Chip, ToggleButton, ToggleButtonGroup, Card, CardContent, Divider, Tooltip, IconButton, Snackbar } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { sermonOutline, parseOutline, type OutlineVariant, type MinutesPreset, type OutlineLanguage } from "../ai";
import { SermonNotesStore, getProfile } from "../db";
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
  const [language, setLanguage] = useState<OutlineLanguage>("en");
  const [rawEn, setRawEn] = useState("");
  const [rawTe, setRawTe] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const minutesNum = minutes === "" ? undefined : (minutes as MinutesPreset);

  const generate = async () => {
    if (!topic.trim()) return;
    setBusy(true); setRawEn(""); setRawTe(""); setSavedNoteId(null);
    try {
      if (language === "te") {
        setRawTe(await sermonOutline(topic.trim(), scripture.trim() || undefined, variant, minutesNum, "te"));
        setRawEn("");
      } else if (language === "mixed") {
        // Generate English + Telugu in parallel for the side-by-side view.
        const [en, te] = await Promise.all([
          sermonOutline(topic.trim(), scripture.trim() || undefined, variant, minutesNum, "en"),
          sermonOutline(topic.trim(), scripture.trim() || undefined, variant, minutesNum, "te")
        ]);
        setRawEn(en); setRawTe(te);
      } else {
        setRawEn(await sermonOutline(topic.trim(), scripture.trim() || undefined, variant, minutesNum, "en"));
        setRawTe("");
      }
    } finally { setBusy(false); }
  };

  const saveAsNote = async () => {
    const content = rawEn || rawTe;
    if (!content) return;
    const profile = await getProfile();
    const minutesTag = minutes ? `${minutes}min` : "";
    const note = await SermonNotesStore.upsert({
      title: `Outline: ${topic}${scripture ? ` (${scripture})` : ""}${minutesTag ? ` · ${minutesTag}` : ""}`,
      date: new Date().toISOString().slice(0, 10),
      scripture,
      intro: (rawEn || rawTe).split("\n").slice(0, 3).join("\n"),
      points: (rawEn || rawTe).split("\n").filter((l) => /^\*\*\d\./.test(l) || /^\d\./.test(l)),
      tags: ["ai-outline", topic.toLowerCase(), variant, language]
    });
    setSavedNoteId(note.id);
    setSnack("Saved to Sermon Notes");
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setSnack("Copied to clipboard"); } catch { setSnack("Copy failed"); }
  };

  const hasOutput = !!rawEn || !!rawTe;
  const showTE = language === "te" ? !!rawTe : (language === "mixed" ? !!rawEn && !!rawTe : false);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{t("sermonAssistant")}</Typography>
      <Typography variant="body2" sx={{ opacity: 0.65, mb: 3 }}>
        Pick a length, set minutes, anchor in scripture. JOHN AI returns a structured outline you can present or save.
      </Typography>

      {/* Controls */}
      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2.5}>
          <TextField select label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} helperText="Or type your own below">
            {TOPICS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField label="Or type your own topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <TextField label="Anchor scripture (optional)" value={scripture} onChange={(e) => setScripture(e.target.value)} placeholder="e.g. Romans 8:28" />

          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1.5, fontSize: "0.6875rem" }}>Length</Typography>
            <ToggleButtonGroup exclusive value={variant} onChange={(_, v) => v && setVariant(v)} size="small" sx={{ mt: 0.5, "& .MuiToggleButton-root": { px: 2.5, py: 0.75, fontWeight: 600 } }}>
              <ToggleButton value="short">Short</ToggleButton>
              <ToggleButton value="medium">Medium</ToggleButton>
              <ToggleButton value="long">Long</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.55 }}>{VARIANT_HINT[variant]}</Typography>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1.5, fontSize: "0.6875rem" }}>Target length (minutes, optional)</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <ToggleButtonGroup exclusive value={minutes === "" ? "auto" : "preset"} onChange={(_, v) => v === "preset" ? setMinutes(30) : setMinutes("")} size="small" sx={{ "& .MuiToggleButton-root": { px: 2, py: 0.6, fontWeight: 600 } }}>
                <ToggleButton value="auto">Auto</ToggleButton>
                <ToggleButton value="preset">By minutes</ToggleButton>
              </ToggleButtonGroup>
              {minutes !== "" && (
                <TextField select size="small" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) as MinutesPreset)} sx={{ minWidth: 100 }}>
                  {[5, 10, 15, 30, 45, 60].map((m) => <MenuItem key={m} value={m}>{m} min</MenuItem>)}
                </TextField>
              )}
              {minutes !== "" && (
                <Typography variant="caption" sx={{ opacity: 0.55 }}>
                  ≈ {Math.round(minutes * 130)} spoken words · {Math.round(minutes * 1.2)} points
                </Typography>
              )}
            </Stack>
          </Box>

          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1.5, fontSize: "0.6875rem" }}>Language</Typography>
            <ToggleButtonGroup exclusive value={language} onChange={(_, v) => v && setLanguage(v)} size="small" sx={{ mt: 0.5, "& .MuiToggleButton-root": { px: 2.5, py: 0.75, fontWeight: 600 } }}>
              <ToggleButton value="en">English</ToggleButton>
              <ToggleButton value="te">తెలుగు</ToggleButton>
              <ToggleButton value="mixed">EN + తెలుగు</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <GlassyButton variant="contained" startIcon={<AutoAwesomeIcon />} onClick={generate} disabled={!topic.trim() || busy}>
              {busy ? t("loading") : "Generate outline"}
            </GlassyButton>
            <Tooltip title="Re-roll with fresh seed">
              <span><IconButton onClick={generate} disabled={!topic.trim() || busy} aria-label="reroll"><RefreshIcon /></IconButton></span>
            </Tooltip>
          </Stack>
        </Stack>
      </AnimatedCard>

      {/* Empty state */}
      {!hasOutput && !busy && (
        <AnimatedCard sx={{ p: 6, textAlign: "center", opacity: 0.85 }}>
          <AutoAwesomeIcon sx={{ fontSize: 56, opacity: 0.35, mb: 1.5 }} />
          <Typography variant="body1" sx={{ opacity: 0.75, mb: 0.5 }}>Your outline appears here</Typography>
          <Typography variant="caption" sx={{ opacity: 0.55 }}>
            Pick a topic, length, and language above — JOHN AI drafts a structured outline you can present or save.
          </Typography>
        </AnimatedCard>
      )}

      {/* Loading */}
      {busy && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>JOHN AI is drafting your outline…</Typography>
        </Box>
      )}

      {/* Output: side-by-side EN + TE when language='mixed' AND both rawEn and rawTe present */}
      {showTE && rawEn && rawTe ? (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <OutlineColumn
              label="English" labelColor="#ffb74d"
              raw={rawEn}
              onCopy={() => copy(rawEn)}
              onSave={saveAsNote}
              savedNoteId={savedNoteId}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <OutlineColumn
              label="తెలుగు" labelColor="#ec407a"
              raw={rawTe}
              onCopy={() => copy(rawTe)}
              onSave={saveAsNote}
              savedNoteId={savedNoteId}
            />
          </Box>
        </Stack>
      ) : (
        rawEn && <OutlineColumn raw={rawEn} label="English" labelColor="#ffb74d" onCopy={() => copy(rawEn)} onSave={saveAsNote} savedNoteId={savedNoteId} />
      )}
      {!showTE && rawTe && <OutlineColumn raw={rawTe} label="తెలుగు" labelColor="#ec407a" onCopy={() => copy(rawTe)} onSave={saveAsNote} savedNoteId={savedNoteId} />}

      <Snackbar
        open={!!snack}
        autoHideDuration={2200}
        onClose={() => setSnack(null)}
        message={snack ?? ""}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

function OutlineColumn({ raw, label, labelColor, onCopy, onSave, savedNoteId }: {
  raw: string;
  label: string;
  labelColor: string;
  onCopy: () => void;
  onSave: () => void;
  savedNoteId: string | null;
}) {
  const data = useMemo(() => parseOutline(raw), [raw]);
  const hasStructure = data.points.length > 0 || !!data.bigIdea || !!data.application || !!data.closingPrayer;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Card sx={{ p: 0, mb: 2, display: "flex", flexDirection: "column", height: "100%" }}>
        <Stack direction="row" alignItems="center" sx={{ p: 2, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Typography variant="overline" sx={{ color: labelColor, letterSpacing: 2, fontWeight: 700, flex: 1 }}>{label}</Typography>
          <Tooltip title="Copy to clipboard"><IconButton size="small" onClick={onCopy} aria-label="copy"><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
          {savedNoteId ? (
            <Chip label="Saved" size="small" color="success" sx={{ ml: 1 }} />
          ) : (
            <Tooltip title="Save as Sermon Note"><span><IconButton size="small" onClick={onSave} aria-label="save"><OpenInNewIcon fontSize="small" /></IconButton></span></Tooltip>
          )}
        </Stack>

        <CardContent sx={{ pt: 2, pb: 2, flex: 1 }}>
          {!hasStructure ? (
            <Box sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7, "& strong": { color: labelColor }, "& em": { color: labelColor, fontStyle: "normal" } }}
              dangerouslySetInnerHTML={{ __html: raw.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          ) : (
            <Stack spacing={2}>
              {data.bigIdea && (
                <Box sx={{ p: 2, borderRadius: 2, background: `linear-gradient(135deg, ${alpha(labelColor, 0.14)}, transparent)` }}>
                  <Typography variant="overline" sx={{ color: labelColor, letterSpacing: 2, fontWeight: 700 }}>Big Idea</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, fontStyle: "italic", mt: 0.5 }}>{data.bigIdea}</Typography>
                </Box>
              )}
              {data.points.map((p, i) => (
                <Box key={i} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(labelColor, 0.18)}`, background: alpha(labelColor, 0.04) }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Chip label={`Point ${i + 1}`} size="small" sx={{ background: alpha(labelColor, 0.2), color: labelColor, fontWeight: 700 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>{p.title}</Typography>
                    {p.scripture && <Chip label={p.scripture} size="small" variant="outlined" />}
                  </Stack>
                  {p.content && <Typography variant="body2" sx={{ color: "text.primary", mt: 1, lineHeight: 1.6 }}>{p.content}</Typography>}
                  {p.illustration && (
                    <Box sx={{ mt: 1.25, p: 1.25, borderRadius: 1.5, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                      <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 1.5, fontSize: "0.6875rem" }}>Illustration</Typography>
                      <Typography variant="body2" sx={{ fontStyle: "italic", opacity: 0.9, mt: 0.25, lineHeight: 1.5 }}>{p.illustration}</Typography>
                    </Box>
                  )}
                </Box>
              ))}
              {data.application && (
                <Box sx={{ p: 2, borderRadius: 2, background: "rgba(102,187,106,0.06)", border: "1px solid rgba(102,187,106,0.2)" }}>
                  <Typography variant="overline" sx={{ color: "success.main", letterSpacing: 2, fontWeight: 700 }}>Application</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6 }}>{data.application}</Typography>
                </Box>
              )}
              {data.closingPrayer && (
                <Box sx={{ p: 2, borderRadius: 2, background: "rgba(236,64,122,0.06)", border: "1px solid rgba(236,64,122,0.2)" }}>
                  <Typography variant="overline" sx={{ color: "secondary.main", letterSpacing: 2, fontWeight: 700 }}>Closing Prayer</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic", lineHeight: 1.6 }}>{data.closingPrayer}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
