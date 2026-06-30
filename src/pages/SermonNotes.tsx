import { Box, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip, InputAdornment, MenuItem, CircularProgress, Alert } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckIcon from "@mui/icons-material/Check";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import SermonPresenter from "../components/SermonPresenter";
import { SermonNotesStore, type SermonNote } from "../db";
import { suggestScripture, type ScriptureSuggestion } from "../ai";
import { useTranslation } from "react-i18next";

type NoteLang = "en" | "te" | "mixed";

export default function SermonNotesPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<SermonNote[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SermonNote | null>(null);
  const [presenting, setPresenting] = useState<SermonNote | null>(null);
  const [q, setQ] = useState("");

  const reload = async () => setList((await SermonNotesStore.list()).sort((a, b) => b.date.localeCompare(a.date)));
  useEffect(() => { reload(); }, []);

  const filtered = list.filter((n) =>
    !q || [n.title, n.scripture, n.intro, n.application, ...(n.points ?? []), ...(n.tags ?? [])].some((s) => s?.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, alignItems: { sm: "center" } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>{t("sermonNotes")}</Typography>
        <TextField
          placeholder={t("search")}
          value={q} onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ minWidth: 220 }}
        />
        <GlassyButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpen(true); }}>{t("add")}</GlassyButton>
      </Stack>

      <Stack spacing={1.5}>
        <AnimatePresence>
          {filtered.map((n) => (
            <motion.div key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AnimatedCard sx={{ p: 2 }}>
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{n.title}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>{n.date}{n.scripture ? ` · ${n.scripture}` : ""}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                      {(n.points ?? []).slice(0, 3).map((p, i) => <Chip key={i} label={p.slice(0, 40)} size="small" />)}
                      {(n.tags ?? []).map((tg) => <Chip key={tg} label={tg} size="small" color="primary" variant="outlined" />)}
                      {n.language === "te" && <Chip label="తెలుగు" size="small" sx={{ background: "rgba(236,64,122,0.2)", color: "#ec407a", fontWeight: 600 }} />}
                      {n.language === "mixed" && <Chip label="EN + తెలుగు" size="small" sx={{ background: "rgba(171,71,188,0.2)", color: "#ab47bc", fontWeight: 600 }} />}
                    </Stack>
                  </Box>
                  <IconButton color="primary" onClick={() => setPresenting(n)} aria-label="present"><PlayArrowIcon /></IconButton>
                  <IconButton onClick={() => { setEditing(n); setOpen(true); }} aria-label="edit"><SearchIcon /></IconButton>
                  <IconButton color="error" onClick={async () => { await SermonNotesStore.remove(n.id); reload(); }} aria-label="delete"><DeleteIcon /></IconButton>
                </Stack>
              </AnimatedCard>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <AnimatedCard sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>{t("noItems")}</Typography>
          </AnimatedCard>
        )}
      </Stack>

      <SermonNoteDialog open={open} onClose={() => setOpen(false)} note={editing} onSaved={reload} />
      <SermonPresenter open={!!presenting} note={presenting} onClose={() => setPresenting(null)} />
    </Box>
  );
}

function SermonNoteDialog({ open, onClose, note, onSaved }: { open: boolean; onClose: () => void; note: SermonNote | null; onSaved: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [scripture, setScripture] = useState(""); const [intro, setIntro] = useState("");
  const [points, setPoints] = useState(""); const [illustrations, setIllustrations] = useState("");
  const [application, setApplication] = useState(""); const [closing, setClosing] = useState(""); const [prayer, setPrayer] = useState("");
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState<NoteLang>(note?.language ?? "en");

  // AI scripture suggestion state
  const [suggestions, setSuggestions] = useState<ScriptureSuggestion[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? ""); setDate(note?.date ?? new Date().toISOString().slice(0, 10));
      setScripture(note?.scripture ?? ""); setIntro(note?.intro ?? "");
      setPoints((note?.points ?? []).join("\n")); setIllustrations((note?.illustrations ?? []).join("\n"));
      setApplication(note?.application ?? ""); setClosing(note?.closing ?? ""); setPrayer(note?.prayer ?? "");
      setTags((note?.tags ?? []).join(", "));
      setLanguage(note?.language ?? "en");
      setSuggestions([]);
    }
  }, [open, note]);

  const isTe = language === "te" || language === "mixed";
  const titlePh = isTe ? "ఉదా: కృప ద్వారా రక్షణ  —  Example: Saved by Grace" : "Example: Saved by Grace";
  const scripturePh = isTe ? "ఉదా: ఎఫెసీయులకు 2:8-9  —  Example: Ephesians 2:8-9" : "e.g. Ephesians 2:8-9";
  const introPh = isTe ? "పరిచయం  —  Intro" : "Intro";
  const pointsPh = isTe
    ? "ప్రధాన అంశాలు (ఒక్కోదానికి ఒక వరుస)\n— Main points (one per line)"
    : "Main points (one per line)";
  const illustrationsPh = isTe
    ? "ఉదాహరణలు / కథలు (ఒక్కోదానికి ఒక వరుస)\n— Illustrations (one per line)"
    : "Illustrations (one per line)";
  const applicationPh = isTe ? "ఆచరణాత్మక వర్తింపు  —  Practical application" : "Practical application";
  const closingPh = isTe ? "ముగింపు  —  Closing" : "Closing";
  const prayerPh = isTe ? "ముగింపు ప్రార్థన  —  Closing prayer prompt" : "Closing prayer prompt";
  const tagsPh = isTe ? "ట్యాగ్లు (కామాతో వేరు చేయండి)" : "Tags (comma separated)";

  const suggestFromTitle = async () => {
    if (!title.trim()) return;
    setSuggestBusy(true);
    try { setSuggestions(await suggestScripture(title.trim())); }
    finally { setSuggestBusy(false); }
  };

  const applyScripture = (ref: string) => {
    // If a scripture is already set, append; else replace.
    setScripture((prev) => prev.trim() ? `${prev.trim()}; ${ref}` : ref);
  };

  const save = async () => {
    if (!title.trim()) return;
    await SermonNotesStore.upsert({
      id: note?.id, title: title.trim(), date,
      scripture, intro,
      points: points.split("\n").map((s) => s.trim()).filter(Boolean),
      illustrations: illustrations.split("\n").map((s) => s.trim()).filter(Boolean),
      application, closing, prayer,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      language
    });
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={false}>
      <DialogTitle>{note ? t("edit") : t("add")} · {t("sermonNotes")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} placeholder={titlePh} autoFocus
              inputProps={{ style: isTe ? { fontSize: "1.05rem" } : undefined }} />
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} sx={{ minWidth: 160 }} />
          </Stack>

          {/* AI scripture suggestion */}
          <AnimatedCard sx={{ p: 2, background: "linear-gradient(135deg, rgba(255,183,77,0.12), rgba(171,71,188,0.12))" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" sx={{ color: "#ffb74d", letterSpacing: 2 }}>AI · Scripture suggestion</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  Reads your sermon title and proposes connected Bible references. Tap one to add it to scripture.
                </Typography>
              </Box>
              <GlassyButton
                variant="contained" startIcon={suggestBusy ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                onClick={suggestFromTitle} disabled={!title.trim() || suggestBusy}
              >
                {suggestBusy ? t("loading") : "Suggest scripture"}
              </GlassyButton>
            </Stack>
            {suggestions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Stack spacing={1}>
                  {suggestions.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <Box
                        onClick={() => applyScripture(s.reference)}
                        sx={{
                          p: 1.5, borderRadius: 2, cursor: "pointer",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "flex", alignItems: "center", gap: 1.5,
                          "&:hover": { background: "rgba(255,183,77,0.12)", borderColor: "rgba(255,183,77,0.4)" }
                        }}
                      >
                        <Chip label={s.reference} size="small" sx={{ background: "rgba(255,183,77,0.2)", color: "#ffb74d", fontWeight: 700 }} />
                        <Typography variant="body2" sx={{ flex: 1, opacity: 0.9 }}>{s.why}</Typography>
                        <CheckIcon sx={{ opacity: 0.5 }} fontSize="small" />
                      </Box>
                    </motion.div>
                  ))}
                </Stack>
              </Box>
            )}
          </AnimatedCard>

          <TextField label="Scripture reference" value={scripture} onChange={(e) => setScripture(e.target.value)} placeholder={scripturePh} />
          <Stack direction="row" spacing={2}>
            <TextField select label="Note language" value={language} onChange={(e) => setLanguage(e.target.value as NoteLang)} sx={{ minWidth: 220 }}>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="te">తెలుగు (Telugu)</MenuItem>
              <MenuItem value="mixed">EN + తెలుగు (Mixed)</MenuItem>
            </TextField>
            <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
              <Alert severity="info" sx={{ width: "100%" }}>
                Paste Telugu text directly — full UTF-8 is preserved when saving and displaying.
              </Alert>
            </Box>
          </Stack>
          <TextField label="Intro" multiline rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder={introPh} />
          <TextField label="Points (one per line)" multiline rows={5} value={points} onChange={(e) => setPoints(e.target.value)} placeholder={pointsPh} />
          <TextField label="Illustrations (one per line, aligns with points)" multiline rows={4} value={illustrations} onChange={(e) => setIllustrations(e.target.value)} placeholder={illustrationsPh} />
          <TextField label="Application" multiline rows={2} value={application} onChange={(e) => setApplication(e.target.value)} placeholder={applicationPh} />
          <TextField label="Closing" multiline rows={2} value={closing} onChange={(e) => setClosing(e.target.value)} placeholder={closingPh} />
          <TextField label="Closing prayer prompt" multiline rows={2} value={prayer} onChange={(e) => setPrayer(e.target.value)} placeholder={prayerPh} />
          <TextField label="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={tagsPh} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Box sx={{ flex: 1 }} />
        <GlassyButton onClick={onClose}>{t("cancel")}</GlassyButton>
        <GlassyButton variant="contained" onClick={save} disabled={!title.trim()}>{t("save")}</GlassyButton>
      </DialogActions>
    </Dialog>
  );
}
