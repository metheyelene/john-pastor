# John — AI Pastor Assistant

A free, private, offline-capable pastor assistant for sermons, prayer, members, counseling, Bible study, events, follow-up, and finance. Designed for one pastor's daily use on Android phone + tablet, with a vibrant glassmorphism UI.

## Quick start
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npx serve dist   # serve the built PWA locally
```

## Install on Android (zero friction)
1. `npm run build` and host `dist/` on any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, your own server).
2. Pastor opens the URL on Android **Chrome**.
3. Menu → "Add to Home Screen" → app icon, fullscreen, offline-capable.

## Real APK (optional)
```bash
npm i -D @capacitor/cli
npx cap add android
npx cap sync
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## Modules
Dashboard · Members · Prayer · Sermon Notes (with presenter mode) · Sermon Assistant · Past Sermons · Events (with calendar + reminders) · Counseling · Bible · Follow-up · Finance · Profile (auto-built resume card) · Settings.

## Bible
- English default: **KJV** via `bible-api.com` (free, public domain).
- For **NIV**: paste your api.bible key + bible ID in Settings → Custom Bible Sources.
- Telugu default: a small bundled **BSI Telugu** sample (Genesis 1 + John 1) so the UI shows real content.
- For full BSI Telugu: paste a Bible JSON URL in Settings, or upload a JSON file.

## AI
- Sermon Assistant uses any OpenAI-compatible endpoint (OpenAI, Ollama, etc.).
- Paste base URL + API key in Settings. Without a key, John shows a structured stub outline.

## Privacy
All data is stored locally in IndexedDB on the pastor's device. Optional AES-GCM encryption with a user passphrase. No telemetry, no analytics, no remote calls except the Bible + AI endpoints the pastor explicitly configures.
