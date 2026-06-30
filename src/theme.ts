import { createTheme, alpha } from "@mui/material/styles";

// JOHN AI theme — AMOLED black + vibrant red. Hand-tuned, not generic.
// Custom layered shadows, 8pt spacing rhythm, refined ease-out curves, glassy but minimal.

const red = {
  50:  "#fef2f2",
  100: "#fee2e2",
  200: "#fecaca",
  300: "#fca5a5",
  400: "#f87171",
  500: "#ef4444",
  600: "#dc2626",
  700: "#b91c1c",
  800: "#991b1b",
  900: "#7f1d1d"
};

// Subtle background grid: very faint vertical + horizontal lines on AMOLED black.
// Drawn into CSS as inline SVG so it's not an extra HTTP request.
const bgGrid = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M40 0H0V40' fill='none' stroke='%23ffffff' stroke-opacity='0.018'/></svg>")`;

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: red[500], light: red[400], dark: red[700], contrastText: "#ffffff" },
    secondary: { main: red[300], light: red[200], dark: red[500] },
    background: {
      default: "#000000",
      paper: "#0a0a0a"
    },
    text: {
      primary: "#f5f5f7",
      secondary: "rgba(245,245,247,0.62)",
      disabled: "rgba(245,245,247,0.32)"
    },
    divider: "rgba(255,255,255,0.06)",
    success: { main: "#22c55e" },
    warning: { main: "#f59e0b" },
    error:   { main: red[500] },
    info:    { main: "#3b82f6" }
  },
  shape: { borderRadius: 14 },
  spacing: 8,
  typography: {
    fontFamily: '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, fontSize: "2.5rem" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, fontSize: "2rem" },
    h3: { fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.2, fontSize: "1.625rem" },
    h4: { fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.25, fontSize: "1.375rem" },
    h5: { fontWeight: 600, letterSpacing: "-0.005em", lineHeight: 1.3, fontSize: "1.125rem" },
    h6: { fontWeight: 600, lineHeight: 1.4, fontSize: "1rem" },
    subtitle1: { fontWeight: 500, lineHeight: 1.5, fontSize: "1rem", letterSpacing: 0 },
    subtitle2: { fontWeight: 500, lineHeight: 1.5, fontSize: "0.875rem", letterSpacing: "0.01em" },
    body1: { lineHeight: 1.55, fontSize: "1rem", letterSpacing: 0 },
    body2: { lineHeight: 1.55, fontSize: "0.875rem", letterSpacing: 0 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: "0.01em" },
    overline: { fontWeight: 600, letterSpacing: "0.16em", lineHeight: 1.5, fontSize: "0.6875rem" }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "@import": "url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap')",
        "html, body, #root": { height: "100%" },
        body: {
          backgroundColor: "#000000",
          backgroundImage: `${bgGrid}, radial-gradient(circle at 100% 0%, ${alpha(red[700], 0.18)} 0%, transparent 45%), radial-gradient(circle at 0% 100%, ${alpha(red[900], 0.10)} 0%, transparent 40%)`,
          backgroundAttachment: "fixed",
          minHeight: "100vh",
          color: "#f5f5f7",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility"
        },
        "*::-webkit-scrollbar": { width: 8, height: 8 },
        "*::-webkit-scrollbar-track": { background: "transparent" },
        "*::-webkit-scrollbar-thumb": {
          background: "rgba(255,255,255,0.10)",
          borderRadius: 8
        },
        "*::-webkit-scrollbar-thumb:hover": { background: "rgba(239,68,68,0.35)" },
        "*:focus-visible": {
          outline: `2px solid ${red[500]}`,
          outlineOffset: 2
        },
        "::selection": { background: alpha(red[500], 0.35), color: "#fff" }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 12,
          paddingInline: 18,
          paddingBlock: 10,
          fontWeight: 600,
          letterSpacing: "0.01em",
          transition: "transform 140ms cubic-bezier(0.2, 0, 0, 1), background-color 140ms ease, box-shadow 140ms ease, color 140ms ease",
          "&:active": { transform: "scale(0.98)" },
          ...(ownerState.variant === "contained" && ownerState.color === "primary" ? {
            background: `linear-gradient(135deg, ${red[600]} 0%, ${red[500]} 50%, ${red[400]} 100%)`,
            boxShadow: `0 1px 0 ${alpha("#ffffff", 0.18)} inset, 0 6px 20px ${alpha(red[600], 0.35)}`,
            color: "#ffffff",
            "&:hover": {
              background: `linear-gradient(135deg, ${red[500]} 0%, ${red[400]} 100%)`,
              boxShadow: `0 1px 0 ${alpha("#ffffff", 0.22)} inset, 0 10px 28px ${alpha(red[500], 0.5)}`
            }
          } : {}),
          ...(ownerState.variant === "outlined" ? {
            borderColor: "rgba(255,255,255,0.14)",
            color: "#f5f5f7",
            background: "transparent",
            "&:hover": {
              borderColor: alpha(red[400], 0.6),
              background: alpha(red[500], 0.06),
              color: red[300]
            }
          } : {}),
          ...(ownerState.variant === "text" ? {
            color: "rgba(245,245,247,0.78)",
            "&:hover": {
              background: "rgba(255,255,255,0.05)",
              color: "#fff"
            }
          } : {})
        })
      }
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: alpha("#ffffff", 0.025),
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)"
        }
      }
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: alpha("#ffffff", 0.025),
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px) saturate(140%)",
          WebkitBackdropFilter: "blur(16px) saturate(140%)",
          borderRadius: 16,
          transition: "border-color 160ms ease, background-color 160ms ease, transform 160ms cubic-bezier(0.2, 0, 0, 1)",
          "&:hover": {
            borderColor: alpha(red[500], 0.3),
            backgroundColor: alpha("#ffffff", 0.04)
          }
        }
      }
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent" },
      styleOverrides: {
        root: {
          backgroundColor: alpha("#000000", 0.72),
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)"
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#000000",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          backgroundImage: "none"
        }
      }
    },
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "medium" }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: alpha("#ffffff", 0.025),
          transition: "background-color 140ms ease, box-shadow 140ms ease",
          "& fieldset": { borderColor: "rgba(255,255,255,0.10)", transition: "border-color 140ms ease" },
          "&:hover fieldset": { borderColor: "rgba(255,255,255,0.20)" },
          "&:hover": { backgroundColor: alpha("#ffffff", 0.04) },
          "&.Mui-focused": {
            backgroundColor: alpha("#ffffff", 0.05),
            boxShadow: `0 0 0 4px ${alpha(red[500], 0.18)}`
          },
          "&.Mui-focused fieldset": { borderColor: red[500], borderWidth: 1 }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { "&.Mui-focused": { color: red[400] } }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: alpha("#ffffff", 0.05),
          border: "1px solid rgba(255,255,255,0.06)",
          fontWeight: 500,
          fontSize: "0.8125rem",
          height: 26
        },
        colorPrimary: {
          backgroundColor: alpha(red[500], 0.14),
          border: `1px solid ${alpha(red[500], 0.32)}`,
          color: red[200]
        },
        colorSuccess: {
          backgroundColor: alpha("#22c55e", 0.14),
          border: `1px solid ${alpha("#22c55e", 0.32)}`,
          color: "#86efac"
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          color: "rgba(245,245,247,0.78)",
          transition: "background-color 140ms ease, color 140ms ease, transform 140ms cubic-bezier(0.2, 0, 0, 1)",
          "&:hover": { backgroundColor: alpha("#ffffff", 0.06), color: "#fff" },
          "&:active": { transform: "scale(0.94)" }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0a0a0a",
          backgroundImage: `${bgGrid}, radial-gradient(circle at 50% 0%, ${alpha(red[900], 0.4)} 0%, transparent 50%)`,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: "0.8125rem",
          fontWeight: 500,
          padding: "6px 10px"
        },
        arrow: { color: "#1a1a1a" }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: "rgba(255,255,255,0.06)" }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: "0.875rem"
        }
      },
      variants: [
        {
          props: { severity: "info" },
          style: {
            backgroundColor: alpha(red[500], 0.08),
            border: `1px solid ${alpha(red[500], 0.2)}`,
            color: red[200]
          }
        },
        {
          props: { severity: "success" },
          style: {
            backgroundColor: alpha("#22c55e", 0.08),
            border: `1px solid ${alpha("#22c55e", 0.2)}`,
            color: "#86efac"
          }
        },
        {
          props: { severity: "warning" },
          style: {
            backgroundColor: alpha("#f59e0b", 0.08),
            border: `1px solid ${alpha("#f59e0b", 0.2)}`,
            color: "#fcd34d"
          }
        },
        {
          props: { severity: "error" },
          style: {
            backgroundColor: alpha(red[500], 0.10),
            border: `1px solid ${alpha(red[500], 0.25)}`,
            color: red[100]
          }
        }
      ]
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 8,
          "& .MuiSwitch-track": {
            backgroundColor: "rgba(255,255,255,0.10)",
            opacity: 1
          },
          "& .MuiSwitch-thumb": { boxShadow: "0 2px 6px rgba(0,0,0,0.3)" },
          "& .Mui-checked+.MuiSwitch-track": {
            backgroundColor: red[500],
            opacity: 1
          }
        }
      }
    }
  }
});
