import { Box, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Checkbox, FormControlLabel } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
// Confetti is inlined below (no extra dependency).
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { PrayerList, type Prayer } from "../db";
import { useTranslation } from "react-i18next";

// Inline tiny confetti (so we don't pull a dependency just for one screen).
function ConfettiBurst({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<{ x: number; y: number; r: number; c: string; v: number }[]>([]);
  useEffect(() => {
    if (!trigger) return;
    const colors = ["#ffb74d", "#ec407a", "#66bb6a", "#42a5f5", "#ab47bc"];
    const arr = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20,
      r: Math.random() * 360,
      c: colors[Math.floor(Math.random() * colors.length)],
      v: 2 + Math.random() * 3
    }));
    setPieces(arr);
    const t = setTimeout(() => setPieces([]), 1800);
    return () => clearTimeout(t);
  }, [trigger]);
  return (
    <Box sx={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2000 }}>
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: p.x, y: p.y, rotate: 0 }}
          animate={{ y: window.innerHeight + 40, rotate: p.r }}
          transition={{ duration: p.v, ease: "easeIn" }}
          style={{ position: "absolute", width: 10, height: 14, background: p.c, borderRadius: 2 }}
        />
      ))}
    </Box>
  );
}

export default function PrayerPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<Prayer[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Prayer | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  const reload = async () => setList((await PrayerList.list()).sort((a, b) => Number(a.answered) - Number(b.answered) || b.createdAt - a.createdAt));
  useEffect(() => { reload(); }, []);

  const toggle = async (p: Prayer) => {
    const next = await PrayerList.toggleAnswered(p.id);
    if (next?.answered) setConfettiKey((k) => k + 1);
    reload();
  };

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 3, alignItems: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>{t("prayer")}</Typography>
        <GlassyButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpen(true); }}>{t("add")}</GlassyButton>
      </Stack>

      <Stack spacing={1.5}>
        <AnimatePresence>
          {list.map((p) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AnimatedCard sx={{ p: 2, opacity: p.answered ? 0.65 : 1 }}>
                <Stack direction="row" alignItems="flex-start" spacing={2}>
                  <FormControlLabel
                    control={<Checkbox checked={p.answered} onChange={() => toggle(p)} icon={<FavoriteIcon />} checkedIcon={<FavoriteIcon sx={{ color: "#ec407a" }} />} />}
                    label=""
                    sx={{ m: 0 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, textDecoration: p.answered ? "line-through" : "none" }}>{p.request}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                      {p.requester && <Chip label={p.requester} size="small" />}
                      {p.category && <Chip label={p.category} size="small" variant="outlined" />}
                      <Chip label={new Date(p.createdAt).toLocaleDateString()} size="small" variant="outlined" />
                    </Stack>
                  </Box>
                  <GlassyButton size="small" onClick={() => { setEditing(p); setOpen(true); }}>{t("edit")}</GlassyButton>
                </Stack>
              </AnimatedCard>
            </motion.div>
          ))}
        </AnimatePresence>
        {list.length === 0 && (
          <AnimatedCard sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>{t("noItems")}</Typography>
          </AnimatedCard>
        )}
      </Stack>

      <PrayerDialog open={open} onClose={() => setOpen(false)} prayer={editing} onSaved={reload} />
      <ConfettiBurst trigger={confettiKey} />
    </Box>
  );
}

function PrayerDialog({ open, onClose, prayer, onSaved }: { open: boolean; onClose: () => void; prayer: Prayer | null; onSaved: () => void }) {
  const { t } = useTranslation();
  const [request, setRequest] = useState(""); const [requester, setRequester] = useState(""); const [category, setCategory] = useState(""); const [notes, setNotes] = useState("");
  useEffect(() => {
    if (open) {
      setRequest(prayer?.request ?? ""); setRequester(prayer?.requester ?? "");
      setCategory(prayer?.category ?? ""); setNotes(prayer?.notes ?? "");
    }
  }, [open, prayer]);
  const save = async () => {
    if (!request.trim()) return;
    await PrayerList.upsert({ id: prayer?.id, request: request.trim(), requester, category, notes, answered: prayer?.answered ?? false });
    onSaved(); onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{prayer ? t("edit") : t("add")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Prayer request" multiline rows={3} value={request} onChange={(e) => setRequest(e.target.value)}
            placeholder="ఉదా: ఆరోగ్యం కోసం ప్రార్థన  —  Example: prayer for health" autoFocus />
          <TextField label="Requested by" value={requester} onChange={(e) => setRequester(e.target.value)}
            placeholder="Name (optional)" />
          <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="health, family, work…" />
          <TextField label="Notes" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="అదనపు గమనికలు  —  Any additional notes" />
        </Stack>
      </DialogContent>
      <DialogActions>
        {prayer && <GlassyButton color="error" onClick={async () => { await PrayerList.remove(prayer.id); onSaved(); onClose(); }}>{t("delete")}</GlassyButton>}
        <Box sx={{ flex: 1 }} />
        <GlassyButton onClick={onClose}>{t("cancel")}</GlassyButton>
        <GlassyButton variant="contained" onClick={save} disabled={!request.trim()}>{t("save")}</GlassyButton>
      </DialogActions>
    </Dialog>
  );
}
