import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import type { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Box
        key={loc.pathname}
        component={motion.div}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        sx={{ minHeight: "100%" }}
      >
        {children}
      </Box>
    </AnimatePresence>
  );
}
