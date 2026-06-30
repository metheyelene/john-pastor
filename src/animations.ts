import { keyframes } from "@mui/material/styles";

// Multi-layer text-shadow neon glow — used on the splash J + halo pulse
export const redGlow = keyframes`
  0%, 100% {
    text-shadow:
      0 0 8px rgba(239,68,68,0.85),
      0 0 18px rgba(239,68,68,0.55),
      0 0 32px rgba(220,38,38,0.45),
      0 0 60px rgba(185,28,28,0.30);
  }
  50% {
    text-shadow:
      0 0 12px rgba(248,113,113,0.95),
      0 0 28px rgba(239,68,68,0.70),
      0 0 48px rgba(220,38,38,0.55),
      0 0 90px rgba(185,28,28,0.40);
  }
`;

// Soft pulsing for the halo behind the J
export const jPulse = keyframes`
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50%      { opacity: 1.0;  transform: scale(1.08); }
`;

// Card lift — used on the Dashboard / Members rows
export const cardLift = keyframes`
  from { transform: translateY(0); }
  to   { transform: translateY(-2px); }
`;
