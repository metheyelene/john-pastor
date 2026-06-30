import { Box, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Chip, IconButton, Switch, FormControlLabel, ToggleButton, ToggleButtonGroup } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HistoryIcon from "@mui/icons-material/History";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { EventsStore, Members, type ChurchEvent, type Member } from "../db";
import { useTranslation } from "react-i18next";

const TYPES: { id: ChurchEvent["type"]; label: string; color: string; emoji: string }[] = [
  { id: "service", label: "Service", color: "#42a5f5", emoji: "⛪" },
  { id: "birthday", label: "Birthday", color: "#ec407a", emoji: "🎂" },
  { id: "wedding", label: "Wedding", color: "#ab47bc", emoji: "💍" },
  { id: "anniversary", label: "Wedding Anniversary", color: "#ab47bc", emoji: "💞" },
  { id: "prayer", label: "Prayer Meeting", color: "#66bb6a", emoji: "🙏" },
  { id: "fasting", label: "Fasting Prayer", color: "#ff7043", emoji: "🍞" },
  { id: "cottage", label: "Cottage Prayer", color: "#26a69a", emoji: "🏠" },
  { id: "meeting", label: "Meeting", color: "#5c6bc0", emoji: "👥" },
  { id: "other", label: "Other", color: "#78909c", emoji: "📌" }
];

function toMonthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // start on Sunday
  const weeks: Date[][] = [];
  let day = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) { row.push(new Date(day)); day.setDate(day.getDate() + 1); }
    weeks.push(row);
  }
  return weeks;
}

export default function EventsPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<ChurchEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cursor, setCursor] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChurchEvent | null>(null);
  const [view, setView] = useState<"upcoming" | "held">("upcoming");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const reload = async () => {
    setList(await EventsStore.list());
    setMembers(await Members.list());
  };
  useEffect(() => { reload(); }, []);

  // Permission for notifications (best-effort, doesn't block functionality)
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Check reminders on mount and every 15 min. Fires BOTH day-before and day-of notifications.
  // Uses localStorage to dedupe so each (event, type, day) only fires once.
  useEffect(() => {
    const todayStr = () => new Date().toISOString().slice(0, 10);
    const firedKey = "john:notif-fired";
    const hasFired = (id: string, kind: "dayBefore" | "dayOf") => {
      try {
        const all = JSON.parse(localStorage.getItem(firedKey) || "{}");
        return Boolean(all[`${id}:${kind}:${todayStr()}`]);
      } catch { return false; }
    };
    const markFired = (id: string, kind: "dayBefore" | "dayOf") => {
      try {
        const all = JSON.parse(localStorage.getItem(firedKey) || "{}");
        all[`${id}:${kind}:${todayStr()}`] = true;
        localStorage.setItem(firedKey, JSON.stringify(all));
      } catch { /* ignore */ }
    };

    const check = () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const tStr = tomorrow.toISOString().slice(0, 10);
      const tdy = todayStr();
      list.forEach((e) => {
        if (!e.reminder) return;
        const when = e.time ? `${e.time} · ` : "";
        const where = e.location ? `${e.location} · ` : "";
        const body = `${when}${where}JOHN AI reminder`;
        if (e.date === tStr && !hasFired(e.id, "dayBefore")) {
          try {
            new Notification(`${e.title} — tomorrow`, { body, icon: "/icon.svg", tag: `john-${e.id}-dayBefore` });
            markFired(e.id, "dayBefore");
          } catch { /* ignore */ }
        }
        if (e.date === tdy && !hasFired(e.id, "dayOf")) {
          try {
            new Notification(`${e.title} — today`, { body, icon: "/icon.svg", tag: `john-${e.id}-dayOf` });
            markFired(e.id, "dayOf");
          } catch { /* ignore */ }
        }
      });
    };
    check();
    const id = setInterval(check, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [list]);

  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const weeks = useMemo(() => toMonthMatrix(year, month), [year, month]);
  const byDay = useMemo(() => {
    const m: Record<string, ChurchEvent[]> = {};
    list.forEach((e) => { (m[e.date] ??= []).push(e); });
    return m;
  }, [list]);

  // Past events grouped by ISO week (Mon → Sun), newest week first.
  const heldGroups = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const past = list.filter((e) => e.date < today);
    if (!past.length) return [];
    const getWeekStart = (dateStr: string) => {
      const d = new Date(dateStr + "T00:00:00");
      const dow = d.getDay(); // 0 = Sun
      const diff = dow === 0 ? -6 : 1 - dow;
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    };
    const groups = new Map<string, ChurchEvent[]>();
    past.forEach((e) => {
      const ws = getWeekStart(e.date);
      const arr = groups.get(ws) ?? [];
      arr.push(e);
      groups.set(ws, arr);
    });
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([weekStart, events]) => ({
        weekStart,
        events: events.sort((a, b) => a.date.localeCompare(b.date))
      }));
  }, [list]);

  const dayEvents = selectedDay ? (byDay[selectedDay] ?? []).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? "")) : [];

  const save = async (e: ChurchEvent | null, partial: Partial<ChurchEvent>) => {
    await EventsStore.upsert({ id: e?.id, title: partial.title!, date: partial.date!, ...partial });
    setOpen(false); setEditing(null); reload();
  };
  const remove = async (e: ChurchEvent) => { await EventsStore.remove(e.id); reload(); };

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>{t("events")}</Typography>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
          size="small"
          color="primary"
          sx={{ "& .MuiToggleButton-root": { px: 2, py: 0.75, fontWeight: 600, fontSize: "0.8125rem" } }}
        >
          <ToggleButton value="upcoming"><CalendarMonthIcon fontSize="small" sx={{ mr: 0.75 }} />Upcoming</ToggleButton>
          <ToggleButton value="held"><HistoryIcon fontSize="small" sx={{ mr: 0.75 }} />Held</ToggleButton>
        </ToggleButtonGroup>
        <GlassyButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpen(true); }}>{t("add")}</GlassyButton>
      </Stack>

      {view === "held" ? (
        heldGroups.length === 0 ? (
          <AnimatedCard sx={{ p: 6, textAlign: "center" }}>
            <HistoryIcon sx={{ fontSize: 48, opacity: 0.35, mb: 1.5 }} />
            <Typography variant="body1" sx={{ opacity: 0.75 }}>No past events yet</Typography>
            <Typography variant="caption" sx={{ opacity: 0.55 }}>
              Events move here automatically the day after they happen.
            </Typography>
          </AnimatedCard>
        ) : (
          heldGroups.map(({ weekStart, events }) => {
            const start = new Date(weekStart + "T00:00:00");
            const end = new Date(start); end.setDate(end.getDate() + 6);
            const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
            const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            return (
              <Box key={weekStart} sx={{ mb: 3 }}>
                <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 1.25 }}>
                  <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: 2, fontWeight: 700 }}>
                    Week of {fmt(start)} – {fmt(end)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.5 }}>
                    {events.length} {events.length === 1 ? "event" : "events"}
                  </Typography>
                </Stack>
                <Stack spacing={1}>
                  {events.map((e) => {
                    const meta = TYPES.find((t) => t.id === e.type);
                    const d = new Date(e.date + "T00:00:00");
                    return (
                      <AnimatedCard key={e.id} sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                        <Box sx={{ minWidth: 52, textAlign: "center" }}>
                          <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: 1.5, lineHeight: 1, display: "block", fontSize: "0.65rem" }}>
                            {dayLabels[d.getDay()]}
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, mt: 0.25 }}>
                            {d.getDate()}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.6, fontSize: "0.65rem" }}>
                            {fmt(d)}
                          </Typography>
                        </Box>
                        <Box sx={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: meta?.color ?? "#666", opacity: 0.85 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body1" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <Box component="span" sx={{ mr: 1 }}>{meta?.emoji}</Box>{e.title}
                            </Typography>
                            <Chip label={meta?.label} size="small" sx={{ background: `${meta?.color}22`, color: meta?.color, height: 20, fontSize: "0.6875rem" }} />
                          </Stack>
                          {(e.time || e.location) && (
                            <Typography variant="caption" sx={{ opacity: 0.65, display: "block" }}>
                              {[e.time, e.location].filter(Boolean).join(" · ")}
                            </Typography>
                          )}
                        </Box>
                        <IconButton size="small" onClick={() => { setEditing(e); setOpen(true); }} aria-label="edit">
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => remove(e)} aria-label="delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </AnimatedCard>
                    );
                  })}
                </Stack>
              </Box>
            );
          })
        )
      ) : null}

      <AnimatedCard sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <IconButton onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeftIcon /></IconButton>
          <Typography variant="h6" sx={{ flex: 1, textAlign: "center", fontWeight: 700 }}>
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </Typography>
          <IconButton onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRightIcon /></IconButton>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 0.5 }}>
          {["S","M","T","W","T","F","S"].map((d, i) => <Typography key={i} variant="caption" sx={{ textAlign: "center", opacity: 0.6 }}>{d}</Typography>)}
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
          {weeks.flat().map((d) => {
            const inMonth = d.getMonth() === month;
            const ds = d.toISOString().slice(0, 10);
            const isToday = ds === new Date().toISOString().slice(0, 10);
            const events = byDay[ds] ?? [];
            return (
              <Box key={ds} onClick={() => setSelectedDay(ds)}
                sx={{
                  minHeight: 64, p: 0.75, borderRadius: 2, cursor: "pointer",
                  background: isToday ? "rgba(255,183,77,0.18)" : "rgba(255,255,255,0.04)",
                  border: isToday ? "1px solid rgba(255,183,77,0.4)" : "1px solid transparent",
                  opacity: inMonth ? 1 : 0.4
                }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{d.getDate()}</Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.25 }}>
                  {events.slice(0, 3).map((e) => {
                    const meta = TYPES.find((t) => t.id === e.type);
                    return <Box key={e.id} sx={{ width: 8, height: 8, borderRadius: "50%", background: meta?.color ?? "#888" }} />;
                  })}
                  {events.length > 3 && <Typography variant="caption" sx={{ opacity: 0.6 }}>+{events.length - 3}</Typography>}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </AnimatedCard>

      {selectedDay && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {new Date(selectedDay).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </Typography>
          <Stack spacing={1}>
            {dayEvents.map((e) => {
              const meta = TYPES.find((t) => t.id === e.type)!;
              return (
                <AnimatedCard key={e.id} sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ fontSize: 28 }}>{meta.emoji}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{e.title}</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip label={meta.label} size="small" sx={{ background: `${meta.color}33`, color: meta.color }} />
                      {e.time && <Chip label={e.time} size="small" variant="outlined" />}
                      {e.location && <Chip label={e.location} size="small" variant="outlined" />}
                      {e.reminder && <Chip icon={<NotificationsActiveIcon sx={{ fontSize: 14 }} />} label="Reminder" size="small" color="primary" variant="outlined" />}
                    </Stack>
                  </Box>
                  <GlassyButton size="small" onClick={() => { setEditing(e); setOpen(true); }}>{t("edit")}</GlassyButton>
                  <IconButton color="error" onClick={() => remove(e)}><DeleteIcon /></IconButton>
                </AnimatedCard>
              );
            })}
            {dayEvents.length === 0 && (
              <Typography variant="body2" sx={{ opacity: 0.65, textAlign: "center", py: 3 }}>{t("noItems")}</Typography>
            )}
          </Stack>
        </Box>
      )}

      <EventDialog open={open} onClose={() => { setOpen(false); setEditing(null); }}
        event={editing} members={members}
        onSave={(p) => save(editing, p)} onDelete={editing ? async () => { await remove(editing); setOpen(false); setEditing(null); } : undefined} />
    </Box>
  );
}

function EventDialog({ open, onClose, event, members, onSave, onDelete }: {
  open: boolean; onClose: () => void; event: ChurchEvent | null; members: Member[];
  onSave: (p: Partial<ChurchEvent>) => void; onDelete?: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(""); const [type, setType] = useState<ChurchEvent["type"]>("service");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [time, setTime] = useState("");
  const [memberId, setMemberId] = useState<string>(""); const [location, setLocation] = useState(""); const [notes, setNotes] = useState("");
  const [reminder, setReminder] = useState(true);

  useEffect(() => {
    if (open) {
      setTitle(event?.title ?? ""); setType(event?.type ?? "service");
      setDate(event?.date ?? new Date().toISOString().slice(0, 10)); setTime(event?.time ?? "");
      setMemberId(event?.memberId ?? ""); setLocation(event?.location ?? "");
      setNotes(event?.notes ?? ""); setReminder(event?.reminder ?? true);
    }
  }, [open, event]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{event ? t("edit") : t("add")}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value as ChurchEvent["type"])}>
            {TYPES.map((tp) => <MenuItem key={tp.id} value={tp.id}>{tp.emoji} {tp.label}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Time" type="time" InputLabelProps={{ shrink: true }} value={time} onChange={(e) => setTime(e.target.value)} sx={{ flex: 1 }} />
          </Stack>
          <TextField select label="Member (optional)" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <MenuItem value="">— None —</MenuItem>
            {members.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>
          <TextField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <TextField label="Notes" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <FormControlLabel control={<Switch checked={reminder} onChange={(e) => setReminder(e.target.checked)} />} label="Send me a reminder (day before + day of)" />
        </Stack>
      </DialogContent>
      <DialogActions>
        {onDelete && <GlassyButton color="error" onClick={onDelete}>{t("delete")}</GlassyButton>}
        <Box sx={{ flex: 1 }} />
        <GlassyButton onClick={onClose}>{t("cancel")}</GlassyButton>
        <GlassyButton variant="contained" disabled={!title.trim() || !date}
          onClick={() => onSave({ title: title.trim(), type, date, time: time || undefined, memberId: memberId || undefined, location: location || undefined, notes: notes || undefined, reminder })}>
          {t("save")}
        </GlassyButton>
      </DialogActions>
    </Dialog>
  );
}
