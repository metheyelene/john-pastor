import { Box, Stack, TextField, Typography, Switch, FormControlLabel, Divider, MenuItem, Alert, Chip, Button } from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";
import RestoreIcon from "@mui/icons-material/Restore";
import LockIcon from "@mui/icons-material/Lock";
import { useEffect, useRef, useState } from "react";
import GlassyButton from "../components/GlassyButton";
import AnimatedCard from "../components/AnimatedCard";
import { exportAll, importAll, getSettings, saveSettings, getProfile, saveProfile } from "../db";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [s, setS] = useState<Awaited<ReturnType<typeof getSettings>>>({ id: "singleton", encryptionEnabled: false, notificationsEnabled: false });
  const [pastorName, setPastorName] = useState(""); const [churchName, setChurchName] = useState("");
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const st = await getSettings();
      setS(st);
      const p = await getProfile();
      if (p) { setPastorName(p.pastorName); setChurchName(p.churchName); setPhoto(p.photoDataUrl); }
    })();
  }, []);

  const set = async (patch: Partial<typeof s>) => setS(await saveSettings(patch));
  const setProfileField = async (patch: { pastorName?: string; churchName?: string; photoDataUrl?: string }) => {
    await saveProfile(patch);
    if (patch.pastorName !== undefined) setPastorName(patch.pastorName);
    if (patch.churchName !== undefined) setChurchName(patch.churchName);
    if (patch.photoDataUrl !== undefined) setPhoto(patch.photoDataUrl);
  };

  const downloadBackup = async () => {
    const data = await exportAll();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `john-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    setMsg(t("backed"));
    setTimeout(() => setMsg(null), 3000);
  };
  const restoreFromFile = async (f: File | null) => {
    if (!f) return;
    if (!confirm("This will REPLACE all current data with the backup. Continue?")) return;
    const text = await f.text();
    await importAll(text);
    setMsg(t("restored"));
    setTimeout(() => location.reload(), 1500);
  };
  const onPhoto = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setProfileField({ photoDataUrl: r.result as string });
    r.readAsDataURL(f);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>{t("settings")}</Typography>
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}

      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Your profile</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <Box sx={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg,#ffb74d,#ec407a)", display: "grid", placeItems: "center", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
            {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Typography variant="h4" sx={{ color: "#1a1a40", fontWeight: 700 }}>{(pastorName || "P").slice(0, 1).toUpperCase()}</Typography>}
          </Box>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
          <Stack spacing={2} sx={{ flex: 1 }}>
            <TextField label="Pastor's name" value={pastorName} onChange={(e) => setPastorName(e.target.value)} onBlur={() => setProfileField({ pastorName })} />
            <TextField label="Church name" value={churchName} onChange={(e) => setChurchName(e.target.value)} onBlur={() => setProfileField({ churchName })} />
          </Stack>
        </Stack>
      </AnimatedCard>

      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>{t("language")}</Typography>
        <TextField select value={i18n.language.startsWith("te") ? "te" : "en"} onChange={(e) => { i18n.changeLanguage(e.target.value); setProfileField({ pastorName }); }} sx={{ minWidth: 240 }}>
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="te">తెలుగు (Telugu)</MenuItem>
        </TextField>
      </AnimatedCard>

      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>AI (Sermon Assistant, summaries)</Typography>
            <Typography variant="caption" sx={{ opacity: 0.65 }}>
              Works out of the box via free Pollinations.ai. Paste your own key for higher quality.
            </Typography>
          </Box>
          <Chip
            size="small"
            label={
              s.aiProvider && s.aiApiKey
                ? (s.aiProvider.includes('groq') ? 'Groq' : 'Custom provider')
                : 'Pollinations (free, no signup)'
            }
            color={s.aiProvider && s.aiApiKey ? 'primary' : 'success'}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => set({ aiProvider: "https://api.groq.com/openai/v1", aiModel: "llama-3.1-70b-versatile" })}
          >
            Use Groq free tier
          </Button>
          <Button
            size="small"
            component="a"
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener"
          >
            Get free Groq key (30 sec signup)
          </Button>
          {(s.aiProvider || s.aiApiKey) && (
            <Button size="small" color="error" onClick={() => set({ aiProvider: "", aiApiKey: "", aiModel: "" })}>
              Clear & use Pollinations
            </Button>
          )}
        </Stack>
        <Stack spacing={2}>
          <TextField label="Provider base URL" placeholder="https://api.openai.com/v1"
            value={s.aiProvider ?? ""} onChange={(e) => set({ aiProvider: e.target.value })}
            helperText="Leave empty to use the free Pollinations fallback (no signup)." />
          <TextField label="API key" type="password" value={s.aiApiKey ?? ""} onChange={(e) => set({ aiApiKey: e.target.value })} />
          <TextField label="Model" placeholder="gpt-4o-mini / llama-3.1-70b-versatile"
            value={s.aiModel ?? ""} onChange={(e) => set({ aiModel: e.target.value })} />
        </Stack>
      </AnimatedCard>

      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Custom Bible sources</Typography>
        <Stack spacing={2}>
          <Typography variant="overline" sx={{ opacity: 0.7 }}>NIV English (via api.bible)</Typography>
          <TextField label="api.bible key" type="password" value={s.nivKey ?? ""} onChange={(e) => set({ nivKey: e.target.value })} />
          <TextField label="NIV bible ID (e.g. 78a9f6124f344018-01)" value={s.nivBibleId ?? ""} onChange={(e) => set({ nivBibleId: e.target.value })} />
          <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
          <Typography variant="overline" sx={{ opacity: 0.7 }}>BSI Telugu (full Bible JSON endpoint)</Typography>
          <TextField label="JSON URL (use {ref} placeholder for reference)"
            value={s.bsiTeluguUrl ?? ""} onChange={(e) => set({ bsiTeluguUrl: e.target.value })}
            placeholder="https://example.com/bsi/{ref}" />
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            Genesis 1 + John 1 are bundled so the UI shows real Telugu out of the box.
          </Typography>
        </Stack>
      </AnimatedCard>

      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Notifications</Typography>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Chip
            size="small"
            color={
              typeof Notification === "undefined"
                ? "default"
                : Notification.permission === "granted"
                ? "success"
                : Notification.permission === "denied"
                ? "error"
                : "primary"
            }
            label={
              typeof Notification === "undefined"
                ? "Not supported"
                : Notification.permission === "granted"
                ? "Enabled"
                : Notification.permission === "denied"
                ? "Blocked"
                : "Not asked yet"
            }
            sx={{ fontWeight: 600 }}
          />
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            John uses notifications to remind you of events 1 day before + on the day.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          {typeof Notification !== "undefined" && Notification.permission === "default" && (
            <GlassyButton variant="contained" size="small" onClick={() => Notification.requestPermission()}>
              Ask for permission
            </GlassyButton>
          )}
          {typeof Notification !== "undefined" && Notification.permission === "granted" && (
            <GlassyButton size="small" onClick={() => new Notification("JOHN AI", { body: "Notifications are working — you'll get reminders for events.", icon: "/icon.svg" })}>
              Send test notification
            </GlassyButton>
          )}
          {typeof Notification !== "undefined" && Notification.permission === "denied" && (
            <Typography variant="caption" sx={{ opacity: 0.65 }}>
              You've blocked notifications. Open your browser's site settings to re-enable.
            </Typography>
          )}
        </Stack>
      </AnimatedCard>

      <AnimatedCard sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Privacy</Typography>
        <Stack spacing={1}>
          <FormControlLabel
            control={<Switch checked={s.encryptionEnabled} onChange={(e) => set({ encryptionEnabled: e.target.checked })} icon={<LockIcon />} checkedIcon={<LockIcon />} />}
            label="Encrypt counseling notes (passphrase prompt when saving)"
          />
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            All data lives on your device. No telemetry. No analytics.
          </Typography>
        </Stack>
      </AnimatedCard>

      <AnimatedCard sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Backup & restore</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <GlassyButton variant="contained" startIcon={<BackupIcon />} onClick={downloadBackup}>Download backup</GlassyButton>
          <GlassyButton startIcon={<RestoreIcon />} onClick={() => restoreRef.current?.click()}>Restore from backup</GlassyButton>
          <input ref={restoreRef} type="file" accept="application/json" hidden onChange={(e) => restoreFromFile(e.target.files?.[0] ?? null)} />
        </Stack>
        <Typography variant="caption" sx={{ display: "block", mt: 1.5, opacity: 0.65 }}>
          Backup includes all members, prayer requests, sermon notes, events, counseling, follow-up, finance, and settings.
        </Typography>
      </AnimatedCard>
    </Box>
  );
}
