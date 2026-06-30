import { Box, Stack, Typography, Chip, LinearProgress, IconButton } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { PastSermonsStore, SermonNotesStore, type PastSermon } from "../db";
import { summarize, structureSermonNotes } from "../ai";
import { useTranslation } from "react-i18next";

type Mode = "image" | "text";

export default function PastSermonsPage() {
  const { t } = useTranslation();
  const [list, setList] = useState<PastSermon[]>([]);
  const [mode, setMode] = useState<Mode>("image");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => setList((await PastSermonsStore.list()).sort((a, b) => b.date.localeCompare(a.date)));
  useEffect(() => { reload(); }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true); setProgress(0); setStatus("Reading file…");
    try {
      const Tesseract = (await import("tesseract.js")).default;
      let combined = "";
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setStatus(`OCR ${i + 1}/${files.length}: ${f.name}`);
        const { data } = await Tesseract.recognize(f, "eng", {
          logger: (m: any) => setProgress(Math.min(99, ((m.progress ?? 0) * 100)))
        });
        combined += `\n\n--- ${f.name} ---\n${data.text}`;
        setProgress(Math.round(((i + 1) / files.length) * 80));
      }
      setStatus("Structuring into sermon notes…");
      const structured = await structureSermonNotes(combined);
      const dataUrl = files[0].type.startsWith("image/") ? await readAsDataURL(files[0]) : undefined;
      const note = await SermonNotesStore.upsert({
        title: structured.title || `Past sermon · ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString().slice(0, 10),
        scripture: structured.scripture, intro: structured.intro,
        points: structured.points ?? [], illustrations: structured.illustrations ?? [],
        application: structured.application, closing: structured.closing,
        tags: ["past-sermon", "ocr"]
      });
      await PastSermonsStore.upsert({
        title: note.title, date: note.date,
        transcript: combined, source: dataUrl,
        linkedNoteId: note.id
      });
      setStatus("Done!");
      setProgress(100);
      reload();
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setTimeout(() => { setStatus(""); setProgress(0); }, 2200);
    }
  };

  const handleText = async () => {
    if (!text.trim()) return;
    setBusy(true); setStatus("Structuring…");
    try {
      const structured = await structureSermonNotes(text);
      const summary = await summarize(text, "notes");
      const note = await SermonNotesStore.upsert({
        title: structured.title || `Past sermon · ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString().slice(0, 10),
        scripture: structured.scripture, intro: structured.intro,
        points: structured.points ?? [], illustrations: structured.illustrations ?? [],
        application: structured.application, closing: structured.closing,
        tags: ["past-sermon", "text"]
      });
      await PastSermonsStore.upsert({
        title: note.title, date: note.date,
        transcript: text + "\n\n---\nAI Summary:\n" + summary,
        linkedNoteId: note.id
      });
      setText(""); reload();
    } finally { setBusy(false); setStatus(""); }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>{t("pastSermons")}</Typography>

      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <GlassyButton variant={mode === "image" ? "contained" : "outlined"} onClick={() => setMode("image")}>Upload photo(s)</GlassyButton>
          <GlassyButton variant={mode === "text" ? "contained" : "outlined"} onClick={() => setMode("text")}>Paste text</GlassyButton>
        </Stack>

        {mode === "image" ? (
          <>
            <input
              ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <GlassyButton
              variant="contained" startIcon={<UploadFileIcon />}
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {busy ? t("loading") : "Choose sermon photo(s)"}
            </GlassyButton>
            <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.65 }}>
              John will OCR the photos with Tesseract and turn them into structured sermon notes.
            </Typography>
          </>
        ) : (
          <Stack spacing={2}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your past sermon transcript or notes here…"
              rows={8}
              style={{ width: "100%", padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.05)", color: "inherit", border: "1px solid rgba(255,255,255,0.15)", fontFamily: "inherit", fontSize: 14, resize: "vertical" }}
            />
            <GlassyButton variant="contained" onClick={handleText} disabled={!text.trim() || busy}>
              {busy ? t("loading") : "Convert to sermon notes"}
            </GlassyButton>
          </Stack>
        )}

        {(busy || status) && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 2 }} />
            <Typography variant="caption" sx={{ mt: 1, display: "block", opacity: 0.7 }}>{status}</Typography>
          </Box>
        )}
      </AnimatedCard>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Archive</Typography>
      <Stack spacing={1.5}>
        <AnimatePresence>
          {list.map((p) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AnimatedCard sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                {p.source?.startsWith("data:image") && <img src={p.source} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }} />}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{p.title}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Chip label={p.date} size="small" />
                    {p.linkedNoteId && <Chip label="Linked to note" size="small" color="primary" variant="outlined" />}
                  </Stack>
                </Box>
                <IconButton color="error" onClick={async () => { await PastSermonsStore.remove(p.id); reload(); }}><DeleteIcon /></IconButton>
              </AnimatedCard>
            </motion.div>
          ))}
        </AnimatePresence>
        {list.length === 0 && (
          <AnimatedCard sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>{t("noItems")}</Typography>
          </AnimatedCard>
        )}
      </Stack>
    </Box>
  );
}

function readAsDataURL(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}
