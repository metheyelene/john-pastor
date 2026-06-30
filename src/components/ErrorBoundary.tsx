import { Component, type ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";

interface State { error: Error | null }
interface Props { children: ReactNode }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[John]", error); }
  render() {
    if (this.state.error) {
      return (
        <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 4, textAlign: "center" }}>
          <Typography variant="h4" gutterBottom>Something went sideways</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 3, maxWidth: 480 }}>
            {this.state.error.message}
          </Typography>
          <Button variant="contained" onClick={() => { this.setState({ error: null }); location.reload(); }}>
            Reload John
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
