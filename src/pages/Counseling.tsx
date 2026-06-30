import { Box, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, IconButton, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LockIcon from "@mui/icons-material/Lock";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { CounselingStore, Members, type CounselingNote, type Member, getSettings } from "../db";
import { useTranslation } from "react-i18next";

async function encrypt(text: string, passphrase: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  return JSON.stringify({ s: btoa(String.fromCharCode(...salt)), i: btoa(String.fromCharCode(...iv)), d: btoa(String.fromCharCode(...new Uint8Array(ct))) });
}
async function decrypt(payload: string, passphrase: string): Promise<string> {
  const { s, i, d } = JSON.parse(payload);
  const salt = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(i), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(d), (c) => c.charCodeAt(0));
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(pt);
}

export default function CounselingPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<CounselingNote[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CounselingNote | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [passphrase, setPassphrase] = useState("");
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);

  const reload = async () => {
    setList(await CounselingStore.list());
    setMembers(await Members.list());
    setEncryptionEnabled((await getSettings()).encryptionEnabled);
  };
  useEffect(() => { reload(); }, []);

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>{t("counseling")}</Typography>
        {encryptionEnabled && <Chip icon={<LockIcon />} label="Encrypted" size="small" color="primary" />}
        <GlassyButton variant="contained" startIcon={<AddIcon />} sx={{ ml: 2 }} onClick={() => { setEditing(null); setOpen(true); }}>{t("add")}</GlassyButton>
      </Stack>

      <Stack spacing={1.5}>
        <AnimatePresence>
          {list.map((c) => {
            const isLocked = c.body.startsWith("{") && c.body.includes('"s":') && !unlockedIds.has(c.id);
            return (
              <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnimatedCard sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="flex-start" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{c.title}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip label={c.date} size="small" />
                        {c.memberId && <Chip label={members.find((m) => m.id === c.memberId)?.name ?? "Member"} size="small" variant="outlined" />}
                        {isLocked && <Chip icon={<LockIcon />} label="Encrypted" size="small" color="primary" />}
                      </Stack>
                      {!isLocked && (
                        <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap", opacity: 0.85 }}>{c.body}</Typography>
                      )}
                      {isLocked && encryptionEnabled && (
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                          <TextField type="password" size="small" placeholder="Passphrase" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
                          <GlassyButton size="small" variant="contained" startIcon={<VisibilityIcon />} onClick={async () => {
                            try {
                              const plain = await decrypt(c.body, passphrase);
                              const tmp = { ...c, body: plain };
                              setList((prev) => prev.map((x) => x.id === c.id ? tmp : x));
                              setUnlockedIds((s) => new Set(s).add(c.id));
                            } catch { alert("Wrong passphrase"); }
                          }}>Unlock</GlassyButton>
                        </Stack>
                      )}
                    </Box>
                    <GlassyButton size="small" onClick={() => { setEditing(c); setOpen(true); }}>{t("edit")}</GlassyButton>
                    <IconButton color="error" onClick={async () => { await CounselingStore.remove(c.id); reload(); }}><DeleteIcon /></IconButton>
                  </Stack>
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

      <CounselingDialog open={open} onClose={() => setOpen(false)} note={editing} members={members}
        encryptionEnabled={encryptionEnabled} onSaved={reload} />
    </Box>
  );
}

function CounselingDialog({ open, onClose, note, members, encryptionEnabled, onSaved }: {
  open: boolean; onClose: () => void; note: CounselingNote | null; members: Member[];
  encryptionEnabled: boolean; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memberId, setMemberId] = useState(""); const [body, setBody] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (open) { setTitle(note?.title ?? ""); setDate(note?.date ?? new Date().toISOString().slice(0, 10));
      setMemberId(note?.memberId ?? ""); setBody(note?.body ?? ""); setPassphrase(""); }
  }, [open, note]);

  const save = async () => {
    if (!title.trim() || !body.trim()) return;
    let stored = body;
    if (encryptionEnabled) {
      if (!passphrase) { alert("Passphrase required to encrypt"); return; }
      stored = await encrypt(body, passphrase);
    }
    await CounselingStore.upsert({ id: note?.id, title: title.trim(), date, memberId: memberId || undefined, body: stored });
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{note ? t("edit") : t("add")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <Stack direction="row" spacing={2}>
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} sx={{ flex: 1 }} />
            <TextField select label="Member" value={memberId} onChange={(e) => setMemberId(e.target.value)} sx={{ flex: 1 }}>
              <MenuItem value="">— None —</MenuItem>
              {members.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField label={encryptionEnabled ? "Note (will be encrypted)" : "Note"} multiline rows={6} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="తెలుగు లేదా English లో టైపు చేయండి  —  Type freely in Telugu or English" />
          {encryptionEnabled && (
            <TextField
              label="Passphrase to encrypt"
              type={showPw ? "text" : "password"}
              value={passphrase} onChange={(e) => setPassphrase(e.target.value)}
              InputProps={{ endAdornment: (
                <IconButton onClick={() => setShowPw((v) => !v)}>{showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}</IconButton>
              ) }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Box sx={{ flex: 1 }} />
        <GlassyButton onClick={onClose}>{t("cancel")}</GlassyButton>
        <GlassyButton variant="contained" onClick={save} disabled={!title.trim() || !body.trim()}>{t("save")}</GlassyButton>
      </DialogActions>
    </Dialog>
  );
}
