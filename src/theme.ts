import { createTheme, alpha } from "@mui/material/styles";

// Vibrant theme — deep indigo → magenta gradient, warm gold CTAs, soft coral accents.
// Glassy button styles defined here for reuse across the app.
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#ffb74d", light: "#ffd180", dark: "#c88719", contrastText: "#1a1a40" },
    secondary: { main: "#ec407a", light: "#ff77a9", dark: "#b2144f" },
    background: { default: "#0a0a23", paper: "#1a1a40" },
    text: { primary: "#f5f5fa", secondary: "#b8b8d4" },
    success: { main: "#66bb6a" },
    warning: { main: "#ffa726" },
    error: { main: "#ef5350" },
    info: { main: "#42a5f5" }
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", system-ui, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: "0.01em" }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: "linear-gradient(135deg, #0a0a23 0%, #1a1a40 50%, #2d1b4e 100%)",
          backgroundAttachment: "fixed",
          minHeight: "100vh"
        },
        "*::-webkit-scrollbar": { width: 8, height: 8 },
        "*::-webkit-scrollbar-track": { background: "rgba(255,255,255,0.04)" },
        "*::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.18)", borderRadius: 8 }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          // Glassy texture — applied to ALL buttons consistently.
          backdropFilter: "blur(12px) saturate(160%)",
          WebkitBackdropFilter: "blur(12px) saturate(160%)",
          background: ownerState.variant === "contained"
            ? `linear-gradient(135deg, ${alpha("#ffb74d", 0.85)}, ${alpha("#ec407a", 0.85)})`
            : alpha("#ffffff", 0.08),
          border: `1px solid ${alpha("#ffffff", 0.18)}`,
          boxShadow: `0 4px 20px ${alpha("#000000", 0.25)}, inset 0 1px 0 ${alpha("#ffffff", 0.15)}`,
          transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
          "&:hover": {
            transform: "translateY(-1px) scale(1.02)",
            boxShadow: `0 8px 28px ${alpha("#ec407a", 0.35)}, inset 0 1px 0 ${alpha("#ffffff", 0.25)}`,
            background: ownerState.variant === "contained"
              ? `linear-gradient(135deg, #ffb74d, #ec407a)`
              : alpha("#ffffff", 0.14)
          },
          "&:active": { transform: "translateY(0) scale(0.99)" }
        })
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          background: alpha("#1a1a40", 0.55),
          border: `1px solid ${alpha("#ffffff", 0.08)}`,
          backgroundImage: "none"
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          background: alpha("#1a1a40", 0.45),
          border: `1px solid ${alpha("#ffffff", 0.08)}`,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: `0 12px 32px ${alpha("#000000", 0.4)}`
          }
        }
      }
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "medium" }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(8px)",
          background: alpha("#ffffff", 0.04),
          "& fieldset": { borderColor: alpha("#ffffff", 0.15) },
          "&:hover fieldset": { borderColor: alpha("#ffffff", 0.3) },
          "&.Mui-focused fieldset": { borderColor: "#ffb74d" }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(20px) saturate(160%)",
          background: alpha("#0a0a23", 0.7),
          borderBottom: `1px solid ${alpha("#ffffff", 0.08)}`,
          boxShadow: "none"
        }
      }
    }
  }
});
