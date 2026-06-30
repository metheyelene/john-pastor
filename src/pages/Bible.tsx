import { Box, Stack, TextField, Typography, MenuItem, Chip, CircularProgress, Select, ToggleButton, ToggleButtonGroup, Switch, FormControlLabel } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { fetchChapter, DEFAULT_VERSIONS, verseOfTheDay, type BibleChapter } from "../bible";
import { useTranslation } from "react-i18next";

const EN_HINTS = [
  "Genesis 1", "Exodus 3", "Psalm 23", "Proverbs 3",
  "Isaiah 53", "Matthew 5", "Matthew 6", "John 1", "John 3",
  "Romans 8", "1 Corinthians 13", "Ephesians 2", "Philippians 4",
  "Revelation 22"
];
const TE_HINTS = [
  "ఆదికాండము 1", "కీర్తనలు 23", "సామెతలు 3", "యెషయా 53",
  "మత్తయి 5", "మత్తయి 6", "యోహాను 1", "యోహాను 3",
  "రోమీయులకు 8", "1 కొరింథీయులకు 13", "ఎఫెసీయులకు 2", "ఫిలిప్పీయులకు 4",
  "ప్రకటన గ్రంథము 22"
];

// Parses "John 3", "1 Corinthians 13", "Song of Songs 2" etc. Returns null on garbage.
function parseReference(ref: string): { book: string; chapter: number } | null {
  const trimmed = ref.trim();
  const m = trimmed.match(/^(.+?)\s+(\d+)$/);
  if (!m) return null;
  return { book: m[1].trim(), chapter: Number(m[2]) };
}

// Canonical EN book name → matches the 'english' field in bible-te.json
const BOOK_ALIASES: Record<string, string> = {
  "gen": "Genesis", "genesis": "Genesis",
  "ex": "Exodus", "exod": "Exodus", "exodus": "Exodus",
  "lev": "Leviticus", "leviticus": "Leviticus",
  "num": "Numbers", "numbers": "Numbers",
  "deut": "Deuteronomy", "dt": "Deuteronomy", "deuteronomy": "Deuteronomy",
  "josh": "Joshua", "joshua": "Joshua",
  "judges": "Judges", "judg": "Judges", "jdg": "Judges",
  "ruth": "Ruth", "rut": "Ruth",
  "1 sam": "1 Samuel", "1sam": "1 Samuel", "1 samuel": "1 Samuel",
  "2 sam": "2 Samuel", "2 samuel": "2 Samuel",
  "1 kings": "1 Kings", "1kgs": "1 Kings",
  "2 kings": "2 Kings", "2kgs": "2 Kings",
  "1 chr": "1 Chronicles", "1 chronicles": "1 Chronicles",
  "2 chr": "2 Chronicles", "2 chronicles": "2 Chronicles",
  "ezra": "Ezra",
  "neh": "Nehemiah", "nehemiah": "Nehemiah",
  "est": "Esther", "esther": "Esther",
  "job": "Job",
  "ps": "Psalms", "psa": "Psalms", "psalm": "Psalms", "psalms": "Psalms",
  "prov": "Proverbs", "proverbs": "Proverbs",
  "eccl": "Ecclesiastes", "ecclesiastes": "Ecclesiastes",
  "song": "Song of Songs", "song of songs": "Song of Songs",
  "isa": "Isaiah", "isaiah": "Isaiah",
  "jer": "Jeremiah", "jeremiah": "Jeremiah",
  "lam": "Lamentations", "lamentations": "Lamentations",
  "ezek": "Ezekiel", "ezekiel": "Ezekiel",
  "dan": "Daniel", "daniel": "Daniel",
  "hos": "Hosea", "hosea": "Hosea",
  "joel": "Joel",
  "amos": "Amos",
  "obad": "Obadiah", "obadiah": "Obadiah",
  "jonah": "Jonah",
  "mic": "Micah", "micah": "Micah",
  "nah": "Nahum", "nahum": "Nahum",
  "hab": "Habakkuk", "habakkuk": "Habakkuk",
  "zeph": "Zephaniah", "zephaniah": "Zephaniah",
  "hag": "Haggai", "haggai": "Haggai",
  "zech": "Zechariah", "zechariah": "Zechariah",
  "mal": "Malachi", "malachi": "Malachi",
  "matt": "Matthew", "matthew": "Matthew",
  "mark": "Mark",
  "luke": "Luke",
  "john": "John", "jn": "John",
  "acts": "Acts",
  "rom": "Romans", "romans": "Romans",
  "1 cor": "1 Corinthians", "1 corinthians": "1 Corinthians",
  "2 cor": "2 Corinthians", "2 corinthians": "2 Corinthians",
  "gal": "Galatians", "galatians": "Galatians",
  "eph": "Ephesians", "ephesians": "Ephesians",
  "phil": "Philippians", "philippians": "Philippians",
  "col": "Colossians", "colossians": "Colossians",
  "1 thess": "1 Thessalonians", "1 thessalonians": "1 Thessalonians",
  "2 thess": "2 Thessalonians", "2 thessalonians": "2 Thessalonians",
  "1 tim": "1 Timothy", "1 timothy": "1 Timothy",
  "2 tim": "2 Timothy", "2 timothy": "2 Timothy",
  "titus": "Titus",
  "phlm": "Philemon", "philemon": "Philemon",
  "heb": "Hebrews", "hebrews": "Hebrews",
  "james": "James",
  "1 pet": "1 Peter", "1 peter": "1 Peter",
  "2 pet": "2 Peter", "2 peter": "2 Peter",
  "1 john": "1 John",
  "2 john": "2 John",
  "3 john": "3 John",
  "jude": "Jude",
  "rev": "Revelation", "revelation": "Revelation"
};

function resolveBookName(input: string): string | null {
  const k = input.toLowerCase().replace(/\s+/g, " ").trim();
  return BOOK_ALIASES[k] ?? BOOK_ALIASES[input.trim()] ?? null;
}

// Shape of bible-te.json (stripped to what we need here).
interface BundledBook { english: string; telugu: string; chapters: { chapter: number; verses: { verse: number; text: string }[] }[] }
interface BundledBible { version: number; source: string; books: BundledBook[] }

export default function BiblePage() {
  const { t } = useTranslation();
  const [versionId, setVersionId] = useState("en-kjv");
  const [bookEn, setBookEn] = useState("John");
  const [chapter, setChapter] = useState(1);
  const [verse, setVerse] = useState(1);
  const [data, setData] = useState<BibleChapter | null>(null);
  const [sideBySide, setSideBySide] = useState(true);
  const [teData, setTeData] = useState<BibleChapter | null>(null);
  const [bundled, setBundled] = useState<BundledBible | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const votd = verseOfTheDay();

  // Load bundled Telugu Bible once
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}bible-te.json`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setBundled(d))
      .catch(() => setBundled(null));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("john:bookmarks");
    if (saved) setBookmarks(JSON.parse(saved));
  }, []);
  const persistBookmarks = (b: string[]) => { setBookmarks(b); localStorage.setItem("john:bookmarks", JSON.stringify(b)); };

  // Available books (canonical EN names from bundled) + fallback to a hardcoded list
  const bookOptions = useMemo(() => {
    if (bundled?.books?.length) return bundled.books.map((b) => b.english).sort((a, b) => a.localeCompare(b));
    return Object.values(BOOK_ALIASES).filter((v, i, a) => a.indexOf(v) === i).sort();
  }, [bundled]);

  const currentBook = bundled?.books?.find((b) => b.english.toLowerCase() === bookEn.toLowerCase());
  const chapterCount = currentBook?.chapters?.length ?? 0;
  const verseCount = currentBook?.chapters?.find((c) => c.chapter === chapter)?.verses.length ?? 0;

  // Side-by-side: try to find the matching TE chapter in bundled data
  useEffect(() => {
    if (!sideBySide || !bundled || !currentBook || versionId === "te-bsi") { setTeData(null); return; }
    const teCh = currentBook.chapters.find((c) => c.chapter === chapter);
    if (!teCh) { setTeData(null); return; }
    setTeData({
      book: currentBook.telugu,
      chapter,
      versionId: "te-bsi",
      reference: `${currentBook.telugu} ${chapter}`,
      verses: teCh.verses.map((v) => ({ verse: v.verse, text: v.text }))
    });
  }, [sideBySide, bundled, currentBook, chapter, versionId]);

  const go = async (overrideBook?: string, overrideChapter?: number, overrideVerse?: number) => {
    const b = overrideBook ?? bookEn;
    const c = overrideChapter ?? chapter;
    const v = overrideVerse ?? 1;
    setBookEn(b); setChapter(c); setVerse(v);
    setLoading(true); setErr(null); setData(null);
    const ref = `${b} ${c}`;
    try {
      const ch = await fetchChapter(ref, versionId);
      setData(ch);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const isBookmarked = bookmarks.includes(`${versionId}|${bookEn}|${chapter}|${verse}`);
  const toggleBookmark = () => {
    const k = `${versionId}|${bookEn}|${chapter}|${verse}`;
    persistBookmarks(isBookmarked ? bookmarks.filter((b) => b !== k) : [...bookmarks, k]);
  };

  const hints = versionId === "te-bsi" ? TE_HINTS : EN_HINTS;
  const showTE = sideBySide && versionId !== "te-bsi" && teData;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{t("bible")}</Typography>
      <Typography variant="caption" sx={{ display: "block", opacity: 0.65, mb: 2 }}>
        Tap a verse number to bookmark it · Use Book / Chapter / Verse to jump anywhere
      </Typography>

      <AnimatedCard sx={{ p: 2, mb: 2, background: "linear-gradient(135deg, rgba(255,183,77,0.15), rgba(236,64,122,0.15))" }}>
        <Typography variant="overline" sx={{ color: "#ffb74d", letterSpacing: 2 }}>{t("todayVerse")}</Typography>
        <Typography variant="h6" sx={{ mt: 1, fontStyle: "italic" }}>"{votd.text}"</Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>— {votd.ref}</Typography>
      </AnimatedCard>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }} alignItems={{ md: "center" }}>
        <TextField select label="Version" value={versionId} onChange={(e) => setVersionId(e.target.value)} sx={{ minWidth: 200, flexShrink: 0 }}>
          {DEFAULT_VERSIONS.map((v) => <MenuItem key={v.id} value={v.id}>{v.label}</MenuItem>)}
        </TextField>
        <Select displayEmpty value={bookEn} onChange={(e) => { setBookEn(e.target.value as string); setChapter(1); setVerse(1); }} sx={{ minWidth: 180, flex: 1 }}>
          {bookOptions.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
        </Select>
        <Select value={chapter} onChange={(e) => { setChapter(Number(e.target.value)); setVerse(1); }} sx={{ minWidth: 110 }}>
          {Array.from({ length: Math.max(chapterCount, 1) }, (_, i) => i + 1).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
        <Select value={verse} onChange={(e) => setVerse(Number(e.target.value))} sx={{ minWidth: 100 }}>
          {Array.from({ length: Math.max(verseCount, 1) }, (_, i) => i + 1).map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
        </Select>
        <GlassyButton variant="contained" startIcon={<SearchIcon />} onClick={() => go()} disabled={loading}>
          {loading ? t("loading") : t("open")}
        </GlassyButton>
      </Stack>

      <Stack direction="row" alignItems="center" sx={{ mb: 2, gap: 1, flexWrap: "wrap" }}>
        <FormControlLabel
          control={<Switch size="small" checked={sideBySide} onChange={(e) => setSideBySide(e.target.checked)} />}
          label={<Typography variant="body2" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}><ViewColumnIcon fontSize="small" />Side-by-side (EN + TE)</Typography>}
        />
        <Typography variant="caption" sx={{ opacity: 0.55 }}>
          {showTE ? "Showing English + తెలుగు" : sideBySide ? "Telugu chapter not available for this book" : "Single-column mode"}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}>
        {hints.map((h) => {
          const parsed = parseReference(h);
          const bookOk = parsed && resolveBookName(parsed.book) !== null;
          return (
            <Chip key={h} label={h} size="small" onClick={() => {
              if (!bookOk) return;
              const canonical = resolveBookName(parsed!.book)!;
              go(canonical, parsed!.chapter, 1);
            }} sx={{ cursor: bookOk ? "pointer" : "default", opacity: bookOk ? 1 : 0.5 }} variant="outlined" />
          );
        })}
      </Stack>

      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>}
      {err && <AnimatedCard sx={{ p: 3, mb: 3 }}><Typography color="error">{err}</Typography></AnimatedCard>}

      {data && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <AnimatedCard sx={{ p: { xs: 3, md: 5 } }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="overline" sx={{ color: "#ffb74d", letterSpacing: 2 }}>
                  {versionId === "te-bsi" ? "తెలుగు" : "English — KJV"}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: "1.6rem", md: "2.2rem" } }}>
                  {data.reference}
                </Typography>
              </Box>
              <GlassyButton onClick={toggleBookmark} startIcon={isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}>
                {isBookmarked ? "Saved" : "Bookmark"}
              </GlassyButton>
            </Stack>

            {showTE ? (
              <Box sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3
              }}>
                {/* EN column */}
                <Box>
                  <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: 2, fontWeight: 700 }}>English</Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {data.verses.map((v) => (
                      <Typography
                        key={v.verse}
                        variant="body1"
                        onClick={() => setVerse(v.verse)}
                        sx={{
                          lineHeight: 1.85, fontSize: { xs: "0.95rem", md: "1.0rem" },
                          cursor: "pointer", pl: 1,
                          borderLeft: v.verse === verse ? "3px solid" : "3px solid transparent",
                          borderColor: v.verse === verse ? "primary.main" : "transparent",
                          bgcolor: v.verse === verse ? "rgba(239,68,68,0.06)" : "transparent",
                          borderRadius: 1, py: 0.5,
                          transition: "background-color 120ms ease"
                        }}
                      >
                        <Box component="span" sx={{ color: "#ffb74d", fontWeight: 700, mr: 1 }}>{v.verse}</Box>
                        {v.text}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
                {/* TE column */}
                <Box>
                  <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: 2, fontWeight: 700 }}>తెలుగు (BSI)</Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {(teData?.verses ?? []).map((v) => (
                      <Typography
                        key={v.verse}
                        variant="body1"
                        onClick={() => setVerse(v.verse)}
                        sx={{
                          lineHeight: 1.85, fontSize: { xs: "1.0rem", md: "1.1rem" },
                          cursor: "pointer", pl: 1,
                          borderLeft: v.verse === verse ? "3px solid" : "3px solid transparent",
                          borderColor: v.verse === verse ? "primary.main" : "transparent",
                          bgcolor: v.verse === verse ? "rgba(239,68,68,0.06)" : "transparent",
                          borderRadius: 1, py: 0.5,
                          transition: "background-color 120ms ease"
                        }}
                      >
                        <Box component="span" sx={{ color: "#ffb74d", fontWeight: 700, mr: 1 }}>{v.verse}</Box>
                        {v.text}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {data.verses.map((v) => (
                  <Typography
                    key={v.verse}
                    variant="body1"
                    onClick={() => setVerse(v.verse)}
                    sx={{
                      lineHeight: 1.85, fontSize: { xs: "1rem", md: "1.05rem" },
                      cursor: "pointer", pl: 1,
                      borderLeft: v.verse === verse ? "3px solid" : "3px solid transparent",
                      borderColor: v.verse === verse ? "primary.main" : "transparent",
                      bgcolor: v.verse === verse ? "rgba(239,68,68,0.06)" : "transparent",
                      borderRadius: 1, py: 0.5,
                      transition: "background-color 120ms ease"
                    }}
                  >
                    <Box component="span" sx={{ color: "#ffb74d", fontWeight: 700, mr: 1 }}>{v.verse}</Box>
                    {v.text}
                  </Typography>
                ))}
              </Stack>
            )}
          </AnimatedCard>
        </motion.div>
      )}

      {bookmarks.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Bookmarks</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {bookmarks.map((b) => {
              const [ver, bk, ch, vr] = b.split("|");
              const vv = DEFAULT_VERSIONS.find((x) => x.id === ver);
              return <Chip key={b} label={`${vv?.label?.split(" — ")[1] ?? vv?.label} · ${bk} ${ch}:${vr}`} onClick={() => { setVersionId(ver); setBookEn(bk); setChapter(Number(ch)); setVerse(Number(vr)); go(bk, Number(ch), Number(vr)); }} />;
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
