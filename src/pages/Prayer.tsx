import { Box, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Checkbox, FormControlLabel } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { PrayerList, type Prayer } from "../db";
import { useTranslation } from "react-i18next";

// Inline tiny confetti (no extra dependency).
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

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = out.getDay(); // 0 = Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  out.setDate(out.getDate() + diff);
  return out;
}
function fmtWeek(d: Date): string {
  const start = startOfWeekMonday(d);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Week of ${fmt(start)} – ${fmt(end)}`;
}
function weekKey(d: Date): string {
  return startOfWeekMonday(d).toISOString().slice(0, 10);
}

export default function PrayerRequestsPage() {
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

  // Group: this week / last week / earlier
  const grouped = useMemo(() => {
    const now = new Date();
    const thisKey = weekKey(now);
    const lastKey = weekKey(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const buckets: Record<string, Prayer[]> = { thisKey: [], lastKey: [], earlier: [] };
    list.forEach((p) => {
      const key = weekKey(new Date(p.createdAt));
      if (key === thisKey) buckets.thisKey.push(p);
      else if (key === lastKey) buckets.lastKey.push(p);
      else buckets.earlier.push(p);
    });
    return buckets;
  }, [list]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{t("prayerRequests")}</Typography>
          <Typography variant="caption" sx={{ opacity: 0.65 }}>
            {list.filter((p) => !p.answered).length} open · {list.filter((p) => p.answered).length} answered
          </Typography>
        </Box>
        <GlassyButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpen(true); }}>{t("add")}</GlassyButton>
      </Stack>

      {list.length === 0 ? (
        <AnimatedCard sx={{ p: 6, textAlign: "center" }}>
          <FavoriteBorderIcon sx={{ fontSize: 48, opacity: 0.35, mb: 1.5 }} />
          <Typography variant="body1" sx={{ opacity: 0.75 }}>No prayer requests yet</Typography>
          <Typography variant="caption" sx={{ opacity: 0.55 }}>
            Tap + to add the first one — they'll group by week automatically.
          </Typography>
        </AnimatedCard>
      ) : (
        <Stack spacing={3}>
          {([
            { key: "thisKey", title: fmtWeek(new Date()), items: grouped.thisKey },
            { key: "lastKey", title: "Last week", items: grouped.lastKey },
            { key: "earlier", title: "Earlier", items: grouped.earlier }
          ] as const)
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <Box key={g.key}>
                <Typography
                  variant="overline"
                  sx={{ color: "primary.main", letterSpacing: 2, fontWeight: 700, fontSize: "0.75rem" }}
                >
                  {g.title}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", opacity: 0.5, mb: 1 }}>
                  {g.items.length} {g.items.length === 1 ? "request" : "requests"}
                </Typography>
                <Stack spacing={1.5}>
                  <AnimatePresence>
                    {g.items.map((p) => (
                      <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <AnimatedCard sx={{ p: 2, opacity: p.answered ? 0.65 : 1 }}>
                          <Stack direction="row" alignItems="flex-start" spacing={2}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={p.answered}
                                  onChange={() => toggle(p)}
                                  icon={<FavoriteBorderIcon />}
                                  checkedIcon={<FavoriteIcon sx={{ color: "#ec407a" }} />}
                                />
                              }
                              label=""
                              sx={{ m: 0 }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 600,
                                  textDecoration: p.answered ? "line-through" : "none"
                                }}
                              >
                                {p.request}
                              </Typography>
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
                </Stack>
              </Box>
            ))}
        </Stack>
      )}

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
          <TextField label="Requested by" value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Name (optional)" />
          <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="health, family, work…" />
          <TextField label="Notes" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="అదనపు గమనికలు  —  Any additional notes" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Box sx={{ flex: 1 }} />
        <GlassyButton onClick={onClose}>{t("cancel")}</GlassyButton>
        <GlassyButton variant="contained" onClick={save} disabled={!request.trim()}>{t("save")}</GlassyButton>
      </DialogActions>
    </Dialog>
  );
}
