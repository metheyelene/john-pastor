import { Card, type CardProps } from "@mui/material";
import { motion, type MotionProps } from "framer-motion";
import { forwardRef } from "react";

const MotionDiv = motion.div;

type Props = CardProps & MotionProps & { lift?: boolean };

const AnimatedCard = forwardRef<HTMLDivElement, Props>(({ lift = true, children, ...rest }, ref) => (
  <MotionDiv
    whileHover={lift ? { y: -3, scale: 1.005 } : undefined}
    whileTap={lift ? { scale: 0.997 } : undefined}
    transition={{ type: "spring", stiffness: 320, damping: 24 }}
  >
    <Card ref={ref} {...rest}>{children}</Card>
  </MotionDiv>
));
AnimatedCard.displayName = "AnimatedCard";
export default AnimatedCard;
