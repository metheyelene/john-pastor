import { Box, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, IconButton, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { FollowUpStore, Members, type FollowUpEntry, type Member } from "../db";
import { useTranslation } from "react-i18next";

const KINDS: { id: FollowUpEntry["kind"]; label: string; emoji: string }[] = [
  { id: "visit", label: "Visit", emoji: "🏠" },
  { id: "call", label: "Phone call", emoji: "📞" },
  { id: "message", label: "Message", emoji: "💬" },
  { id: "first-time", label: "First-time guest", emoji: "👋" },
  { id: "prayer", label: "Prayer request", emoji: "🙏" }
];

export default function FollowUpPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<FollowUpEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpEntry | null>(null);

  const reload = async () => {
    setList((await FollowUpStore.list()).sort((a, b) => b.date.localeCompare(a.date)));
    setMembers(await Members.list());
  };
  useEffect(() => { reload(); }, []);

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>{t("followUp")}</Typography>
        <GlassyButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpen(true); }}>{t("add")}</GlassyButton>
      </Stack>

      <Stack spacing={1.5}>
        <AnimatePresence>
          {list.map((f) => {
            const meta = KINDS.find((k) => k.id === f.kind)!;
            const member = members.find((m) => m.id === f.memberId);
            return (
              <motion.div key={f.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnimatedCard sx={{ p: 2, display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <Box sx={{ fontSize: 28 }}>{meta.emoji}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{meta.label}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                      <Chip label={f.date} size="small" />
                      {member && <Chip label={member.name} size="small" />}
                    </Stack>
                    {f.notes && <Typography variant="body2" sx={{ mt: 1, opacity: 0.85 }}>{f.notes}</Typography>}
                  </Box>
                  <GlassyButton size="small" onClick={() => { setEditing(f); setOpen(true); }}>{t("edit")}</GlassyButton>
                  <IconButton color="error" onClick={async () => { await FollowUpStore.remove(f.id); reload(); }}><DeleteIcon /></IconButton>
                </AnimatedCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {list.length === 0 && (
          <AnimatedCard sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>{t("noItems")}</Typography>
          </AnimatedCard>
        )}
      </Stack>

      <FollowUpDialog open={open} onClose={() => setOpen(false)} entry={editing} members={members} onSaved={reload} />
    </Box>
  );
}

function FollowUpDialog({ open, onClose, entry, members, onSaved }: {
  open: boolean; onClose: () => void; entry: FollowUpEntry | null; members: Member[]; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<FollowUpEntry["kind"]>("visit");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memberId, setMemberId] = useState(""); const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setKind(entry?.kind ?? "visit");
      setDate(entry?.date ?? new Date().toISOString().slice(0, 10));
      setMemberId(entry?.memberId ?? ""); setNotes(entry?.notes ?? "");
    }
  }, [open, entry]);

  const save = async () => {
    await FollowUpStore.upsert({ id: entry?.id, kind, date, memberId: memberId || undefined, notes: notes || undefined });
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{entry ? t("edit") : t("add")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Kind" value={kind} onChange={(e) => setKind(e.target.value as FollowUpEntry["kind"])}>
            {KINDS.map((k) => <MenuItem key={k.id} value={k.id}>{k.emoji} {k.label}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} sx={{ flex: 1 }} />
            <TextField select label="Member" value={memberId} onChange={(e) => setMemberId(e.target.value)} sx={{ flex: 1 }}>
              <MenuItem value="">— None —</MenuItem>
              {members.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField label="Notes" multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Box sx={{ flex: 1 }} />
        <GlassyButton onClick={onClose}>{t("cancel")}</GlassyButton>
        <GlassyButton variant="contained" onClick={save}>{t("save")}</GlassyButton>
      </DialogActions>
    </Dialog>
  );
}
