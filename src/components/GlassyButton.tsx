import { Button, type ButtonProps } from "@mui/material";
import { forwardRef } from "react";

// Glassy button — re-uses theme styles for consistency; this is the canonical wrapper.
const GlassyButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <Button ref={ref} {...props} />
));
GlassyButton.displayName = "GlassyButton";
export default GlassyButton;
