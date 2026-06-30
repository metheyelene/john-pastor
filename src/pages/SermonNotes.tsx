import { Box, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip, InputAdornment, MenuItem, CircularProgress, Alert, Divider, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckIcon from "@mui/icons-material/Check";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import { SermonNotesStore, getProfile, type SermonNote } from "../db";
import { suggestScripture, type ScriptureSuggestion } from "../ai";
import { downloadSermonAsPptx } from "../lib/pptx";
import SermonPresenter from "../components/SermonPresenter";
import { useTranslation } from "react-i18next";

type NoteLang = "en" | "te" | "mixed";

export default function SermonNotesPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<SermonNote[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SermonNote | null>(null);
  const [presenting, setPresenting] = useState<SermonNote | null>(null);
  const [q, setQ] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);

  const reload = async () => setList((await SermonNotesStore.list()).sort((a, b) => b.date.localeCompare(a.date)));
  useEffect(() => { reload(); }, []);

  const filtered = list.filter((n) =>
    !q || [n.title, n.scripture, n.intro, n.application, ...(n.points ?? []), ...(n.tags ?? [])].some((s) => s?.toLowerCase().includes(q.toLowerCase()))
  );

  const handleExport = async (n: SermonNote) => {
    setExporting(n.id);
    try {
      const profile = await getProfile();
      await downloadSermonAsPptx(n, profile);
    } finally { setExporting(null); }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, alignItems: { sm: "center" } }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{t("sermonNotes")}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.65 }}>
            {filtered.length} {filtered.length === 1 ? "note" : "notes"}
          </Typography>
        </Box>
        <TextField
          placeholder={t("search")}
          value={q} onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ minWidth: 220 }}
          size="small"
        />
        <GlassyButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpen(true); }}>{t("add")}</GlassyButton>
      </Stack>

      {filtered.length === 0 ? (
        <Box sx={{ py: 8, textAlign: "center", opacity: 0.65 }}>
          <Typography variant="body2">{q ? "No notes match your search." : t("noItems")}</Typography>
        </Box>
      ) : (
        <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <AnimatePresence>
            {filtered.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    py: 1.75,
                    px: { xs: 1, md: 2 },
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    cursor: "default",
                    transition: "background 0.15s ease",
                    "&:hover": { background: "rgba(255,255,255,0.03)" }
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 600, fontSize: "1.05rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {n.title}
                      </Typography>
                      {n.language === "te" && (
                        <Chip label="తెలుగు" size="small" sx={{ height: 20, fontSize: 11, background: "rgba(236,64,122,0.2)", color: "#ec407a", fontWeight: 600 }} />
                      )}
                      {n.language === "mixed" && (
                        <Chip label="EN+TE" size="small" sx={{ height: 20, fontSize: 11, background: "rgba(171,71,188,0.2)", color: "#ab47bc", fontWeight: 600 }} />
                      )}
                    </Stack>
                    <Typography variant="caption" sx={{ opacity: 0.55, display: "block", mb: 0.5 }}>
                      {n.date}{n.scripture ? `  ·  ${n.scripture}` : ""}
                    </Typography>
                    {(n.points ?? []).length > 0 && (
                      <Typography variant="body2" sx={{ opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.9rem" }}>
                        {(n.points ?? []).slice(0, 2).map((p) => `• ${p}`).join("   ")}
                        {(n.points ?? []).length > 2 ? `   …+${(n.points ?? []).length - 2}` : ""}
                      </Typography>
                    )}
                    {(n.tags ?? []).length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: "wrap", gap: 0.5 }}>
                        {(n.tags ?? []).slice(0, 3).map((t) => (
                          <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                        ))}
                      </Stack>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, opacity: 0.7, "&:hover": { opacity: 1 } }}>
                    <Tooltip title="Present">
                      <IconButton size="small" color="primary" onClick={() => setPresenting(n)} aria-label="present">
                        <PlayArrowIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export to PowerPoint">
                      <span>
                        <IconButton size="small" onClick={() => handleExport(n)} disabled={exporting === n.id} aria-label="export-pptx">
                          {exporting === n.id ? <CircularProgress size={16} /> : <PictureAsPdfIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={t("edit")}>
                      <IconButton size="small" onClick={() => { setEditing(n); setOpen(true); }} aria-label="edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("delete")}>
                      <IconButton size="small" color="error" onClick={async () => { await SermonNotesStore.remove(n.id); reload(); }} aria-label="delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      )}

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

  // PowerPoint export from inside the dialog
  const [exporting, setExporting] = useState(false);

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

  const suggestFromTitle = async () => {
    if (!title.trim()) return;
    setSuggestBusy(true);
    try { setSuggestions(await suggestScripture(title.trim(), language)); }
    finally { setSuggestBusy(false); }
  };

  const applyScripture = (ref: string) => {
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

  const exportDraft = async () => {
    if (!title.trim()) return;
    setExporting(true);
    try {
      const profile = await getProfile();
      const draft: SermonNote = {
        id: note?.id ?? "draft",
        title: title.trim(), date,
        scripture, intro,
        points: points.split("\n").map((s) => s.trim()).filter(Boolean),
        illustrations: illustrations.split("\n").map((s) => s.trim()).filter(Boolean),
        application, closing, prayer,
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        language,
        createdAt: note?.createdAt ?? Date.now(),
        updatedAt: Date.now()
      };
      await downloadSermonAsPptx(draft, profile);
    } finally { setExporting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={false}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <span>{note ? t("edit") : t("add")} · {t("sermonNotes")}</span>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Export current contents to PowerPoint (saves without creating a note)">
          <span>
            <IconButton onClick={exportDraft} disabled={!title.trim() || exporting} aria-label="export-pptx-from-dialog">
              {exporting ? <CircularProgress size={18} /> : <PictureAsPdfIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              inputProps={{ style: isTe ? { fontSize: "1.05rem" } : undefined }} />
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} sx={{ minWidth: 160 }} />
          </Stack>

          {/* AI scripture suggestion */}
          <Box sx={{
            p: 2, borderRadius: 2,
            background: "linear-gradient(135deg, rgba(255,183,77,0.12), rgba(171,71,188,0.12))",
            border: "1px solid rgba(255,183,77,0.15)"
          }}>
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
          </Box>

          <TextField label="Scripture reference" value={scripture} onChange={(e) => setScripture(e.target.value)} />
          <Stack direction="row" spacing={2}>
            <TextField select label="Note language" value={language} onChange={(e) => setLanguage(e.target.value as NoteLang)} sx={{ minWidth: 220 }}>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="te">తెలుగు (Telugu)</MenuItem>
              <MenuItem value="mixed">EN + తెలుగు (Mixed)</MenuItem>
            </TextField>
            <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
              <Alert severity="info" sx={{ width: "100%", py: 0 }}>
                Paste Telugu text directly — full UTF-8 is preserved.
              </Alert>
            </Box>
          </Stack>
          <TextField label="Intro" multiline rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} />
          <TextField label="Points (one per line)" multiline rows={5} value={points} onChange={(e) => setPoints(e.target.value)} />
          <TextField label="Illustrations (one per line, aligns with points)" multiline rows={4} value={illustrations} onChange={(e) => setIllustrations(e.target.value)} />
          <TextField label="Application" multiline rows={2} value={application} onChange={(e) => setApplication(e.target.value)} />
          <TextField label="Closing" multiline rows={2} value={closing} onChange={(e) => setClosing(e.target.value)} />
          <TextField label="Closing prayer prompt" multiline rows={2} value={prayer} onChange={(e) => setPrayer(e.target.value)} />
          <TextField label="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
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
