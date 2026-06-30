import { Box, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, IconButton, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { FinanceStore, Members, type FinanceEntry, type Member } from "../db";
import { useTranslation } from "react-i18next";

export default function FinancePage() {
  const { t } = useTranslation();
  const [list, setList] = useState<FinanceEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);

  const reload = async () => {
    setList((await FinanceStore.list()).sort((a, b) => b.date.localeCompare(a.date)));
    setMembers(await Members.list());
  };
  useEffect(() => { reload(); }, []);

  const totals = useMemo(() => {
    const inc = list.filter((x) => x.kind === "income").reduce((s, x) => s + x.amount, 0);
    const exp = list.filter((x) => x.kind === "expense").reduce((s, x) => s + x.amount, 0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const mInc = list.filter((x) => x.kind === "income" && x.date.startsWith(thisMonth)).reduce((s, x) => s + x.amount, 0);
    const mExp = list.filter((x) => x.kind === "expense" && x.date.startsWith(thisMonth)).reduce((s, x) => s + x.amount, 0);
    return { inc, exp, mInc, mExp, net: inc - exp, mNet: mInc - mExp };
  }, [list]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>{t("finance")}</Typography>
        <GlassyButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpen(true); }}>{t("add")}</GlassyButton>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2, mb: 3 }}>
        <AnimatedCard sx={{ p: 2.5 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>This month income</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#66bb6a" }}>₹ {totals.mInc.toLocaleString()}</Typography>
        </AnimatedCard>
        <AnimatedCard sx={{ p: 2.5 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>This month expenses</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#ef5350" }}>₹ {totals.mExp.toLocaleString()}</Typography>
        </AnimatedCard>
        <AnimatedCard sx={{ p: 2.5 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>Month net</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: totals.mNet >= 0 ? "#66bb6a" : "#ef5350" }}>₹ {totals.mNet.toLocaleString()}</Typography>
        </AnimatedCard>
        <AnimatedCard sx={{ p: 2.5 }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>All-time net</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: totals.net >= 0 ? "#66bb6a" : "#ef5350" }}>₹ {totals.net.toLocaleString()}</Typography>
        </AnimatedCard>
      </Box>

      <Stack spacing={1.5}>
        <AnimatePresence>
          {list.map((f) => {
            const member = members.find((m) => m.id === f.memberId);
            return (
              <motion.div key={f.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AnimatedCard sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Chip label={f.kind === "income" ? "+ Income" : "− Expense"} size="small"
                    sx={{ background: f.kind === "income" ? "rgba(102,187,106,0.2)" : "rgba(239,83,80,0.2)", color: f.kind === "income" ? "#66bb6a" : "#ef5350", fontWeight: 700 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{f.category || (f.kind === "income" ? "Tithe / Offering" : "Expense")}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip label={f.date} size="small" />
                      {member && <Chip label={member.name} size="small" variant="outlined" />}
                    </Stack>
                    {f.notes && <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>{f.notes}</Typography>}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: f.kind === "income" ? "#66bb6a" : "#ef5350", minWidth: 100, textAlign: "right" }}>
                    ₹ {f.amount.toLocaleString()}
                  </Typography>
                  <GlassyButton size="small" onClick={() => { setEditing(f); setOpen(true); }}>{t("edit")}</GlassyButton>
                  <IconButton color="error" onClick={async () => { await FinanceStore.remove(f.id); reload(); }}><DeleteIcon /></IconButton>
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

      <FinanceDialog open={open} onClose={() => setOpen(false)} entry={editing} members={members} onSaved={reload} />
    </Box>
  );
}

function FinanceDialog({ open, onClose, entry, members, onSaved }: {
  open: boolean; onClose: () => void; entry: FinanceEntry | null; members: Member[]; onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<FinanceEntry["kind"]>("income");
  const [amount, setAmount] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(""); const [memberId, setMemberId] = useState(""); const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setKind(entry?.kind ?? "income");
      setAmount(entry ? String(entry.amount) : "");
      setDate(entry?.date ?? new Date().toISOString().slice(0, 10));
      setCategory(entry?.category ?? "");
      setMemberId(entry?.memberId ?? "");
      setNotes(entry?.notes ?? "");
    }
  }, [open, entry]);

  const save = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    await FinanceStore.upsert({
      id: entry?.id, kind, amount: amt, date,
      category: category || undefined, memberId: memberId || undefined,
      notes: notes || undefined
    });
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{entry ? t("edit") : t("add")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Kind" value={kind} onChange={(e) => setKind(e.target.value as FinanceEntry["kind"])}>
            <MenuItem value="income">Income</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField label="Amount (₹)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} sx={{ flex: 1 }} />
          </Stack>
          <TextField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={kind === "income" ? "Tithe, Offering, Donation…" : "Utilities, Supplies, Outreach…"} />
          <TextField select label="Member (optional, for tithe tracking)" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <MenuItem value="">— None —</MenuItem>
            {members.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>
          <TextField label="Notes" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Box sx={{ flex: 1 }} />
        <GlassyButton onClick={onClose}>{t("cancel")}</GlassyButton>
        <GlassyButton variant="contained" onClick={save} disabled={!amount}>{t("save")}</GlassyButton>
      </DialogActions>
    </Dialog>
  );
}
