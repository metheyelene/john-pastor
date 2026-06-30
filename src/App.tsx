import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Box, keyframes } from "@mui/material";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
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
import NotificationPermissionPrompt from "./components/NotificationPermissionPrompt";
import { redGlow, jPulse } from "./animations";

// Subtle background grid lines on the splash
const gridBg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><path d='M48 0H0V48' fill='none' stroke='%23ffffff' stroke-opacity='0.022'/></svg>")`;

// Fade-up animation for content sections
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export default function App() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getProfile>> | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      if (p?.language && p.language !== i18n.language) i18n.changeLanguage(p.language);
      setTimeout(() => setShowSplash(false), 3200);
    });
    const onFocus = () => getProfile().then(setProfile);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [i18n]);

  if (showSplash) {
    return <Splash profile={profile} />;
  }

  return (
    <>
      <Layout>
        <AnimatePresence mode="wait">
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
        </AnimatePresence>
      </Layout>
      <NotificationPermissionPrompt />
    </>
  );
}

// ---------- Splash ----------
function Splash({ profile }: { profile: Awaited<ReturnType<typeof getProfile>> | null }) {
  return (
    <Box
      role="status"
      aria-label="Loading JOHN AI"
      sx={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        backgroundColor: "#000000",
        backgroundImage: `${gridBg}, radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.20) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(127,29,29,0.10) 0%, transparent 50%)`,
        overflow: "hidden"
      }}
    >
      {/* Subtle scan lines */}
      <Box sx={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 3px)",
        opacity: 0.6
      }} />

      {/* Red glow halo behind the J — built with keyframes that pulse softly */}
      <Box sx={{
        position: "absolute",
        width: 320, height: 320, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(239,68,68,0.35) 0%, rgba(239,68,68,0.10) 40%, transparent 70%)",
        filter: "blur(20px)",
        animation: `${jPulse} 2.4s ease-in-out infinite`
      }} />

      {/* The J letter — neon glow */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.9, ease: [0.2, 0, 0, 1] }}
        style={{ animation: `${jPulse} 3.6s ease-in-out infinite 0.9s` }}
      >
        <Box sx={{
          fontFamily: "Georgia, serif",
          fontSize: { xs: 180, md: 220 },
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.05em",
          color: "#ef4444",
          textShadow: `${redGlow}`,
          userSelect: "none",
          animation: `${redGlow} 3.6s ease-in-out infinite 0.9s`
        }}>
          J
        </Box>
      </motion.div>

      {/* JOHN AI wordmark */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease: [0.2, 0, 0, 1] }}
      >
        <Box sx={{
          mt: { xs: 2, md: 3 },
          fontSize: { xs: "1.75rem", md: "2.25rem" },
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#f5f5f7",
          fontFamily: '"Inter", system-ui, sans-serif',
          textShadow: "0 0 24px rgba(239,68,68,0.25)"
        }}>
          J<Box component="span" sx={{ color: "#ef4444" }}>O</Box>HN&nbsp;AI
        </Box>
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <Box sx={{
          mt: 1.5,
          fontSize: "0.875rem",
          letterSpacing: "0.20em",
          textTransform: "uppercase",
          color: "rgba(245,245,247,0.42)",
          fontWeight: 500
        }}>
          Your daily ministry companion
        </Box>
      </motion.div>

      {/* Welcome line */}
      {profile?.pastorName && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9, duration: 0.55, ease: [0.2, 0, 0, 1] }}
        >
          <Box sx={{
            mt: 4,
            fontSize: "1rem",
            color: "rgba(245,245,247,0.78)",
            animation: `${fadeUp} 0.55s ease-out`,
            "& em": { fontStyle: "normal", color: "#fca5a5", fontWeight: 600 }
          }}>
            Welcome, Pastor <em>{profile.pastorName}</em>
          </Box>
        </motion.div>
      )}

      {/* Bottom progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          position: "absolute", bottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)",
          left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 6, alignItems: "center"
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 0.9, 0.2] }}
            transition={{ delay: i * 0.18, duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              display: "inline-block", width: 5, height: 5, borderRadius: "50%",
              background: "#ef4444"
            }}
          />
        ))}
      </motion.div>
    </Box>
  );
}
