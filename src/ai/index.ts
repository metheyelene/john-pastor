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

export async function suggestScripture(title: string): Promise<ScriptureSuggestion[]> {
  const t = title.trim();
  if (!t) return [];
  const sys: ChatMessage = {
    role: "system",
    content: "You are a careful, biblically literate pastor's assistant. Given a sermon title, suggest 1 to 3 Bible references that directly connect to the topic. For each, reply with JSON object on its own line: {\"reference\":\"Book Ch:V-V\",\"why\":\"one short sentence\"}. Use widely-known passages. Reply ONLY with the JSON lines, no commentary."
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
  return stubScripture(t);
}

// Keyword-based stub for when no AI is configured.
function stubScripture(title: string): ScriptureSuggestion[] {
  const t = title.toLowerCase();
  const out: ScriptureSuggestion[] = [];
  const map: { keywords: string[]; suggestions: ScriptureSuggestion[] }[] = [
    { keywords: ["grace", "mercy"], suggestions: [
      { reference: "Ephesians 2:8-9", why: "Grace as God's gift, not by works." },
      { reference: "Romans 3:23-24", why: "All fall short, justified freely by his grace." }
    ]},
    { keywords: ["love", "beloved"], suggestions: [
      { reference: "1 Corinthians 13:4-7", why: "The shape of love." },
      { reference: "John 3:16", why: "God's love for the world." },
      { reference: "1 John 4:8", why: "God is love." }
    ]},
    { keywords: ["faith", "trust", "believe"], suggestions: [
      { reference: "Hebrews 11:1", why: "Faith is the substance of things hoped for." },
      { reference: "Romans 10:17", why: "Faith comes by hearing the word." }
    ]},
    { keywords: ["hope"], suggestions: [
      { reference: "Romans 15:13", why: "God of hope who fills with joy and peace." },
      { reference: "Hebrews 6:19", why: "Hope as an anchor of the soul." }
    ]},
    { keywords: ["prayer", "pray", "intercession"], suggestions: [
      { reference: "Philippians 4:6-7", why: "Prayer with thanksgiving brings peace." },
      { reference: "Matthew 6:9-13", why: "The Lord's Prayer as a template." }
    ]},
    { keywords: ["fear", "anxiety", "worry", "anxious"], suggestions: [
      { reference: "Isaiah 41:10", why: "Do not fear, for I am with you." },
      { reference: "Philippians 4:6-7", why: "Be anxious for nothing." },
      { reference: "Matthew 6:25-34", why: "Do not worry about tomorrow." }
    ]},
    { keywords: ["forgiveness", "forgive", "repent"], suggestions: [
      { reference: "1 John 1:9", why: "Confess and be forgiven." },
      { reference: "Ephesians 4:32", why: "Forgive as Christ forgave you." }
    ]},
    { keywords: ["suffering", "trial", "tribulation", "pain"], suggestions: [
      { reference: "Romans 8:28", why: "All things work together for good." },
      { reference: "James 1:2-4", why: "Count it all joy when you meet trials." }
    ]},
    { keywords: ["shepherd", "pastor", "leader", "leadership"], suggestions: [
      { reference: "Psalm 23", why: "The Lord is my shepherd." },
      { reference: "1 Peter 5:2-3", why: "Shepherd the flock willingly." }
    ]},
    { keywords: ["worship", "praise"], suggestions: [
      { reference: "Psalm 100", why: "Make a joyful noise to the Lord." },
      { reference: "John 4:24", why: "Worship in spirit and truth." }
    ]},
    { keywords: ["spirit", "holy spirit", "pentecost"], suggestions: [
      { reference: "Acts 2", why: "The Spirit poured out at Pentecost." },
      { reference: "Galatians 5:22-23", why: "The fruit of the Spirit." }
    ]},
    { keywords: ["marriage", "wedding", "husband", "wife"], suggestions: [
      { reference: "Ephesians 5:25-33", why: "Husbands love wives as Christ loved the church." },
      { reference: "Genesis 2:24", why: "The two shall become one flesh." }
    ]},
    { keywords: ["parent", "child", "children", "family"], suggestions: [
      { reference: "Proverbs 22:6", why: "Train up a child in the way." },
      { reference: "Ephesians 6:1-4", why: "Children obey parents; fathers do not provoke." }
    ]},
    { keywords: ["steward", "money", "tithe", "giving", "stewardship"], suggestions: [
      { reference: "Malachi 3:10", why: "Bring the tithes into the storehouse." },
      { reference: "2 Corinthians 9:7", why: "God loves a cheerful giver." }
    ]},
    { keywords: ["evangel", "mission", "witness"], suggestions: [
      { reference: "Matthew 28:19-20", why: "The Great Commission." },
      { reference: "Acts 1:8", why: "You will be my witnesses." }
    ]}
  ];
  for (const entry of map) {
    if (entry.keywords.some((k) => t.includes(k))) {
      out.push(...entry.suggestions);
      if (out.length >= 3) break;
    }
  }
  if (out.length === 0) {
    // Default to a few universal passages so the feature always has something to show.
    return [
      { reference: "John 3:16", why: "God's love for the world." },
      { reference: "Romans 8:28", why: "God works all things for good." },
      { reference: "Philippians 4:13", why: "Strength through Christ." }
    ];
  }
  return out.slice(0, 3);
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
