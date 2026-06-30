import { Box, Stack, TextField, Typography, MenuItem, Chip, CircularProgress } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { fetchChapter, DEFAULT_VERSIONS, verseOfTheDay, type BibleChapter, type BibleVersion } from "../bible";
import { useTranslation } from "react-i18next";

const EN_HINTS = [
  "Genesis 1", "Exodus 3", "Psalm 23", "Proverbs 3",
  "Isaiah 53", "Matthew 5", "Matthew 6", "John 1", "John 3",
  "Romans 8", "1 Corinthians 13", "Ephesians 2", "Philippians 4",
  "Revelation 22"
];
// When the pastor switches to the Telugu Bible, the quick-picks still use English
// references (the alias map resolves them). Showing Telugu book names makes it feel native.
const TE_HINTS = [
  "ఆదికాండము 1", "కీర్తనలు 23", "సామెతలు 3", "యెషయా 53",
  "మత్తయి 5", "మత్తయి 6", "యోహాను 1", "యోహాను 3",
  "రోమీయులకు 8", "1 కొరింథీయులకు 13", "ఎఫెసీయులకు 2", "ఫిలిప్పీయులకు 4",
  "ప్రకటన గ్రంథము 22"
];

export default function BiblePage() {
  const { t } = useTranslation();
  const [versionId, setVersionId] = useState("en-kjv");
  const [ref, setRef] = useState("John 1");
  const [chapter, setChapter] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const votd = verseOfTheDay();

  useEffect(() => {
    const saved = localStorage.getItem("john:bookmarks");
    if (saved) setBookmarks(JSON.parse(saved));
  }, []);
  const persistBookmarks = (b: string[]) => { setBookmarks(b); localStorage.setItem("john:bookmarks", JSON.stringify(b)); };

  const go = async (r?: string) => {
    const use = r ?? ref;
    if (r) setRef(r);
    setLoading(true); setErr(null); setChapter(null);
    try { setChapter(await fetchChapter(use, versionId)); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { go("John 1"); /* eslint-disable-next-line */ }, [versionId]);

  const v: BibleVersion = DEFAULT_VERSIONS.find((x) => x.id === versionId) ?? DEFAULT_VERSIONS[0];
  const isTelugu = v.language === "te";
  const isBookmarked = bookmarks.includes(`${versionId}|${ref}`);
  const toggleBookmark = () => {
    const k = `${versionId}|${ref}`;
    persistBookmarks(isBookmarked ? bookmarks.filter((b) => b !== k) : [...bookmarks, k]);
  };

  const hints = isTelugu ? TE_HINTS : EN_HINTS;
  const refPlaceholder = isTelugu
    ? "ఉదా: యోహాను 3  —  English: John 3"
    : "e.g. John 3  —  తెలుగు: యోహాను 3";

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>{t("bible")}</Typography>

      <AnimatedCard sx={{ p: 2, mb: 3, background: "linear-gradient(135deg, rgba(255,183,77,0.15), rgba(236,64,122,0.15))" }}>
        <Typography variant="overline" sx={{ color: "#ffb74d", letterSpacing: 2 }}>{t("todayVerse")}</Typography>
        <Typography variant="h6" sx={{ mt: 1, fontStyle: "italic" }}>"{votd.text}"</Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>— {votd.ref}</Typography>
      </AnimatedCard>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select label="Version" value={versionId} onChange={(e) => setVersionId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {DEFAULT_VERSIONS.map((vv) => <MenuItem key={vv.id} value={vv.id}>{vv.label}</MenuItem>)}
        </TextField>
        <TextField
          label="Reference" value={ref} onChange={(e) => setRef(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") go(); }}
          placeholder={refPlaceholder}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.6 }} /> }}
          inputProps={{ style: isTelugu ? { fontSize: "1.05rem" } : undefined }}
          sx={{ flex: 1 }}
        />
        <GlassyButton variant="contained" onClick={() => go()} disabled={loading}>{loading ? t("loading") : t("open")}</GlassyButton>
      </Stack>

      {isTelugu && (
        <Typography variant="caption" sx={{ display: "block", opacity: 0.7, mb: 1.5 }}>
          You can type the reference in English (e.g. "John 3") or in Telugu (e.g. "యోహాను 3"). Both work.
        </Typography>
      )}

      <Typography variant="overline" sx={{ color: "#ffb74d", letterSpacing: 2, display: "block", mb: 1 }}>
        {isTelugu ? "త్వరిత ఎంపికలు" : "Quick picks"}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}>
        {hints.map((b) => (
          <Chip key={b} label={b} size="small" onClick={() => go(b)} sx={{ cursor: "pointer" }} variant="outlined" />
        ))}
      </Stack>

      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>}
      {err && <AnimatedCard sx={{ p: 3, mb: 3 }}><Typography color="error">{err}</Typography></AnimatedCard>}

      {chapter && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <AnimatedCard sx={{ p: { xs: 3, md: 5 } }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" sx={{ color: "#ffb74d", letterSpacing: 2 }}>{v.label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "1.6rem", md: "2.2rem" } }}>
                  {chapter.reference}
                </Typography>
              </Box>
              <GlassyButton onClick={toggleBookmark} startIcon={isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}>
                {isBookmarked ? "Saved" : "Bookmark"}
              </GlassyButton>
            </Stack>
            <Stack spacing={1.5}>
              {chapter.verses.map((vv) => (
                <Typography key={vv.verse} variant="body1" sx={{
                  lineHeight: 1.85,
                  fontSize: { xs: isTelugu ? "1.1rem" : "1rem", md: isTelugu ? "1.25rem" : "1.05rem" }
                }}>
                  <Box component="span" sx={{ color: "#ffb74d", fontWeight: 700, mr: 1 }}>{vv.verse}</Box>
                  {vv.text}
                </Typography>
              ))}
            </Stack>
          </AnimatedCard>
        </motion.div>
      )}

      {bookmarks.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Bookmarks</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {bookmarks.map((b) => {
              const [ver, r] = b.split("|");
              const vv = DEFAULT_VERSIONS.find((x) => x.id === ver);
              return <Chip key={b} label={`${vv?.label?.split(" — ")[1] ?? vv?.label} · ${r}`} onClick={() => { setVersionId(ver); setRef(r); go(r); }} />;
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
