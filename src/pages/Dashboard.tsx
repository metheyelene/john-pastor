import { Box, Grid, Typography, Stack, Chip } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PeopleIcon from "@mui/icons-material/People";
import FavoriteIcon from "@mui/icons-material/Favorite";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EventIcon from "@mui/icons-material/Event";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import AddIcon from "@mui/icons-material/Add";
import PhoneForwardedIcon from "@mui/icons-material/PhoneForwarded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AnimatedCard from "../components/AnimatedCard";
import GlassyButton from "../components/GlassyButton";
import { Members, PrayerList, SermonNotesStore, EventsStore, FollowUpStore, getProfile } from "../db";
import { verseOfTheDay } from "../bible";
import { useTranslation } from "react-i18next";

const QUICK = [
  { to: "/members", icon: <PeopleIcon />, labelKey: "members", color: "#ffb74d" },
  { to: "/prayer", icon: <FavoriteIcon />, labelKey: "prayer", color: "#ec407a" },
  { to: "/sermon-notes", icon: <MenuBookIcon />, labelKey: "sermonNotes", color: "#66bb6a" },
  { to: "/sermon-assistant", icon: <AutoAwesomeIcon />, labelKey: "sermonAssistant", color: "#ab47bc" },
  { to: "/events", icon: <EventIcon />, labelKey: "events", color: "#42a5f5" },
  { to: "/counseling", icon: <AutoStoriesIcon />, labelKey: "counseling", color: "#26a69a" },
  { to: "/bible", icon: <AutoStoriesIcon />, labelKey: "bible", color: "#ffa726" },
  { to: "/follow-up", icon: <PhoneForwardedIcon />, labelKey: "followUp", color: "#ef5350" }
];

export default function Dashboard() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [counts, setCounts] = useState({ members: 0, prayer: 0, notes: 0, events: 0, followUps: 0 });
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getProfile>> | null>(null);
  const [upcoming, setUpcoming] = useState<Awaited<ReturnType<typeof EventsStore.list>>>([]);
  const votd = verseOfTheDay();

  useEffect(() => {
    (async () => {
      const [m, p, n, e, f] = await Promise.all([Members.list(), PrayerList.list(), SermonNotesStore.list(), EventsStore.list(), FollowUpStore.list()]);
      setCounts({ members: m.length, prayer: p.length, notes: n.length, events: e.length, followUps: f.length });
      setProfile(await getProfile());
      const today = new Date().toISOString().slice(0, 10);
      setUpcoming(e.filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5));
    })();
  }, []);

  return (
    <Box>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {profile?.pastorName ? t("welcome", { name: profile.pastorName }) : t("appName")}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>{t("tagline")}</Typography>
      </motion.div>

      <AnimatedCard sx={{ p: 3, mb: 3, background: "linear-gradient(135deg, rgba(255,183,77,0.18), rgba(236,64,122,0.18))" }}>
        <Typography variant="overline" sx={{ color: "#ffb74d", letterSpacing: 2 }}>{t("todayVerse")}</Typography>
        <Typography variant="h6" sx={{ mt: 1, fontStyle: "italic" }}>"{votd.text}"</Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>— {votd.ref}</Typography>
      </AnimatedCard>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: t("members"), v: counts.members, color: "#ffb74d" },
          { label: t("prayer"), v: counts.prayer, color: "#ec407a" },
          { label: t("sermonNotes"), v: counts.notes, color: "#66bb6a" },
          { label: t("events"), v: counts.events, color: "#42a5f5" },
          { label: t("followUp"), v: counts.followUps, color: "#ef5350" }
        ].map((s) => (
          <Grid item xs={6} sm={4} md={2.4} key={s.label}>
            <AnimatedCard sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: s.color }}>{s.v}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.75 }}>{s.label}</Typography>
            </AnimatedCard>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>Quick access</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {QUICK.map((q) => (
          <Grid item xs={6} sm={4} md={3} key={q.to}>
            <RouterLink to={q.to} style={{ textDecoration: "none" }}>
              <AnimatedCard sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2, display: "grid", placeItems: "center", background: `${q.color}22`, color: q.color }}>{q.icon}</Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>{t(q.labelKey)}</Typography>
              </AnimatedCard>
            </RouterLink>
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Upcoming</Typography>
        <GlassyButton onClick={() => nav("/events")} size="small" startIcon={<AddIcon />}>Add</GlassyButton>
      </Stack>
      {upcoming.length === 0 ? (
        <AnimatedCard sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>{t("noItems")}</Typography>
        </AnimatedCard>
      ) : (
        <Stack spacing={1.5}>
          {upcoming.map((e) => (
            <AnimatedCard key={e.id} sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ minWidth: 60, textAlign: "center" }}>
                <Typography variant="caption" sx={{ opacity: 0.7, display: "block" }}>{new Date(e.date).toLocaleDateString(undefined, { month: "short" })}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>{new Date(e.date).getDate()}</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{e.title}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                  <Chip label={e.type} size="small" sx={{ textTransform: "capitalize" }} />
                  {e.time && <Chip label={e.time} size="small" variant="outlined" />}
                  {e.location && <Chip label={e.location} size="small" variant="outlined" />}
                </Stack>
              </Box>
            </AnimatedCard>
          ))}
        </Stack>
      )}
    </Box>
  );
}
