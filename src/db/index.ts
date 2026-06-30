import { openDB, type IDBPDatabase, type DBSchema } from "idb";

// ---------- Types ----------
export interface Profile {
  id: "singleton";
  pastorName: string;
  churchName: string;
  photoDataUrl?: string;
  language: "en" | "te";
  createdAt: number;
  updatedAt: number;
}

export interface Member {
  id: string;
  name: string;
  phone?: string;
  family?: string;
  birthday?: string;   // ISO date (YYYY-MM-DD)
  anniversary?: string; // ISO date (YYYY-MM-DD)
  notes?: string;
  tags?: string[];
  createdAt: number;
}

export interface Prayer {
  id: string;
  request: string;
  requester?: string;
  category?: string;
  answered: boolean;
  answeredAt?: number;
  notes?: string;
  createdAt: number;
}

export interface SermonNote {
  id: string;
  title: string;
  date: string;
  scripture?: string;
  intro?: string;
  points?: string[];
  illustrations?: string[];
  application?: string;
  closing?: string;
  prayer?: string;
  tags?: string[];
  language?: "en" | "te" | "mixed";
  createdAt: number;
  updatedAt: number;
}

export interface PastSermon {
  id: string;
  title: string;
  date: string;
  transcript?: string;
  source?: string; // photo data URL or file name
  linkedNoteId?: string;
  createdAt: number;
}

export interface ChurchEvent {
  id: string;
  title: string;
  type: "service" | "birthday" | "wedding" | "anniversary" | "prayer" | "fasting" | "cottage" | "meeting" | "other";
  date: string;   // ISO date
  time?: string;
  memberId?: string;
  location?: string;
  notes?: string;
  reminder: boolean;
  createdAt: number;
}

export interface CounselingNote {
  id: string;
  memberId?: string;
  title: string;
  date: string;
  body: string;     // encrypted at rest if user enabled encryption
  createdAt: number;
}

export interface FollowUpEntry {
  id: string;
  memberId?: string;
  kind: "visit" | "call" | "message" | "first-time" | "prayer";
  date: string;
  notes?: string;
  createdAt: number;
}

export interface FinanceEntry {
  id: string;
  date: string;
  kind: "income" | "expense";
  amount: number;
  category?: string;
  memberId?: string;
  notes?: string;
  createdAt: number;
}

export interface AppSettings {
  id: "singleton";
  aiProvider?: string;   // openai-compatible base URL
  aiApiKey?: string;
  aiModel?: string;
  nivKey?: string;       // api.bible key
  nivBibleId?: string;
  bsiTeluguUrl?: string;
  encryptionEnabled: boolean;
  encryptionSalt?: string; // base64
  notificationsEnabled: boolean;
}

// ---------- Schema ----------
interface JohnDB extends DBSchema {
  profile: { key: "singleton"; value: Profile };
  members: { key: string; value: Member; indexes: { byName: string } };
  prayer: { key: string; value: Prayer; indexes: { byAnswered: string } };
  sermonNotes: { key: string; value: SermonNote; indexes: { byDate: string } };
  pastSermons: { key: string; value: PastSermon; indexes: { byDate: string } };
  events: { key: string; value: ChurchEvent; indexes: { byDate: string; byType: string } };
  counseling: { key: string; value: CounselingNote; indexes: { byMemberId: string } };
  followUp: { key: string; value: FollowUpEntry; indexes: { byMemberId: string; byDate: string } };
  finance: { key: string; value: FinanceEntry; indexes: { byDate: string; byKind: string } };
  settings: { key: "singleton"; value: AppSettings };
}

const DB_NAME = "john";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<JohnDB>> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB<JohnDB>(DB_NAME, DB_VERSION, {
      upgrade(d) {
        d.createObjectStore("profile");
        const m = d.createObjectStore("members", { keyPath: "id" });
        m.createIndex("byName", "name");
        const pr = d.createObjectStore("prayer", { keyPath: "id" });
        pr.createIndex("byAnswered", "answered");
        const sn = d.createObjectStore("sermonNotes", { keyPath: "id" });
        sn.createIndex("byDate", "date");
        const ps = d.createObjectStore("pastSermons", { keyPath: "id" });
        ps.createIndex("byDate", "date");
        const ev = d.createObjectStore("events", { keyPath: "id" });
        ev.createIndex("byDate", "date");
        ev.createIndex("byType", "type");
        const co = d.createObjectStore("counseling", { keyPath: "id" });
        co.createIndex("byMemberId", "memberId");
        const fu = d.createObjectStore("followUp", { keyPath: "id" });
        fu.createIndex("byMemberId", "memberId");
        fu.createIndex("byDate", "date");
        const fi = d.createObjectStore("finance", { keyPath: "id" });
        fi.createIndex("byDate", "date");
        fi.createIndex("byKind", "kind");
        d.createObjectStore("settings");
      }
    });
  }
  return dbPromise;
}

// ---------- Helpers ----------
const uid = () => crypto.randomUUID();

// ---------- Profile ----------
export async function getProfile(): Promise<Profile | null> {
  return (await (await db()).get("profile", "singleton")) ?? null;
}
export async function saveProfile(p: Partial<Profile>) {
  const cur = (await getProfile()) ?? {
    id: "singleton" as const, pastorName: "", churchName: "", language: "en", createdAt: Date.now(), updatedAt: Date.now()
  };
  const next: Profile = { ...cur, ...p, id: "singleton", updatedAt: Date.now() };
  await (await db()).put("profile", next, "singleton");
  return next;
}

// ---------- Generic CRUD ----------
async function listAll<T extends { id: string }>(store: keyof JohnDB): Promise<T[]> {
  return (await (await db()).getAll(store as any)) as T[];
}
async function getById<T>(store: keyof JohnDB, id: string): Promise<T | undefined> {
  return (await (await db()).get(store as any, id)) as T | undefined;
}
async function putItem<T extends { id: string }>(store: keyof JohnDB, item: T) {
  await (await db()).put(store as any, item);
}
async function removeItem(store: keyof JohnDB, id: string) {
  await (await db()).delete(store as any, id);
}

// ---------- Members ----------
export const Members = {
  list: () => listAll<Member>("members"),
  get: (id: string) => getById<Member>("members", id),
  upsert: async (m: Partial<Member> & { name: string }) => {
    const item: Member = {
      id: m.id ?? uid(),
      name: m.name,
      phone: m.phone, family: m.family,
      birthday: m.birthday, anniversary: m.anniversary,
      notes: m.notes, tags: m.tags,
      createdAt: m.createdAt ?? Date.now()
    };
    await putItem("members", item);
    return item;
  },
  remove: (id: string) => removeItem("members", id)
};

// ---------- Prayer ----------
export const PrayerList = {
  list: () => listAll<Prayer>("prayer"),
  upsert: async (p: Partial<Prayer> & { request: string }) => {
    const item: Prayer = {
      id: p.id ?? uid(),
      request: p.request,
      requester: p.requester, category: p.category,
      answered: p.answered ?? false,
      answeredAt: p.answeredAt, notes: p.notes,
      createdAt: p.createdAt ?? Date.now()
    };
    await putItem("prayer", item);
    return item;
  },
  toggleAnswered: async (id: string) => {
    const cur = await getById<Prayer>("prayer", id);
    if (!cur) return null;
    const next = { ...cur, answered: !cur.answered, answeredAt: !cur.answered ? Date.now() : undefined };
    await putItem("prayer", next);
    return next;
  },
  remove: (id: string) => removeItem("prayer", id)
};

// ---------- Sermon Notes ----------
export const SermonNotesStore = {
  list: () => listAll<SermonNote>("sermonNotes"),
  get: (id: string) => getById<SermonNote>("sermonNotes", id),
  upsert: async (s: Partial<SermonNote> & { title: string }) => {
    const now = Date.now();
    const item: SermonNote = {
      id: s.id ?? uid(),
      title: s.title,
      date: s.date ?? new Date().toISOString().slice(0, 10),
      scripture: s.scripture,
      intro: s.intro,
      points: s.points ?? [],
      illustrations: s.illustrations ?? [],
      application: s.application,
      closing: s.closing,
      prayer: s.prayer,
      tags: s.tags ?? [],
      language: s.language,
      createdAt: s.createdAt ?? now,
      updatedAt: now
    };
    await putItem("sermonNotes", item);
    return item;
  },
  remove: (id: string) => removeItem("sermonNotes", id)
};

// ---------- Past Sermons ----------
export const PastSermonsStore = {
  list: () => listAll<PastSermon>("pastSermons"),
  upsert: async (p: Partial<PastSermon> & { title: string }) => {
    const item: PastSermon = {
      id: p.id ?? uid(),
      title: p.title,
      date: p.date ?? new Date().toISOString().slice(0, 10),
      transcript: p.transcript, source: p.source,
      linkedNoteId: p.linkedNoteId,
      createdAt: p.createdAt ?? Date.now()
    };
    await putItem("pastSermons", item);
    return item;
  },
  remove: (id: string) => removeItem("pastSermons", id)
};

// ---------- Events ----------
export const EventsStore = {
  list: () => listAll<ChurchEvent>("events"),
  upsert: async (e: Partial<ChurchEvent> & { title: string; date: string }) => {
    const item: ChurchEvent = {
      id: e.id ?? uid(),
      title: e.title, type: e.type ?? "other",
      date: e.date, time: e.time,
      memberId: e.memberId, location: e.location,
      notes: e.notes, reminder: e.reminder ?? true,
      createdAt: e.createdAt ?? Date.now()
    };
    await putItem("events", item);
    return item;
  },
  remove: (id: string) => removeItem("events", id)
};

// ---------- Counseling ----------
export const CounselingStore = {
  list: () => listAll<CounselingNote>("counseling"),
  upsert: async (c: Partial<CounselingNote> & { title: string; body: string; date: string }) => {
    const item: CounselingNote = {
      id: c.id ?? uid(),
      memberId: c.memberId, title: c.title,
      date: c.date, body: c.body,
      createdAt: c.createdAt ?? Date.now()
    };
    await putItem("counseling", item);
    return item;
  },
  remove: (id: string) => removeItem("counseling", id)
};

// ---------- Follow-up ----------
export const FollowUpStore = {
  list: () => listAll<FollowUpEntry>("followUp"),
  upsert: async (f: Partial<FollowUpEntry> & { date: string; kind: FollowUpEntry["kind"] }) => {
    const item: FollowUpEntry = {
      id: f.id ?? uid(),
      memberId: f.memberId, kind: f.kind,
      date: f.date, notes: f.notes,
      createdAt: f.createdAt ?? Date.now()
    };
    await putItem("followUp", item);
    return item;
  },
  remove: (id: string) => removeItem("followUp", id)
};

// ---------- Finance ----------
export const FinanceStore = {
  list: () => listAll<FinanceEntry>("finance"),
  upsert: async (f: Partial<FinanceEntry> & { date: string; kind: FinanceEntry["kind"]; amount: number }) => {
    const item: FinanceEntry = {
      id: f.id ?? uid(),
      date: f.date, kind: f.kind, amount: f.amount,
      category: f.category, memberId: f.memberId,
      notes: f.notes, createdAt: f.createdAt ?? Date.now()
    };
    await putItem("finance", item);
    return item;
  },
  remove: (id: string) => removeItem("finance", id)
};

// ---------- Settings ----------
export async function getSettings(): Promise<AppSettings> {
  return (await (await db()).get("settings", "singleton")) ?? {
    id: "singleton", encryptionEnabled: false, notificationsEnabled: false
  };
}
export async function saveSettings(s: Partial<AppSettings>) {
  const cur = await getSettings();
  const next = { ...cur, ...s, id: "singleton" as const };
  await (await db()).put("settings", next, "singleton");
  return next;
}

// ---------- Backup / Restore ----------
export async function exportAll(): Promise<string> {
  const d = await db();
  const out = {
    version: 1,
    exportedAt: Date.now(),
    profile: await d.get("profile", "singleton"),
    settings: await getSettings(),
    members: await d.getAll("members"),
    prayer: await d.getAll("prayer"),
    sermonNotes: await d.getAll("sermonNotes"),
    pastSermons: await d.getAll("pastSermons"),
    events: await d.getAll("events"),
    counseling: await d.getAll("counseling"),
    followUp: await d.getAll("followUp"),
    finance: await d.getAll("finance")
  };
  return JSON.stringify(out, null, 2);
}

export async function importAll(json: string) {
  const data = JSON.parse(json);
  const d = await db();
  const tx = d.transaction(
    ["profile", "settings", "members", "prayer", "sermonNotes", "pastSermons", "events", "counseling", "followUp", "finance"],
    "readwrite"
  );
  if (data.profile) await tx.objectStore("profile").put(data.profile, "singleton");
  if (data.settings) await tx.objectStore("settings").put({ ...data.settings, id: "singleton" }, "singleton");
  for (const store of ["members", "prayer", "sermonNotes", "pastSermons", "events", "counseling", "followUp", "finance"] as const) {
    const os = tx.objectStore(store);
    await os.clear();
    for (const item of data[store] ?? []) await os.put(item);
  }
  await tx.done;
}
