import { getSettings } from "../db";

// AI helper — OpenAI-compatible chat completions.
// Falls back to a structured stub when no provider/key is configured so the feature is always useful.

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export async function chat({ messages, temperature = 0.7, maxTokens = 800 }: ChatOptions): Promise<string> {
  const s = await getSettings();
  if (!s.aiProvider || !s.aiApiKey) return stubReply(messages);
  try {
    const res = await fetch(s.aiProvider.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.aiApiKey}`
      },
      body: JSON.stringify({
        model: s.aiModel || "gpt-4o-mini",
        messages, temperature, max_tokens: maxTokens,
        stream: false
      })
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? stubReply(messages);
  } catch (e) {
    return stubReply(messages) + `\n\n_(AI error: ${(e as Error).message}. Showing offline stub.)_`;
  }
}

// ---------- Sermon outline stub ----------
export async function sermonOutline(topic: string, scripture?: string): Promise<string> {
  const sys: ChatMessage = {
    role: "system",
    content: "You are a thoughtful, warm pastor's assistant. Create sermon outlines that are biblically grounded, practically applicable, and easy to preach. Use clear sections."
  };
  const user: ChatMessage = {
    role: "user",
    content: `Create a sermon outline on the topic: "${topic}".${scripture ? ` Anchor in ${scripture}.` : ""} Format: 1) Big idea (1 sentence), 2) 3–4 main points with brief scripture references, 3) One illustration idea per point, 4) Practical application, 5) Closing prayer prompt.`
  };
  return chat({ messages: [sys, user], temperature: 0.6, maxTokens: 900 });
}

// ---------- Suggest Bible references from a sermon title ----------
export interface ScriptureSuggestion { reference: string; why: string }

// language: 'en' = English suggestions (English "why"), 'te' = Telugu suggestions (Telugu "why"),
// 'mixed' = reference in English (canonical), "why" in Telugu.
export async function suggestScripture(title: string, language: "en" | "te" | "mixed" = "en"): Promise<ScriptureSuggestion[]> {
  const t = title.trim();
  if (!t) return [];
  const sys: ChatMessage = {
    role: "system",
    content:
      language === "te"
        ? "మీరు ఒక జాగ్రత్తగా, బైబిల్ పరిజ్ఞానం గల పాస్టర్ సహాయకుడు. ప్రవచన శీర్షిక ఇవ్వబడితే, 1 నుండి 3 బైబిల్ వచన సూచనలను అందించండి. ప్రతి దానికి, ఈ JSON ఆబ్జెక్ట్‌ను దాని స్వంత లైన్‌లో రాయండి: {\"reference\":\"Book Ch:V-V\",\"why\":\"ఒక చిన్న తెలుగు వాక్యం\"}. ప్రసిద్ధ వచనాలను ఉపయోగించండి. JSON లైన్‌లను మాత్రమే రాయండి, ఇతర వ్యాఖ్యానం ఉండకూడదు."
        : language === "mixed"
        ? "You are a careful, biblically literate pastor's assistant. Given a sermon title, suggest 1 to 3 Bible references. The 'reference' field MUST be in standard English format (e.g. 'John 3:16'). The 'why' field MUST be in Telugu (తెలుగు). Reply ONLY with JSON objects, one per line: {\"reference\":\"Book Ch:V-V\",\"why\":\"తెలుగు వాక్యం\"}. No commentary."
        : "You are a careful, biblically literate pastor's assistant. Given a sermon title, suggest 1 to 3 Bible references that directly connect to the topic. For each, reply with JSON object on its own line: {\"reference\":\"Book Ch:V-V\",\"why\":\"one short sentence\"}. Use widely-known passages. Reply ONLY with the JSON lines, no commentary."
  };
  const user: ChatMessage = { role: "user", content: `Sermon title: "${t}"\nConnected Bible references (JSON lines):` };
  const out = await chat({ messages: [sys, user], temperature: 0.4, maxTokens: 300 });
  const parsed: ScriptureSuggestion[] = [];
  for (const line of out.split(/\n+/)) {
    const m = line.match(/\{[^}]*"reference"\s*:\s*"([^"]+)"[^}]*"why"\s*:\s*"([^"]+)"[^}]*\}/);
    if (m) parsed.push({ reference: m[1], why: m[2] });
  }
  if (parsed.length) return parsed.slice(0, 3);
  // Fallback: rule-based stub by keyword.
  return stubScripture(t, language);
}

// Keyword-based stub for when no AI is configured.
// Returns English/Telugu/bilingual suggestions based on the language flag.
function stubScripture(title: string, language: "en" | "te" | "mixed" = "en"): ScriptureSuggestion[] {
  const t = title.toLowerCase();
  const out: ScriptureSuggestion[] = [];
  // Each entry now carries both an English 'whyEn' and a Telugu 'whyTe'. The formatter picks based on language.
  const map: { keywords: string[]; suggestions: { reference: string; whyEn: string; whyTe: string }[] }[] = [
    { keywords: ["grace", "mercy", "కృప", "దయ"], suggestions: [
      { reference: "Ephesians 2:8-9", whyEn: "Grace as God's gift, not by works.", whyTe: "కృప దేవుని వరము, మన కర్మల వల్ల కాదు." },
      { reference: "Romans 3:23-24", whyEn: "All fall short, justified freely by his grace.", whyTe: "అందరూ పాపులు, ఆయన కృపచే ఉచితంగా నీతిమంతులుగా చేయబడ్డారు." }
    ]},
    { keywords: ["love", "ప్రేమ", "beloved"], suggestions: [
      { reference: "1 Corinthians 13:4-7", whyEn: "The shape of love.", whyTe: "ప్రేమ యొక్క రూపం." },
      { reference: "John 3:16", whyEn: "God's love for the world.", whyTe: "దేవుడు లోకాన్ని ప్రేమించాడు." },
      { reference: "1 John 4:8", whyEn: "God is love.", whyTe: "దేవుడే ప్రేమ." }
    ]},
    { keywords: ["faith", "trust", "believe", "విశ్వాసం", "నమ్మకం"], suggestions: [
      { reference: "Hebrews 11:1", whyEn: "Faith is the substance of things hoped for.", whyTe: "విశ్వాసం ఆశించిన వాటికి ఆధారం." },
      { reference: "Romans 10:17", whyEn: "Faith comes by hearing the word.", whyTe: "విశ్వాసం వాక్యం వినుటవల్ల వస్తుంది." }
    ]},
    { keywords: ["hope", "నిరీక్షణ"], suggestions: [
      { reference: "Romans 15:13", whyEn: "God of hope who fills with joy and peace.", whyTe: "నిరీక్షణ దేవుడు సంతోషమును, సమాధానమును నింపును." },
      { reference: "Hebrews 6:19", whyEn: "Hope as an anchor of the soul.", whyTe: "నిరీక్షణ ఆత్మకు నాగరకం." }
    ]},
    { keywords: ["prayer", "pray", "intercession", "ప్రార్థన"], suggestions: [
      { reference: "Philippians 4:6-7", whyEn: "Prayer with thanksgiving brings peace.", whyTe: "కృతజ్ఞతలతో ప్రార్థన చేయుట సమాధానమిచ్చును." },
      { reference: "Matthew 6:9-13", whyEn: "The Lord's Prayer as a template.", whyTe: "ప్రభువు ప్రార్థన ఆదర్శం." }
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
      { reference: "John 4:24", whyEn: "Worship in spirit and truth.", whyTe: "ఆత్మలో సత్యములో ఆరాధించుడి." }
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
    if (isTeluguTitle) {
      return [
        { reference: "John 3:16", why: "దేవుడు లోకాన్ని ప్రేమించాడు." },
        { reference: "Romans 8:28", why: "సమస్తం మంచిగా కలిసి పనిచేయును." },
        { reference: "Philippians 4:13", why: "క్రీస్తు ద్వారా సమస్తమును చేయగలను." }
      ];
    }
    return [
      { reference: "John 3:16", why: "God's love for the world." },
      { reference: "Romans 8:28", why: "God works all things for good." },
      { reference: "Philippians 4:13", why: "Strength through Christ." }
    ];
  }
  return out.slice(0, 3).map((s) => {
    const reason = language === "te" ? s.whyTe : language === "mixed" ? s.whyTe : s.whyEn;
    return { reference: s.reference, why: reason };
  });
}

// ---------- Summarizer (YouTube transcript / long text / OCR) ----------
export async function summarize(text: string, kind: "transcript" | "notes" | "ocr" = "transcript"): Promise<string> {
  const sys: ChatMessage = {
    role: "system",
    content: "You summarize Christian teaching material into warm, sermon-ready notes with: title, theme, key scriptures, 3 main takeaways, one illustration, one application."
  };
  const user: ChatMessage = {
    role: "user",
    content: `Summarize the following ${kind} into sermon-ready notes. Keep it under 400 words.\n\n${text.slice(0, 6000)}`
  };
  return chat({ messages: [sys, user], maxTokens: 700 });
}

// ---------- Convert freeform text into structured sermon-note JSON ----------
export async function structureSermonNotes(raw: string): Promise<{
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
  const out = await chat({ messages: [sys, user], temperature: 0.3, maxTokens: 900 });
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
