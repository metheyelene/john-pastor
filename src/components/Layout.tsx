import { AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Box, Avatar, Divider, useMediaQuery, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import FavoriteIcon from "@mui/icons-material/Favorite";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HistoryIcon from "@mui/icons-material/History";
import EventIcon from "@mui/icons-material/Event";
import PsychologyIcon from "@mui/icons-material/Psychology";
import BibleIcon from "@mui/icons-material/AutoStories";
import PhoneForwardedIcon from "@mui/icons-material/PhoneForwarded";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import { useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BottomNav from "./BottomNav";
import PageTransition from "./PageTransition";
import { getProfile } from "../db";
import { useEffect } from "react";

const NAV = [
  { to: "/", icon: <HomeIcon />, key: "dashboard" },
  { to: "/members", icon: <PeopleIcon />, key: "members" },
  { to: "/prayer", icon: <FavoriteIcon />, key: "prayer" },
  { to: "/sermon-notes", icon: <MenuBookIcon />, key: "sermonNotes" },
  { to: "/sermon-assistant", icon: <AutoAwesomeIcon />, key: "sermonAssistant" },
  { to: "/past-sermons", icon: <HistoryIcon />, key: "pastSermons" },
  { to: "/events", icon: <EventIcon />, key: "events" },
  { to: "/counseling", icon: <PsychologyIcon />, key: "counseling" },
  { to: "/bible", icon: <BibleIcon />, key: "bible" },
  { to: "/follow-up", icon: <PhoneForwardedIcon />, key: "followUp" },
  { to: "/finance", icon: <AccountBalanceIcon />, key: "finance" },
  { to: "/profile", icon: <PersonIcon />, key: "profile" },
  { to: "/settings", icon: <SettingsIcon />, key: "settings" }
];

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useTranslation();
  const theme = useTheme();
  const isTabletUp = useMediaQuery(theme.breakpoints.up("sm"));
  const [pastorName, setPastorName] = useState("");

  useEffect(() => {
    getProfile().then((p) => setPastorName(p?.pastorName ?? ""));
  }, [loc.pathname]);

  const currentKey = NAV.find((n) => n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to))?.key;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {isTabletUp && (
        <Drawer
          variant="permanent"
          sx={{
            width: 260, flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: 260, boxSizing: "border-box",
              background: "rgba(10,10,35,0.7)",
              backdropFilter: "blur(20px)",
              borderRight: "1px solid rgba(255,255,255,0.08)"
            }
          }}
        >
          <Toolbar sx={{ gap: 1.5, py: 2 }}>
            <Avatar sx={{ background: "linear-gradient(135deg,#ffb74d,#ec407a)", color: "#1a1a40", fontWeight: 700 }}>J</Avatar>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1, letterSpacing: "0.04em" }}>JOHN AI</Typography>
              <Typography variant="caption" sx={{ opacity: 0.6 }}>{pastorName || t("tagline")}</Typography>
            </Box>
          </Toolbar>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
          <List sx={{ px: 1 }}>
            {NAV.map((n) => (
              <ListItemButton
                key={n.to}
                selected={currentKey === n.key}
                onClick={() => nav(n.to)}
                sx={{
                  borderRadius: 2, mb: 0.5,
                  "&.Mui-selected": {
                    background: "linear-gradient(135deg, rgba(255,183,77,0.18), rgba(236,64,122,0.18))",
                    borderLeft: "3px solid #ffb74d"
                  }
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{n.icon}</ListItemIcon>
                <ListItemText primary={t(n.key)} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar position="sticky" color="default">
          <Toolbar sx={{ gap: 1 }}>
            {!isTabletUp && (
              <IconButton edge="start" onClick={() => setOpen(true)} aria-label="menu">
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 700, letterSpacing: 0.5 }}>
              {t(currentKey ?? "appName")}
            </Typography>
          </Toolbar>
        </AppBar>

        {!isTabletUp && (
          <Drawer anchor="left" open={open} onClose={() => setOpen(false)}
            sx={{ "& .MuiDrawer-paper": { width: 280, background: "rgba(10,10,35,0.95)", backdropFilter: "blur(20px)" } }}>
            <Toolbar sx={{ gap: 1.5 }}><Avatar sx={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "#ffffff", fontWeight: 700 }}>J</Avatar><Typography variant="h6" sx={{ letterSpacing: "0.04em" }}>JOHN AI</Typography></Toolbar>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            <List sx={{ px: 1 }}>
              {NAV.map((n) => (
                <ListItemButton key={n.to} selected={currentKey === n.key} onClick={() => { nav(n.to); setOpen(false); }} sx={{ borderRadius: 2, mb: 0.5 }}>
                  <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{n.icon}</ListItemIcon>
                  <ListItemText primary={t(n.key)} />
                </ListItemButton>
              ))}
            </List>
          </Drawer>
        )}

        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 }, pb: { xs: 10, sm: 4 }, maxWidth: 1200, mx: "auto", width: "100%" }}>
          <PageTransition>{children}</PageTransition>
        </Box>

        <BottomNav />
      </Box>
    </Box>
  );
}
