import { Box, Stack, Typography, Avatar, Chip } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import html2canvas from "html2canvas";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import {
  getProfile, Members, PrayerList, SermonNotesStore, PastSermonsStore,
  EventsStore, CounselingStore, FollowUpStore, FinanceStore
} from "../db";
import { useTranslation } from "react-i18next";

export default function ProfilePage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getProfile>>>(null);
  const [stats, setStats] = useState({ members: 0, prayerOpen: 0, prayerAnswered: 0, notes: 0, pastSermons: 0, events: 0, counseling: 0, followUps: 0, financeNet: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setProfile(await getProfile());
      const [m, p, n, ps, e, c, f, fi] = await Promise.all([
        Members.list(), PrayerList.list(), SermonNotesStore.list(), PastSermonsStore.list(),
        EventsStore.list(), CounselingStore.list(), FollowUpStore.list(), FinanceStore.list()
      ]);
      const inc = fi.filter((x) => x.kind === "income").reduce((s, x) => s + x.amount, 0);
      const exp = fi.filter((x) => x.kind === "expense").reduce((s, x) => s + x.amount, 0);
      setStats({
        members: m.length, prayerOpen: p.filter((x) => !x.answered).length, prayerAnswered: p.filter((x) => x.answered).length,
        notes: n.length, pastSermons: ps.length, events: e.length, counseling: c.length,
        followUps: f.length, financeNet: inc - exp
      });
    })();
  }, []);

  const shareCard = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { backgroundColor: "#1a1a40", scale: 2 });
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], `pastor-${profile?.pastorName ?? "card"}.png`, { type: "image/png" });
    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      try { await (navigator as any).share({ files: [file], title: "Pastor's card" }); return; } catch { /* fall through */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pastor-card.png`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!profile) return null;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>{t("profile")}</Typography>

      <motion.div ref={cardRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <AnimatedCard sx={{
          p: { xs: 3, md: 5 },
          background: "linear-gradient(135deg, rgba(255,183,77,0.25), rgba(236,64,122,0.25), rgba(102,187,106,0.18))",
          border: "1px solid rgba(255,255,255,0.15)"
        }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "center" }}>
            <Avatar sx={{ width: 100, height: 100, fontSize: 40, fontWeight: 700, background: "linear-gradient(135deg,#ffb74d,#ec407a)", color: "#1a1a40" }}
              src={profile.photoDataUrl}>
              {profile.pastorName.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" sx={{ color: "#ffb74d", letterSpacing: 3 }}>Pastor</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{profile.pastorName || "—"}</Typography>
              <Typography variant="h6" sx={{ opacity: 0.85, mt: 0.5 }}>{profile.churchName || "—"}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 0.5 }}>
                <Chip label={`${stats.members} members served`} size="small" />
                <Chip label={`${stats.notes} sermons preached`} size="small" />
                <Chip label={`${stats.prayerAnswered} prayers answered`} size="small" color="success" variant="outlined" />
                <Chip label={`${stats.followUps} follow-ups`} size="small" color="primary" variant="outlined" />
              </Stack>
            </Box>
          </Stack>
        </AnimatedCard>
      </motion.div>

      <Box sx={{ mt: 3, mb: 2, textAlign: "right" }}>
        <GlassyButton variant="contained" startIcon={<ShareIcon />} onClick={shareCard}>Share resume card</GlassyButton>
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Activity across John</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 2 }}>
        {[
          { label: "Members", v: stats.members, color: "#ffb74d" },
          { label: "Open prayers", v: stats.prayerOpen, color: "#ec407a" },
          { label: "Prayers answered", v: stats.prayerAnswered, color: "#66bb6a" },
          { label: "Sermon notes", v: stats.notes, color: "#ab47bc" },
          { label: "Past sermons", v: stats.pastSermons, color: "#42a5f5" },
          { label: "Events", v: stats.events, color: "#ffa726" },
          { label: "Counseling notes", v: stats.counseling, color: "#26a69a" },
          { label: "Follow-ups", v: stats.followUps, color: "#ef5350" }
        ].map((s) => (
          <AnimatedCard key={s.label} sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: s.color }}>{s.v}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>{s.label}</Typography>
          </AnimatedCard>
        ))}
      </Box>

      <Typography variant="caption" sx={{ display: "block", mt: 3, opacity: 0.55 }}>
        The card above auto-updates as you use John — every prayer answered, sermon preached, follow-up made is reflected here. Tap "Share resume card" to download or share as an image.
      </Typography>
    </Box>
  );
}
