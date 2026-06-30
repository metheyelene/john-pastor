import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogActions, Typography, Button, Box, Slide, IconButton } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import CloseIcon from "@mui/icons-material/Close";

const STORAGE_KEY = "john:notif-prompt";
const SHOW_DELAY_MS = 1200; // small delay so user sees the app first

export default function NotificationPermissionPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    // Don't show if permission already decided (granted or denied)
    if (Notification.permission !== "default") return;
    // Don't show if user previously dismissed
    let dismissed: string | null = null;
    try { dismissed = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    if (dismissed === "never") return;

    const t = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const request = async () => {
    try {
      const result = await Notification.requestPermission();
      if (result === "default") {
        // user dismissed the native prompt without choosing — don't ask again this session
        try { sessionStorage.setItem(STORAGE_KEY, "later"); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    setOpen(false);
  };

  const maybeLater = () => {
    try { sessionStorage.setItem(STORAGE_KEY, "later"); } catch { /* ignore */ }
    setOpen(false);
  };

  const neverAsk = () => {
    try { localStorage.setItem(STORAGE_KEY, "never"); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          fullWidth
          maxWidth="xs"
          TransitionComponent={Slide}
          transitionDuration={320}
          PaperProps={{ sx: { overflow: "hidden", position: "relative" } }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
          >
            <Box sx={{
              position: "absolute", top: 0, left: 0, right: 0, height: 96,
              background: "linear-gradient(180deg, rgba(239,68,68,0.18) 0%, transparent 100%)",
              pointerEvents: "none"
            }} />
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2, display: "grid", placeItems: "center",
                background: "linear-gradient(135deg, #dc2626, #ef4444)",
                boxShadow: "0 8px 24px rgba(239,68,68,0.35)"
              }}>
                <NotificationsActiveIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Allow notifications?</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Stay on top of what's next
                </Typography>
              </Box>
              <IconButton size="small" onClick={maybeLater} aria-label="close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                JOHN AI can ping you when an event is coming up — a wedding tomorrow, a fasting prayer next week, a member's birthday. Notifications stay on your device, never sent to a server.
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                You can change this any time in Settings → Notifications.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 1, gap: 1, flexWrap: "wrap" }}>
              <Button onClick={neverAsk} sx={{ color: "text.disabled", fontSize: "0.8125rem" }}>Don't ask again</Button>
              <Box sx={{ flex: 1 }} />
              <Button onClick={maybeLater}>Maybe later</Button>
              <Button variant="contained" onClick={request} autoFocus>Allow</Button>
            </DialogActions>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
