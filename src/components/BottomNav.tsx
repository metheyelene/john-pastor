import { BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EventIcon from "@mui/icons-material/Event";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export default function BottomNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const theme = useTheme();
  const isTabletUp = useMediaQuery(theme.breakpoints.up("sm"));
  const { t } = useTranslation();

  const items = [
    { to: "/", icon: <DashboardIcon />, label: t("dashboard") },
    { to: "/members", icon: <PeopleIcon />, label: t("members") },
    { to: "/sermon-notes", icon: <MenuBookIcon />, label: t("sermonNotes") },
    { to: "/events", icon: <EventIcon />, label: t("events") },
    { to: "/settings", icon: <SettingsIcon />, label: t("settings") }
  ];

  if (isTabletUp) return null;

  const current = items.findIndex((i) => i.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(i.to));

  return (
    <Paper
      component={motion.div}
      initial={{ y: 80 }} animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
      elevation={0}
      sx={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        zIndex: 1100,
        borderTop: `1px solid rgba(255,255,255,0.08)`,
        pb: "env(safe-area-inset-bottom)"
      }}
    >
      <BottomNavigation
        value={current === -1 ? 0 : current}
        onChange={(_, v) => nav(items[v].to)}
        showLabels
        sx={{ background: "rgba(10,10,35,0.85)", backdropFilter: "blur(20px)" }}
      >
        {items.map((i) => (
          <BottomNavigationAction key={i.to} label={i.label} icon={i.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
