import { getSettings } from "../db";

// Bible fetcher — KJV English via bible-api.com + configurable NIV via api.bible + bundled full BSI Telugu Bible (66 books, 1189 chapters, 31102 verses) served from /public/bible-te.json (works offline).

export interface BibleVersion {
  id: string;
  label: string;
  language: "en" | "te";
  source: "bundled-kjv" | "bible-api" | "api-bible" | "custom" | "bundled-te";
}

export interface BibleVerse {
  book: string; chapter: number; verse: number; text: string;
  reference: string; versionId: string;
}

export interface BibleChapter {
  book: string; chapter: number;
  verses: { verse: number; text: string }[];
  reference: string; versionId: string;
}

export const DEFAULT_VERSIONS: BibleVersion[] = [
  { id: "en-kjv", label: "English — KJV", language: "en", source: "bundled-kjv" },
  { id: "en-niv", label: "English — NIV", language: "en", source: "api-bible" },
  { id: "te-bsi", label: "తెలుగు — BSI", language: "te", source: "bundled-te" }
];

// ---------- KJV via bible-api.com ----------
async function fetchKJV(reference: string): Promise<BibleChapter> {
  const r = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`);
  if (!r.ok) throw new Error(`Bible API ${r.status}`);
  const j = await r.json();
  return {
    book: j.book_name, chapter: Number(j.chapter),
    reference: j.reference,
    versionId: "en-kjv",
    verses: (j.verses ?? []).map((v: any) => ({
      verse: Number(v.verse), text: String(v.text).replace(/[\u201C\u201D]/g, '"')
    }))
  };
}

// ---------- NIV via api.bible (user-supplied key) ----------
async function fetchNIV(reference: string): Promise<BibleChapter> {
  const s = await getSettings();
  if (!s.nivKey || !s.nivBibleId) throw new Error("NIV not configured. Add your api.bible key in Settings.");
  const m = reference.match(/^(.+?)\s+(\d+)(?::(\d+))?/);
  if (!m) throw new Error("Bad reference");
  const [, book, chapter] = m;
  const path = `${encodeURIComponent(book)}+${chapter}?content-type=text&include-notes=false&include-titles=true&include-chapter-numbers=false`;
  const r = await fetch(`https://api.bible/v1/bibles/${s.nivBibleId}/chapters/${path}`, {
    headers: { "api-key": s.nivKey }
  });
  if (!r.ok) throw new Error(`api.bible ${r.status}`);
  const j = await r.json();
  const html: string = j?.data?.content ?? "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { book, chapter: Number(chapter), reference: `${book} ${chapter}`, versionId: "en-niv", verses: [{ verse: 1, text }] };
}

// ---------- Bundled BSI Telugu (lazy-loaded on first te-bsi access) ----------
interface BundledBook {
  english: string;
  telugu: string;
  chapters: { chapter: number; verses: { verse: number; text: string }[] }[];
}
interface BundledBible { version: number; source: string; books: BundledBook[] }

let bibleTeCache: BundledBible | null = null;
async function loadBundledTE(): Promise<BundledBible> {
  if (bibleTeCache) return bibleTeCache;
  const r = await fetch(`${import.meta.env.BASE_URL}bible-te.json`);
  if (!r.ok) throw new Error(`Bundled Telugu Bible missing (HTTP ${r.status}). Re-run setup to restore it.`);
  bibleTeCache = await r.json();
  return bibleTeCache!;
}

// English → canonical book name lookup (matches aruljohn/Bible-telugu English names).
// The pastor can type any common variant — we normalize to the bundled book key.
const BOOK_ALIASES: Record<string, string> = {
  "gen": "Genesis", "genesis": "Genesis",
  "ex": "Exodus", "exod": "Exodus", "exodus": "Exodus",
  "lev": "Leviticus", "leviticus": "Leviticus",
  "num": "Numbers", "numbers": "Numbers",
  "deut": "Deuteronomy", "dt": "Deuteronomy", "deuteronomy": "Deuteronomy",
  "josh": "Joshua", "joshua": "Joshua",
  "judges": "Judges", "judg": "Judges", "jdg": "Judges",
  "ruth": "Ruth", "rut": "Ruth",
  "1 sam": "1 Samuel", "1sam": "1 Samuel", "1 samuel": "1 Samuel", "i samuel": "1 Samuel", "first samuel": "1 Samuel",
  "2 sam": "2 Samuel", "2sam": "2 Samuel", "2 samuel": "2 Samuel", "ii samuel": "2 Samuel", "second samuel": "2 Samuel",
  "1 kings": "1 Kings", "1kgs": "1 Kings", "i kings": "1 Kings", "first kings": "1 Kings",
  "2 kings": "2 Kings", "2kgs": "2 Kings", "ii kings": "2 Kings", "second kings": "2 Kings",
  "1 chr": "1 Chronicles", "1 chronicles": "1 Chronicles", "i chronicles": "1 Chronicles", "first chronicles": "1 Chronicles",
  "2 chr": "2 Chronicles", "2 chronicles": "2 Chronicles", "ii chronicles": "2 Chronicles", "second chronicles": "2 Chronicles",
  "ezra": "Ezra",
  "neh": "Nehemiah", "nehemiah": "Nehemiah",
  "est": "Esther", "esther": "Esther",
  "job": "Job",
  "ps": "Psalms", "psa": "Psalms", "psalm": "Psalms", "psalms": "Psalms",
  "prov": "Proverbs", "proverbs": "Proverbs", "prv": "Proverbs",
  "eccl": "Ecclesiastes", "ecclesiastes": "Ecclesiastes", "ecc": "Ecclesiastes", "qoh": "Ecclesiastes",
  "song": "Song of Songs", "song of songs": "Song of Songs", "songs": "Song of Songs", "sos": "Song of Songs",
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
  "matt": "Matthew", "matthew": "Matthew", "mt": "Matthew",
  "mark": "Mark", "mk": "Mark", "mr": "Mark",
  "luke": "Luke", "lk": "Luke",
  "john": "John", "jn": "John", "jhn": "John",
  "acts": "Acts", "act": "Acts",
  "rom": "Romans", "romans": "Romans",
  "1 cor": "1 Corinthians", "1 corinthians": "1 Corinthians", "i corinthians": "1 Corinthians", "first corinthians": "1 Corinthians",
  "2 cor": "2 Corinthians", "2 corinthians": "2 Corinthians", "ii corinthians": "2 Corinthians", "second corinthians": "2 Corinthians",
  "gal": "Galatians", "galatians": "Galatians",
  "eph": "Ephesians", "ephesians": "Ephesians",
  "phil": "Philippians", "philippians": "Philippians", "php": "Philippians",
  "col": "Colossians", "colossians": "Colossians",
  "1 thess": "1 Thessalonians", "1 thessalonians": "1 Thessalonians", "i thessalonians": "1 Thessalonians", "first thessalonians": "1 Thessalonians",
  "2 thess": "2 Thessalonians", "2 thessalonians": "2 Thessalonians", "ii thessalonians": "2 Thessalonians", "second thessalonians": "2 Thessalonians",
  "1 tim": "1 Timothy", "1 timothy": "1 Timothy", "i timothy": "1 Timothy", "first timothy": "1 Timothy",
  "2 tim": "2 Timothy", "2 timothy": "2 Timothy", "ii timothy": "2 Timothy", "second timothy": "2 Timothy",
  "titus": "Titus", "tit": "Titus",
  "phlm": "Philemon", "philemon": "Philemon", "philem": "Philemon",
  "heb": "Hebrews", "hebrews": "Hebrews",
  "james": "James", "jas": "James",
  "1 pet": "1 Peter", "1 peter": "1 Peter", "i peter": "1 Peter", "first peter": "1 Peter",
  "2 pet": "2 Peter", "2 peter": "2 Peter", "ii peter": "2 Peter", "second peter": "2 Peter",
  "1 john": "1 John", "1jn": "1 John", "1 jn": "1 John", "i john": "1 John", "first john": "1 John",
  "2 john": "2 John", "2jn": "2 John", "2 jn": "2 John", "ii john": "2 John", "second john": "2 John",
  "3 john": "3 John", "3jn": "3 John", "3 jn": "3 John", "iii john": "3 John", "third john": "3 John",
  "jude": "Jude", "jud": "Jude",
  "rev": "Revelation", "revelation": "Revelation", "apocalypse": "Revelation"
};

function parseReference(ref: string): { bookEn: string; chapter: number } | null {
  // Accepts "John 3:16", "John 3", "1 Cor 13", "1 Corinthians 13", "Song of Songs 2", "Psalm 23".
  const trimmed = ref.trim();
  // Try to match "Book <num>[:<num>]" — find the last space-separated token that's numeric.
  const m = trimmed.match(/^(.+?)\s+(\d+)(?::\d+(?:[-–]\d+)?)?$/);
  if (!m) return null;
  const rawBook = m[1].trim();
  const chapter = Number(m[2]);
  const key = rawBook.toLowerCase().replace(/\s+/g, " ");
  const bookEn = BOOK_ALIASES[key] ?? BOOK_ALIASES[rawBook] ?? rawBook;
  return { bookEn, chapter };
}

async function fetchBSI(reference: string): Promise<BibleChapter> {
  // User-configurable URL takes precedence (lets the user override with a different source).
  const s = await getSettings();
  if (s.bsiTeluguUrl) {
    try {
      const url = s.bsiTeluguUrl.replace("{ref}", encodeURIComponent(reference));
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j.verses)) {
          return { book: j.book ?? reference.split(" ")[0], chapter: j.chapter ?? Number(reference.split(" ")[1] ?? 1), versionId: "te-bsi", reference, verses: j.verses.map((v: any) => ({ verse: Number(v.verse), text: String(v.text) })) };
        }
        if (j?.data?.content) {
          const text = String(j.data.content).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          return { book: reference.split(" ")[0], chapter: 1, versionId: "te-bsi", reference, verses: [{ verse: 1, text }] };
        }
      }
    } catch { /* fall through to bundled */ }
  }

  // Default: bundled full BSI Telugu Bible (66 books, all chapters/verses).
  const parsed = parseReference(reference);
  if (!parsed) throw new Error("Could not parse reference. Try e.g. 'John 1' or '1 Corinthians 13'.");
  const bundled = await loadBundledTE();
  const book = bundled.books.find((b) => b.english.toLowerCase() === parsed.bookEn.toLowerCase());
  if (!book) throw new Error(`Book "${parsed.bookEn}" not found in the bundled Telugu Bible.`);
  const ch = book.chapters.find((c) => c.chapter === parsed.chapter);
  if (!ch) throw new Error(`${book.english} has no chapter ${parsed.chapter}.`);
  return {
    book: book.telugu,
    chapter: parsed.chapter,
    versionId: "te-bsi",
    reference: `${book.telugu} ${parsed.chapter}`,
    verses: ch.verses
  };
}

export async function fetchChapter(reference: string, versionId: string): Promise<BibleChapter> {
  const v = DEFAULT_VERSIONS.find((x) => x.id === versionId) ?? DEFAULT_VERSIONS[0];
  if (v.id === "en-kjv") return fetchKJV(reference);
  if (v.id === "en-niv") return fetchNIV(reference);
  if (v.id === "te-bsi") return fetchBSI(reference);
  throw new Error("Unknown version");
}

// ---------- Verse of the day ----------
const VOTD = [
  { ref: "John 3:16", text: "For God so loved the world that he gave his one and only Son…" },
  { ref: "Philippians 4:13", text: "I can do all this through him who gives me strength." },
  { ref: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing." },
  { ref: "Proverbs 3:5–6", text: "Trust in the Lord with all your heart and lean not on your own understanding." },
  { ref: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God." },
  { ref: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him." },
  { ref: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." }
];
export function verseOfTheDay(): { ref: string; text: string } {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return VOTD[day % VOTD.length];
}
