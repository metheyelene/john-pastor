import { Box, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Chip, InputAdornment, Avatar } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { Members, type Member, EventsStore, type ChurchEvent } from "../db";
import { useTranslation } from "react-i18next";

export default function MembersPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [events, setEvents] = useState<ChurchEvent[]>([]);

  const reload = async () => {
    const [m, e] = await Promise.all([Members.list(), EventsStore.list()]);
    setList(m.sort((a, b) => a.name.localeCompare(b.name)));
    setEvents(e);
  };
  useEffect(() => { reload(); }, []);

  const filtered = list.filter((m) =>
    !q || [m.name, m.phone, m.family, m.notes, ...(m.tags ?? [])].some((s) => s?.toLowerCase().includes(q.toLowerCase()))
  );

  const upcomingFor = (id: string) =>
    events.filter((e) => e.memberId === id && e.date >= new Date().toISOString().slice(0, 10))
          .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, alignItems: { sm: "center" } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>{t("members")}</Typography>
        <TextField
          placeholder={t("search")}
          value={q} onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ minWidth: 240 }}
        />
        <GlassyButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpen(true); }}>
          {t("add")}
        </GlassyButton>
      </Stack>

      <Stack spacing={1.5}>
        <AnimatePresence>
          {filtered.map((m) => {
            const ups = upcomingFor(m.id);
            return (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnimatedCard sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ background: "linear-gradient(135deg,#ffb74d,#ec407a)", color: "#1a1a40", fontWeight: 700 }}>
                    {m.name.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{m.name}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                      {m.phone && <Chip label={m.phone} size="small" variant="outlined" />}
                      {m.family && <Chip label={m.family} size="small" />}
                      {m.birthday && <Chip label={`🎂 ${m.birthday}`} size="small" />}
                      {m.anniversary && <Chip label={`💍 ${m.anniversary}`} size="small" />}
                      {ups.slice(0, 2).map((u) => <Chip key={u.id} label={`📅 ${u.title} · ${u.date}`} size="small" color="primary" variant="outlined" />)}
                    </Stack>
                  </Box>
                  <GlassyButton size="small" onClick={() => { setEditing(m); setOpen(true); }}>{t("edit")}</GlassyButton>
                </AnimatedCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <AnimatedCard sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>{t("noItems")}</Typography>
          </AnimatedCard>
        )}
      </Stack>

      <MemberDialog open={open} onClose={() => setOpen(false)} member={editing} onSaved={reload} />
    </Box>
  );
}

function MemberDialog({ open, onClose, member, onSaved }: { open: boolean; onClose: () => void; member: Member | null; onSaved: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(member?.name ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [family, setFamily] = useState(member?.family ?? "");
  const [birthday, setBirthday] = useState(member?.birthday ?? "");
  const [anniversary, setAnniversary] = useState(member?.anniversary ?? "");
  const [notes, setNotes] = useState(member?.notes ?? "");
  const [tags, setTags] = useState((member?.tags ?? []).join(", "));

  useEffect(() => {
    if (open) {
      setName(member?.name ?? ""); setPhone(member?.phone ?? "");
      setFamily(member?.family ?? ""); setBirthday(member?.birthday ?? "");
      setAnniversary(member?.anniversary ?? ""); setNotes(member?.notes ?? "");
      setTags((member?.tags ?? []).join(", "));
    }
  }, [open, member]);

  const save = async () => {
    if (!name.trim()) return;
    await Members.upsert({
      id: member?.id, name: name.trim(), phone, family,
      birthday, anniversary, notes,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean)
    });
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{member ? t("edit") : t("add")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField label="Family" value={family} onChange={(e) => setFamily(e.target.value)} />
          <TextField label="Birthday" type="date" InputLabelProps={{ shrink: true }} value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          <TextField label="Anniversary" type="date" InputLabelProps={{ shrink: true }} value={anniversary} onChange={(e) => setAnniversary(e.target.value)} />
          <TextField label="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <TextField label="Notes" multiline rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="సభ్యుని గురించి గమనికలు  —  Any notes about the member" />
        </Stack>
      </DialogContent>
      <DialogActions>
        {member && <GlassyButton color="error" onClick={async () => { await Members.remove(member.id); onSaved(); onClose(); }}>{t("delete")}</GlassyButton>}
        <Box sx={{ flex: 1 }} />
        <GlassyButton onClick={onClose}>{t("cancel")}</GlassyButton>
        <GlassyButton variant="contained" onClick={save} disabled={!name.trim()}>{t("save")}</GlassyButton>
      </DialogActions>
    </Dialog>
  );
}
