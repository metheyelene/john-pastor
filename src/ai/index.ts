import { getSettings } from "../db";

// AI helper — tries OpenAI-compatible chat completions, then Pollinations.ai (truly free, no key),
// then falls back to a structured stub so the feature is always useful.

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Per-request seed. Default: stable hash of the prompt so identical inputs give identical outputs (deterministic across reloads); callers can pass Math.random() for fresh variation. */
  seed?: number;
  /** When set, chat() prepends a language instruction so the model replies in the chosen language. */
  language?: "en" | "te" | "mixed";
}

function languageDirective(language: "en" | "te" | "mixed"): string {
  return language === "te"
    ? "IMPORTANT: Reply ENTIRELY in Telugu (తెలుగు). Scripture references should stay in canonical English format (e.g. 'John 3:16') so they're searchable, but all explanations, commentary, and narrative MUST be in Telugu."
    : language === "mixed"
    ? "IMPORTANT: Use bilingual output. Scripture references in canonical English (e.g. 'John 3:16'). Section headers and short labels in English. Explanations, illustrations, and longer prose in Telugu (తెలుగు)."
    : "IMPORTANT: Reply in clear, natural English.";
}

export function hashStringSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function hashString(s: string): number { return hashStringSeed(s); }

// Pollinations.ai — public, no-key, no-signup text endpoint. Best free AI for pastors on a budget.
// https://github.com/pollinations/pollinations — model 'openai-fast' is OpenAI-grade quality.
async function pollinationsChat(messages: ChatMessage[], seed: number): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content;
  const userText = messages.filter((m) => m.role !== "system").map((m) => m.content).join("\n\n");
  const prompt = system ? `${system}\n\n${userText}` : userText;
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai-fast&seed=${seed}`;
  try {
    const res = await fetch(url, { headers: { Accept: "text/plain" } });
    if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
    const text = (await res.text()).trim();
    return text || stubReply(messages);
  } catch (e) {
    return stubReply(messages) + `\n\n_(Pollinations error: ${(e as Error).message}. Showing offline stub.)_`;
  }
}

export async function chat({ messages, temperature = 0.75, maxTokens = 800, seed, language }: ChatOptions): Promise<string> {
  // Default to a stable hash of the prompt so re-running the same sermon title is deterministic
  // (caller can pass an explicit seed for variety, e.g. chat re-rolls).
  const effectiveSeed = seed ?? hashStringSeed(messages.map((m) => m.content).join("|") + `|t=${temperature}` + (language ? `|l=${language}` : ""));
  // If a language hint is set, prepend a directive to the system message (or add one if absent).
  const enrichedMessages: ChatMessage[] = language
    ? [
        { role: "system", content: languageDirective(language) },
        ...messages.filter((m) => m.role !== "system"),
        ...(messages.some((m) => m.role === "system") ? [{ role: "system" as const, content: messages.find((m) => m.role === "system")!.content }] : [])
      ]
    : messages;
  const s = await getSettings();
  // Path 1: user-configured OpenAI-compatible provider.
  if (s.aiProvider && s.aiApiKey) {
    try {
      const res = await fetch(s.aiProvider.replace(/\/$/, "") + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.aiApiKey}` },
        body: JSON.stringify({
          model: s.aiModel || "gpt-4o-mini",
          messages: enrichedMessages, temperature, max_tokens: maxTokens, seed: effectiveSeed,
          stream: false
        })
      });
      if (!res.ok) throw new Error(`AI ${res.status}`);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch { /* fall through to Pollinations */ }
  }
  // Path 2: free Pollinations.ai fallback (no key, no signup).
  return pollinationsChat(enrichedMessages, effectiveSeed);
}

// ---------- Sermon outline ----------
export type OutlineVariant = "short" | "medium" | "long";
export type MinutesPreset = 5 | 10 | 15 | 30 | 45 | 60;
export type OutlineLanguage = "en" | "te" | "mixed";

const VARIANT_WORDS: Record<OutlineVariant, number> = { short: 280, medium: 700, long: 1500 };

export interface OutlinePoint { title: string; scripture: string; content: string; illustration: string }
export interface OutlineData {
  bigIdea: string;
  points: OutlinePoint[];
  application: string;
  closingPrayer: string;
}

const STRUCTURED_FORMAT_INSTRUCTION = `Reply with EXACTLY this structure (no extra prose, no commentary, no preamble):

BIG IDEA: [one sentence — the central truth of the sermon, 12-25 words]

POINT 1: [short title, 3-8 words]
SCRIPTURE: [book chapter:verse]
CONTENT: [2-4 sentences explaining the point, grounded in the scripture above]
ILLUSTRATION: [one concrete, vivid story idea — a real-world picture the pastor can paint]

POINT 2: [short title]
SCRIPTURE: [book chapter:verse]
CONTENT: [2-4 sentences]
ILLUSTRATION: [one concrete story idea]

POINT 3: [short title]
SCRIPTURE: [book chapter:verse]
CONTENT: [2-4 sentences]
ILLUSTRATION: [one concrete story idea]

POINT 4: [short title, OPTIONAL — include only if 4 points genuinely strengthen the sermon]
SCRIPTURE: [book chapter:verse]
CONTENT: [2-4 sentences]
ILLUSTRATION: [one concrete story idea]

APPLICATION: [1-3 sentences — one concrete, do-this-this-week action for the listener]

CLOSING PRAYER: [short pastoral prayer prompt, 2-5 sentences]`;

function buildOutlinePrompt(topic: string, scripture: string | undefined, variant: OutlineVariant, minutes: MinutesPreset | undefined, language: OutlineLanguage): { sys: string; user: string } {
  const minutesHint = minutes ? ` The sermon should comfortably fill about ${minutes} minutes when preached (≈${Math.max(120, Math.round(minutes * 130))} spoken words, ≈${Math.round(minutes * 1.2)} main points).` : "";
  const variantHint = variant === "short"
    ? ` Length: ${VARIANT_WORDS.short} words total (sketch mode — 3 points only).`
    : variant === "long"
      ? ` Length: ${VARIANT_WORDS.long} words total (deep study — 4 points with rich illustrations).`
      : ` Length: ${VARIANT_WORDS.medium} words total (balanced — 3-4 points).`;
  const langSys = language === "te"
    ? "మీరు ఒక జాగ్రత్తగా ఆలోచించే, వెచ్చని పాస్టర్ సహాయకుడు. ప్రవచన రూపకల్పనలు బైబిల్ ఆధారితమైనవి, ఆచరణాత్మకంగా వర్తించేవి, ప్రవచించడానికి సులభమైనవి."
    : "You are a thoughtful, warm pastor's assistant. Sermon outlines you produce are biblically grounded, practically applicable, and easy to preach.";
  const userLang = language === "te"
    ? `దిగువ నిర్మాణంలో మాత్రమే తెలుగులో సమాధానం ఇవ్వండి: "${STRUCTURED_FORMAT_INSTRUCTION}". ప్రవచన శీర్షిక: "${topic}".${scripture ? ` ఆధార వచనం: ${scripture}.` : ""}${minutesHint}${variantHint}`
    : `Reply with EXACTLY this structure (no extra prose, no commentary, no preamble): "${STRUCTURED_FORMAT_INSTRUCTION}". Sermon topic: "${topic}".${scripture ? ` Anchor scripture: ${scripture}.` : ""}${minutesHint}${variantHint}`;
  return { sys: langSys, user: userLang };
}

export async function sermonOutline(
  topic: string,
  scripture?: string,
  variant: OutlineVariant = "medium",
  minutes?: MinutesPreset,
  language: OutlineLanguage = "en"
): Promise<string> {
  const { sys, user } = buildOutlinePrompt(topic, scripture, variant, minutes, language);
  const maxTokens = variant === "long" ? 2200 : variant === "medium" ? 1200 : 550;
  const temp = minutes && minutes >= 30 ? 0.55 : 0.6;
  return chat(
    { messages: [{ role: "system", content: sys }, { role: "user", content: user }], temperature: temp, maxTokens,
      seed: hashStringSeed(topic.toLowerCase() + "|" + variant + "|" + (minutes ?? 0) + "|" + language) }
  );
}

// Parses the structured AI output into typed sections. Tolerant of minor formatting variations.
export function parseOutline(raw: string): OutlineData {
  const text = raw.replace(/\r/g, "");
  const grab = (re: RegExp): string => {
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };

  const bigIdea = grab(/^\s*BIG IDEA:\s*(.+?)(?=\n\s*(POINT\s+\d+:|APPLICATION:|CLOSING PRAYER:|$))/im);

  const pointBlocks = text.split(/\n\s*POINT\s+(\d+):/i).slice(1); // alternates: num, body, num, body, ...
  const points: OutlinePoint[] = [];
  for (let i = 0; i + 1 < pointBlocks.length; i += 2) {
    const title = pointBlocks[i + 1].split("\n")[0].trim();
    const body = pointBlocks[i + 1];
    const scripture = (body.match(/^\s*SCRIPTURE:\s*(.+?)(?=\n\s*(CONTENT:|ILLUSTRATION:|$))/im) || ["", ""])[1].trim();
    const content = (body.match(/^\s*CONTENT:\s*([\s\S]+?)(?=\n\s*(ILLUSTRATION:|SCRIPTURE:|APPLICATION:|CLOSING PRAYER:|$))/im) || ["", ""])[1].trim();
    const illustration = (body.match(/^\s*ILLUSTRATION:\s*([\s\S]+?)(?=\n\s*(POINT\s+\d+:|APPLICATION:|CLOSING PRAYER:|$))/im) || ["", ""])[1].trim();
    if (title) points.push({ title, scripture, content, illustration });
  }

  const application = grab(/^\s*APPLICATION:\s*([\s\S]+?)(?=\n\s*CLOSING PRAYER:|$)/im);
  const closingPrayer = grab(/^\s*CLOSING PRAYER:\s*([\s\S]+?)$/im);

  // Fallback: if no BIG IDEA found but there IS content, treat the first non-empty line as big idea.
  const fallbackBigIdea = bigIdea || (points.length === 0 ? text.split("\n").find((l) => l.trim() && !l.match(/^(POINT|SCRIPTURE|CONTENT|ILLUSTRATION|APPLICATION|CLOSING PRAYER|BIG IDEA)/i)) || "" : "");

  return {
    bigIdea: fallbackBigIdea.trim(),
    points,
    application: application.trim(),
    closingPrayer: closingPrayer.trim()
  };
}

// ---------- Suggest Bible references from a sermon title ----------
export interface ScriptureSuggestion { reference: string; why: string }

// language: 'en' = English suggestions (English "why"), 'te' = Telugu suggestions (Telugu "why"),
// 'mixed' = reference in English (canonical), "why" in Telugu.
export async function suggestScripture(title: string, language: "en" | "te" | "mixed" = "en", opts?: { seed?: number }): Promise<ScriptureSuggestion[]> {
  const t = title.trim();
  if (!t) return [];
  const seed = opts?.seed ?? hashStringSeed(t.toLowerCase() + "|sc");
  const sys: ChatMessage = {
    role: "system",
    content:
      language === "te"
        ? "మీరు ఒక జాగ్రత్తగా, బైబిల్ పరిజ్ఞానం గల పాస్టర్ సహాయకుడు. ప్రవచన శీర్షిక ఇవ్వబడితే, ఆ శీర్షికకు *నేరుగా సంబంధించిన* 1 నుండి 3 బైబిల్ వచన సూచనలను మాత్రమే ఇవ్వండి — కేవలం కీవర్డ్‌కు కాదు, ఆ శీర్షిక యొక్క నిర్దిష్ట అర్థానికి సంబంధించినవి. ప్రతి దానికి, ఈ JSON ఆబ్జెక్ట్‌ను దాని స్వంత లైన్‌లో రాయండి: {\"reference\":\"Book Ch:V-V\",\"why\":\"ఒక చిన్న తెలుగు వాక్యం\"}. ప్రసిద్ధ వచనాలను ఉపయోగించండి. JSON లైన్‌లను మాత్రమే రాయండి, ఇతర వ్యాఖ్యానం ఉండకూడదు."
        : language === "mixed"
        ? "You are a careful, biblically literate pastor's assistant. Given a sermon title, suggest 1 to 3 Bible references that *directly* relate to THIS title's specific meaning (not just the keyword). The 'reference' field MUST be in standard English format (e.g. 'John 3:16'). The 'why' field MUST be in Telugu (తెలుగు). Reply ONLY with JSON objects, one per line: {\"reference\":\"Book Ch:V-V\",\"why\":\"తెలుగు వాక్యం\"}. No commentary."
        : "You are a careful, biblically literate pastor's assistant. Given a sermon title, suggest 1 to 3 Bible references that *directly* relate to THIS title's specific meaning — not just the keyword. For each, reply with JSON object on its own line: {\"reference\":\"Book Ch:V-V\",\"why\":\"one short sentence\"}. Use widely-known passages. Reply ONLY with the JSON lines, no commentary."
  };
  const user: ChatMessage = { role: "user", content: `Sermon title: "${t}"\nConnected Bible references (JSON lines):` };
  const out = await chat({ messages: [sys, user], temperature: 0.7, maxTokens: 400, seed });
  const parsed: ScriptureSuggestion[] = [];
  for (const line of out.split(/\n+/)) {
    const m = line.match(/\{[^}]*"reference"\s*:\s*"([^"]+)"[^}]*"why"\s*:\s*"([^"]+)"[^}]*\}/);
    if (m) parsed.push({ reference: m[1], why: m[2] });
  }
  if (parsed.length) return parsed.slice(0, 3);
  // Fallback: rule-based stub by keyword (diversified via title hash).
  return stubScripture(t, language, seed);
}

// Keyword-based stub for when no AI is configured.
// Returns English/Telugu/bilingual suggestions based on the language flag.
// Uses the `seed` param to rotate through each topic's sub-pool so different titles
// that share a keyword (e.g. two sermons about "love") don't get the same triple.
function stubScripture(title: string, language: "en" | "te" | "mixed" = "en", seed: number = hashStringSeed(title.toLowerCase())): ScriptureSuggestion[] {
  const t = title.toLowerCase();
  // Internal row type: each entry carries both English and Telugu reason strings.
  // The final mapped return is the public ScriptureSuggestion shape.
  type StubRow = { reference: string; whyEn: string; whyTe: string };
  const out: StubRow[] = [];
  // Each entry now carries both an English 'whyEn' and a Telugu 'whyTe'. The formatter picks based on language.
  const map: { keywords: string[]; suggestions: StubRow[] }[] = [
    { keywords: ["grace", "mercy", "కృప", "దయ"], suggestions: [
      { reference: "Ephesians 2:8-9", whyEn: "Grace as God's gift, not by works.", whyTe: "కృప దేవుని వరము, మన కర్మల వల్ల కాదు." },
      { reference: "Romans 3:23-24", whyEn: "All fall short, justified freely by his grace.", whyTe: "అందరూ పాపులు, ఆయన కృపచే ఉచితంగా నీతిమంతులుగా చేయబడ్డారు." }
    ]},
    { keywords: ["love", "ప్రేమ", "beloved"], suggestions: [
      { reference: "1 Corinthians 13:4-7", whyEn: "The shape of love.", whyTe: "ప్రేమ యొక్క రూపం." },
      { reference: "John 3:16", whyEn: "God's love for the world.", whyTe: "దేవుడు లోకాన్ని ప్రేమించాడు." },
      { reference: "1 John 4:8", whyEn: "God is love.", whyTe: "దేవుడే ప్రేమ." },
      { reference: "John 13:34", whyEn: "A new commandment: love one another.", whyTe: "కొత్త ఆజ్ఞ: ఒకరిని ఒకరు ప్రేమించుడి." },
      { reference: "Romans 8:38-39", whyEn: "Nothing can separate us from God's love.", whyTe: "దేవుని ప్రేమ నుండి మనలను ఏదీ వేరుచేయదు." },
      { reference: "1 John 4:19", whyEn: "We love because He first loved us.", whyTe: "ఆయన మనలను మొదట ప్రేమించినందున మనము ప్రేమించుచున్నాము." }
    ]},
    { keywords: ["faith", "trust", "believe", "విశ్వాసం", "నమ్మకం"], suggestions: [
      { reference: "Hebrews 11:1", whyEn: "Faith is the substance of things hoped for.", whyTe: "విశ్వాసం ఆశించిన వాటికి ఆధారం." },
      { reference: "Romans 10:17", whyEn: "Faith comes by hearing the word.", whyTe: "విశ్వాసం వాక్యం వినుటవల్ల వస్తుంది." },
      { reference: "Mark 11:22-24", whyEn: "Have faith in God; ask and receive.", whyTe: "దేవునియందు విశ్వాసముంచుడి; అడిగినది పొందుడి." },
      { reference: "2 Corinthians 5:7", whyEn: "We walk by faith, not by sight.", whyTe: "కనులతో కాదు, విశ్వాసముతో నడుచుచున్నాము." },
      { reference: "Ephesians 2:8-9", whyEn: "Saved by grace through faith.", whyTe: "కృప ద్వారా విశ్వాసముతో రక్షింపబడ్డాము." }
    ]},
    { keywords: ["hope", "నిరీక్షణ"], suggestions: [
      { reference: "Romans 15:13", whyEn: "God of hope who fills with joy and peace.", whyTe: "నిరీక్షణ దేవుడు సంతోషమును, సమాధానమును నింపును." },
      { reference: "Hebrews 6:19", whyEn: "Hope as an anchor of the soul.", whyTe: "నిరీక్షణ ఆత్మకు నాగరకం." }
    ]},
    { keywords: ["prayer", "pray", "intercession", "ప్రార్థన"], suggestions: [
      { reference: "Philippians 4:6-7", whyEn: "Prayer with thanksgiving brings peace.", whyTe: "కృతజ్ఞతలతో ప్రార్థన చేయుట సమాధానమిచ్చును." },
      { reference: "Matthew 6:9-13", whyEn: "The Lord's Prayer as a template.", whyTe: "ప్రభువు ప్రార్థన ఆదర్శం." },
      { reference: "James 5:16", whyEn: "The prayer of the righteous is powerful.", whyTe: "నీతిమంతుని ప్రార్థన బలమైనది." },
      { reference: "1 Thessalonians 5:17", whyEn: "Pray without ceasing.", whyTe: "అవిచ్ఛిన్నముగా ప్రార్థన చేయుడి." },
      { reference: "John 14:13-14", whyEn: "Ask in Jesus' name and receive.", whyTe: "నా నామమునందు అడగండి, చేసెదను." }
    ]},
    { keywords: ["fear", "anxiety", "worry", "anxious", "భయం", "ఆందోళన"], suggestions: [
      { reference: "Isaiah 41:10", whyEn: "Do not fear, for I am with you.", whyTe: "భయపడకుము, నేను నీతో ఉన్నాను." },
      { reference: "Philippians 4:6-7", whyEn: "Be anxious for nothing.", whyTe: "ఏ విషయములోను చింతించకుడి." },
      { reference: "Matthew 6:25-34", whyEn: "Do not worry about tomorrow.", whyTe: "రేపటి గురించి చింతించకుడి." }
    ]},
    { keywords: ["forgiveness", "forgive", "repent", "క్షమాపణ", "పశ్చాత్తాపం"], suggestions: [
      { reference: "1 John 1:9", whyEn: "Confess and be forgiven.", whyTe: "ఒప్పుకొనుము, క్షమించబడతారు." },
      { reference: "Ephesians 4:32", whyEn: "Forgive as Christ forgave you.", whyTe: "క్రీస్తు మిమ్మును క్షమించినట్టు మీరు క్షమించుడి." }
    ]},
    { keywords: ["suffering", "trial", "tribulation", "pain", "శ్రమ", "కష్టం"], suggestions: [
      { reference: "Romans 8:28", whyEn: "All things work together for good.", whyTe: "సమస్తం మంచిగా కలిసి పనిచేయును." },
      { reference: "James 1:2-4", whyEn: "Count it all joy when you meet trials.", whyTe: "పరీక్షలలో సంతోషించుడి." }
    ]},
    { keywords: ["shepherd", "pastor", "leader", "leadership", "కాపరి"], suggestions: [
      { reference: "Psalm 23", whyEn: "The Lord is my shepherd.", whyTe: "ప్రభువు నా కాపరి." },
      { reference: "1 Peter 5:2-3", whyEn: "Shepherd the flock willingly.", whyTe: "మందను సేతిగా కాయుడి." }
    ]},
    { keywords: ["worship", "praise", "స్తుతి", "ఆరాధన"], suggestions: [
      { reference: "Psalm 100", whyEn: "Make a joyful noise to the Lord.", whyTe: "సంతోష ధ్వనితో ప్రభువును స్తుతించుడి." },
      { reference: "John 4:24", whyEn: "Worship in spirit and truth.", whyTe: "ఆత్మలో సత్యములో ఆరాధించుడి." },
      { reference: "Psalm 29:2", whyEn: "Worship the Lord in the beauty of holiness.", whyTe: "పరిశుద్ధత కాంతిలో ప్రభువును ఆరాధించుడి." },
      { reference: "Romans 12:1", whyEn: "Present your bodies as a living sacrifice — true worship.", whyTe: "సజీవమైన యజ్ఞముగా మీ శరీరములను అర్పించుడి — ఇది మీ ఆరాధన." }
    ]},
    { keywords: ["spirit", "holy spirit", "pentecost", "ఆత్మ", "పరిశుద్ధాత్మ"], suggestions: [
      { reference: "Acts 2", whyEn: "The Spirit poured out at Pentecost.", whyTe: "పెంతెకోస్తునాడు ఆత్మ కుమ్మరించబడెను." },
      { reference: "Galatians 5:22-23", whyEn: "The fruit of the Spirit.", whyTe: "ఆత్మ ఫలము." }
    ]},
    { keywords: ["marriage", "wedding", "husband", "wife", "వివాహం"], suggestions: [
      { reference: "Ephesians 5:25-33", whyEn: "Husbands love wives as Christ loved the church.", whyTe: "భర్తలు క్రీస్తు సంఘాన్ని ప్రేమించినట్టు భార్యలను ప్రేమించుడి." },
      { reference: "Genesis 2:24", whyEn: "The two shall become one flesh.", whyTe: "ఇద్దరు ఒక మాంసముగా ఉందురు." }
    ]},
    { keywords: ["parent", "child", "children", "family", "తల్లిదండ్రులు", "కుటుంబం"], suggestions: [
      { reference: "Proverbs 22:6", whyEn: "Train up a child in the way.", whyTe: "బిడ్డను దేవుని మార్గములో నేర్పించుము." },
      { reference: "Ephesians 6:1-4", whyEn: "Children obey parents; fathers do not provoke.", whyTe: "బిడ్డలు తల్లిదండ్రులకు లోబడుడి." }
    ]},
    { keywords: ["steward", "money", "tithe", "giving", "stewardship", "దశమ"], suggestions: [
      { reference: "Malachi 3:10", whyEn: "Bring the tithes into the storehouse.", whyTe: "దశమాన్ను గిడ్డంగిలోనికి తేవుడి." },
      { reference: "2 Corinthians 9:7", whyEn: "God loves a cheerful giver.", whyTe: "దేవుడు సంతోషంగా ఇచ్చువానిని ప్రేమించును." }
    ]},
    { keywords: ["evangel", "mission", "witness", "సువార్త", "మిషన్"], suggestions: [
      { reference: "Matthew 28:19-20", whyEn: "The Great Commission.", whyTe: "గొప్ప ఆజ్ఞాపన." },
      { reference: "Acts 1:8", whyEn: "You will be my witnesses.", whyTe: "మీరు నా సాక్షులు." }
    ]}
  ];
  const isTeluguTitle = /[\u0C00-\u0C7F]/.test(title);
  for (const entry of map) {
    if (entry.keywords.some((k) => t.includes(k.toLowerCase()))) {
      out.push(...entry.suggestions);
      if (out.length >= 3) break;
    }
  }
  if (out.length === 0) {
    // Universal fallback pool (varied so different titles get different triples).
    const universalPool = [
      { reference: "John 3:16", whyEn: "God's love for the world.", whyTe: "దేవుడు లోకాన్ని ప్రేమించాడు." },
      { reference: "Romans 8:28", whyEn: "God works all things for good.", whyTe: "సమస్తం మంచిగా కలిసి పనిచేయును." },
      { reference: "Philippians 4:13", whyEn: "Strength through Christ.", whyTe: "క్రీస్తు ద్వారా సమస్తమును చేయగలను." },
      { reference: "Jeremiah 29:11", whyEn: "Plans to prosper and not to harm you.", whyTe: "మిమ్మును శ్రేయస్సుకు బాగుచేయ నిశ్చయించియున్నాడు." },
      { reference: "Psalm 23:1", whyEn: "The Lord is my shepherd.", whyTe: "ప్రభువు నా కాపరి." },
      { reference: "Proverbs 3:5-6", whyEn: "Trust the Lord with all your heart.", whyTe: "నీ హృదయమంతయు నిన్ను నమ్ముకొనుము." },
      { reference: "Isaiah 41:10", whyEn: "Do not fear, for I am with you.", whyTe: "భయపడకుము, నేను నీతో ఉన్నాను." },
      { reference: "Matthew 11:28", whyEn: "Come to me, all who are weary.", whyTe: "ఎల్ల పరిశ్రములు గలవారు నా యొద్దకు వచ్చుడి." },
      { reference: "2 Timothy 1:7", whyEn: "God gave us a spirit of power, not fear.", whyTe: "దేవుడు మనకు భయముకాక, బలమును ప్రేమను, ఆత్మ స్వస్థతను దయచేసెను." }
    ];
    const offset = seed % universalPool.length;
    const rotated = [...universalPool.slice(offset), ...universalPool.slice(0, offset)].slice(0, 3);
    if (isTeluguTitle || language === "te") {
      return rotated.map((s) => ({ reference: s.reference, why: s.whyTe }));
    }
    if (language === "mixed") {
      return rotated.map((s) => ({ reference: s.reference, why: s.whyTe }));
    }
    return rotated.map((s) => ({ reference: s.reference, why: s.whyEn }));
  }
  // Diversify: rotate the matched pool by `seed % length` so different titles get different triples.
  const offset = seed % Math.max(out.length, 1);
  const rotated = [...out.slice(offset), ...out.slice(0, offset)].slice(0, 3);
  return rotated.map((s) => {
    const reason = language === "te" ? s.whyTe : language === "mixed" ? s.whyTe : s.whyEn;
    return { reference: s.reference, why: reason };
  });
}

// ---------- Summarizer (YouTube transcript / long text / OCR) ----------
export async function summarize(text: string, kind: "transcript" | "notes" | "ocr" = "transcript", language: "en" | "te" | "mixed" = "en"): Promise<string> {
  const sys: ChatMessage = {
    role: "system",
    content: "You summarize Christian teaching material into warm, sermon-ready notes with: title, theme, key scriptures, 3 main takeaways, one illustration, one application."
  };
  const user: ChatMessage = {
    role: "user",
    content: `Summarize the following ${kind} into sermon-ready notes. Keep it under 400 words.\n\n${text.slice(0, 6000)}`
  };
  return chat({ messages: [sys, user], maxTokens: 700, language });
}

// ---------- Convert freeform text into structured sermon-note JSON ----------
export async function structureSermonNotes(raw: string, language: "en" | "te" | "mixed" = "en"): Promise<{
  title: string; scripture?: string; intro?: string;
  points: string[]; illustrations: string[]; application?: string; closing?: string
}> {
  const sys: ChatMessage = {
    role: "system",
    content: "You turn messy pastor notes into a clean sermon outline. Reply ONLY with valid JSON."
  };
  const user: ChatMessage = {
    role: "user",
    content: `Convert these raw notes into JSON with fields: title, scripture, intro, points (array of strings), illustrations (array of strings), application, closing. Keep points/illustrations to short phrases. Notes:\n\n${raw.slice(0, 6000)}`
  };
  const out = await chat({ messages: [sys, user], temperature: 0.3, maxTokens: 900, language });
  try {
    return JSON.parse(out);
  } catch {
    return { title: raw.split("\n")[0]?.slice(0, 80) || "Sermon", points: raw.split("\n").filter(Boolean).slice(0, 5), illustrations: [] };
  }
}

// ---------- YouTube transcript fetcher (free public endpoint) ----------
export async function fetchYouTubeTranscript(url: string): Promise<string> {
  // Extract video id
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  if (!m) throw new Error("Could not parse YouTube URL");
  const id = m[1];
  // Try several public transcript endpoints (best-effort, free, no key).
  const endpoints = [
    `https://youtubetranscript.com/?server_vid2=${id}`,
    `https://www.youtube.com/api/timedtext?lang=en&v=${id}&fmt=json3`
  ];
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep);
      if (!r.ok) continue;
      const txt = await r.text();
      if (txt && txt.length > 50) return txt;
    } catch { /* try next */ }
  }
  throw new Error("Could not fetch transcript. Pastor can paste transcript manually.");
}

// ---------- Stub reply (no AI configured) ----------
function stubReply(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1]?.content ?? "";
  if (/outline/i.test(last)) {
    return [
      "**Big idea:** God's grace meets us where we are.",
      "",
      "**1. The Setup** — Where we fall short (Rom 3:23)",
      "   • Illustration: a child learning to walk",
      "",
      "**2. The Rescue** — What Christ has done (Eph 2:4–5)",
      "   • Illustration: a search party for one lost sheep",
      "",
      "**3. The Response** — How we walk in grace (2 Cor 5:17)",
      "   • Illustration: new name, new direction",
      "",
      "**Application:** This week, identify one place you've been relying on effort, and consciously receive grace there.",
      "",
      "**Closing prayer prompt:** Lord, give us the humility to receive what we cannot earn.",
      "",
      "_(Offline stub — paste your AI provider in Settings for live, personalized outlines.)_"
    ].join("\n");
  }
  if (/summar/i.test(last)) {
    return [
      "**Title:** Grace in the Everyday",
      "",
      "**Theme:** God's steady presence in ordinary moments.",
      "",
      "**Key scriptures:** Psalm 139:7–10; Matthew 6:25–34",
      "",
      "**Three takeaways:**",
      "1. You are seen, even when unnoticed.",
      "2. Worry is replaced by trust, one moment at a time.",
      "3. Everyday faithfulness is the greatest sermon.",
      "",
      "**Illustration:** A mother whispering a lullaby she doesn't know anyone hears.",
      "",
      "**Application:** Pick one daily routine and offer it as a prayer this week.",
      "",
      "_(Offline stub — paste your AI provider in Settings for live summaries.)_"
    ].join("\n");
  }
  return "_(Offline stub. Paste your AI provider in Settings to enable live responses.)_";
}
