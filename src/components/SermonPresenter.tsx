import { Dialog, IconButton, Box, Typography, Slide, useTheme, useMediaQuery } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SermonNote } from "../db";

const SlideUp = (props: any) => <Slide direction="up" {...props} />;

// Builds ordered "slides" from a sermon note: title → scripture → intro → each point + its illustration → application → closing → prayer.
function buildSlides(n: SermonNote): { heading?: string; body: string; big?: boolean }[] {
  const s: { heading?: string; body: string; big?: boolean }[] = [];
  s.push({ heading: n.title, body: n.date, big: true });
  if (n.scripture) s.push({ heading: "Scripture", body: n.scripture });
  if (n.intro) s.push({ heading: "Intro", body: n.intro });
  (n.points ?? []).forEach((p, i) => {
    s.push({ heading: `Point ${i + 1}`, body: p });
    const ill = n.illustrations?.[i];
    if (ill) s.push({ heading: "Illustration", body: ill });
  });
  if (n.application) s.push({ heading: "Application", body: n.application });
  if (n.closing) s.push({ heading: "Closing", body: n.closing });
  if (n.prayer) s.push({ heading: "Prayer", body: n.prayer });
  return s.length ? s : [{ heading: n.title, body: "Empty sermon note.", big: true }];
}

export default function SermonPresenter({
  open, onClose, note
}: { open: boolean; onClose: () => void; note: SermonNote | null }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [i, setI] = useState(0);
  const slides = note ? buildSlides(note) : [];
  const slide = slides[i];

  useEffect(() => {
    if (!open) setI(0);
  }, [open, note?.id]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") setI((v) => Math.min(v + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(v - 1, 0));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, slides.length, onClose]);

  if (!note) return null;

  const next = () => setI((v) => Math.min(v + 1, slides.length - 1));
  const prev = () => setI((v) => Math.max(v - 1, 0));

  return (
    <Dialog
      open={open} onClose={onClose} fullScreen={fullScreen}
      TransitionComponent={SlideUp}
      PaperProps={{ sx: { background: "linear-gradient(135deg,#0a0a23,#1a1a40)", borderRadius: fullScreen ? 0 : 3 } }}
    >
      <Box sx={{ position: "relative", minHeight: fullScreen ? "100vh" : "70vh", display: "flex", flexDirection: "column" }}>
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 12, right: 12, zIndex: 2 }} aria-label="close">
          <CloseIcon />
        </IconButton>

        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 4, md: 8 }, textAlign: "center", cursor: "pointer" }} onClick={next}>
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              style={{ maxWidth: 1000 }}
            >
              {slide?.heading && (
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: 4, opacity: 0.65, color: "#ffb74d" }}
                >
                  {slide.heading}
                </Typography>
              )}
              <Typography
                variant={slide?.big ? "h2" : "h3"}
                sx={{ mt: 2, fontWeight: 600, lineHeight: 1.3, fontSize: { xs: slide?.big ? "2.2rem" : "1.6rem", md: slide?.big ? "3.8rem" : "2.4rem" } }}
              >
                {slide?.body}
              </Typography>
            </motion.div>
          </AnimatePresence>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <IconButton onClick={prev} disabled={i === 0} aria-label="previous"><ChevronLeftIcon /></IconButton>
          <Typography variant="caption" sx={{ opacity: 0.6 }}>{i + 1} / {slides.length} · tap or → to advance</Typography>
          <IconButton onClick={next} disabled={i === slides.length - 1} aria-label="next"><ChevronRightIcon /></IconButton>
        </Box>
      </Box>
    </Dialog>
  );
}
