import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, Fade, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Prayer from "./pages/Prayer";
import SermonNotes from "./pages/SermonNotes";
import SermonAssistant from "./pages/SermonAssistant";
import PastSermons from "./pages/PastSermons";
import Events from "./pages/Events";
import Counseling from "./pages/Counseling";
import Bible from "./pages/Bible";
import FollowUp from "./pages/FollowUp";
import Finance from "./pages/Finance";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import { getProfile } from "./db";

export default function App() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getProfile>> | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      if (p?.language && p.language !== i18n.language) i18n.changeLanguage(p.language);
      setTimeout(() => setShowSplash(false), 1800);
    });
    // Refresh profile on focus so language change in Settings takes effect immediately
    const onFocus = () => getProfile().then(setProfile);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [i18n]);

  if (showSplash) {
    return (
      <Fade in={showSplash} timeout={500}>
        <Box
          sx={{
            position: "fixed", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #0a0a23 0%, #1a1a40 50%, #2d1b4e 100%)",
            zIndex: 9999
          }}
        >
          <Box sx={{
            fontSize: 96, fontWeight: 700, fontFamily: "Georgia, serif",
            background: "linear-gradient(135deg, #ffb74d, #ec407a)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "pulse 1.4s ease-in-out infinite",
            "@keyframes pulse": { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.08)" } }
          }}>J</Box>
          <Typography variant="h6" sx={{ mt: 2, opacity: 0.85, letterSpacing: 2 }}>
            {profile?.pastorName ? t("welcome", { name: profile.pastorName }) : t("appName")}
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, opacity: 0.55 }}>
            {t("tagline")}
          </Typography>
        </Box>
      </Fade>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/prayer" element={<Prayer />} />
        <Route path="/sermon-notes" element={<SermonNotes />} />
        <Route path="/sermon-assistant" element={<SermonAssistant />} />
        <Route path="/past-sermons" element={<PastSermons />} />
        <Route path="/events" element={<Events />} />
        <Route path="/counseling" element={<Counseling />} />
        <Route path="/bible" element={<Bible />} />
        <Route path="/follow-up" element={<FollowUp />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
