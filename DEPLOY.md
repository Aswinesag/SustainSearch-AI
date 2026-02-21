# 🚀 Deployment Guide — SustainSearch AI (Free Tier)

This guide deploys SustainSearch AI at **zero cost** using:

| Service | Role | Free Tier |
|---|---|---|
| [Render.com](https://render.com) | FastAPI backend | 750 hrs/month, 512 MB RAM |
| [Vercel](https://vercel.com) | Next.js frontend | Unlimited for hobby projects |

> **Total cost: $0/month**

---

## ⚠️ Before You Start

Make sure the following are committed to your GitHub repo:

```
sustain-search/
├── app.py
├── ingest_and_clean.py
├── build_ai_index.py
├── requirements.txt
├── render.yaml                       ← Render build config
├── climate_headlines_sentiment.csv   ← must be committed (not gitignored)
└── sustain-search-ui/                ← entire UI folder (no nested .git)
```

> `vector_db/` and `data/cleaned/` are gitignored — Render will **rebuild the index automatically** on every deploy via the build command in `render.yaml`.

Push everything to GitHub first:

```bash
git add .
git commit -m "ready for deployment"
git push origin main
```

---

## Part 1 — Deploy the Backend to Render.com

### Step 1 — Create a Render account

Sign up at [render.com](https://render.com) (free, no credit card required).

### Step 2 — New Web Service

1. Dashboard → **New** → **Web Service**
2. Connect your GitHub account and select your repository
3. Render will auto-detect `render.yaml` — click **Continue**

### Step 3 — Verify the build settings

Render reads these from `render.yaml`, but double-check they're correct:

| Setting | Value |
|---|---|
| **Environment** | Python |
| **Build Command** | `pip install -r requirements.txt && python ingest_and_clean.py climate_headlines_sentiment.csv && python build_ai_index.py` |
| **Start Command** | `python app.py` |
| **Instance Type** | Free |

> 🕐 **First build takes 5–10 minutes** — the sentence-transformer model (~90 MB) must be downloaded and the entire dataset embedded on first deploy.

### Step 4 — Copy your backend URL

Once the deploy succeeds, Render gives you a URL like:
```
https://sustain-search-api.onrender.com
```
**Copy this — you'll need it for the frontend.**

---

## Part 2 — Deploy the Frontend to Vercel

### Step 1 — Create a Vercel account

Sign up at [vercel.com](https://vercel.com) with your GitHub account (free).

### Step 2 — Update the API base URL

Before deploying, update the API URL in the frontend to point to your Render backend instead of `localhost`.

Open `sustain-search-ui/src/app/page.tsx` and find this line inside `handleSearch`:

```ts
// Before (local development)
const url = `http://localhost:8000/search?...`

// After (production) — replace with your actual Render URL
const url = `https://sustain-search-api.onrender.com/search?...`
```

Save, commit, and push:

```bash
git add sustain-search-ui/src/app/page.tsx
git commit -m "chore: point frontend to Render backend URL"
git push origin main
```

### Step 3 — Import project on Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Select your repo
3. Set the **Root Directory** to `sustain-search-ui`
4. Leave all other settings as default — Vercel auto-detects Next.js

| Setting | Value |
|---|---|
| **Framework** | Next.js (auto-detected) |
| **Root Directory** | `sustain-search-ui` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `.next` (default) |

5. Click **Deploy** — done in ~1 minute

Your live URL will be:
```
https://sustain-search-ui.vercel.app
```

---

## Part 3 — Test the Live App

Open your Vercel URL and try a search. If you get a network error, check:

1. **Backend is awake** — Render free tier **sleeps after 15 minutes of inactivity**. The first request after sleep takes ~30 seconds to wake up. Visit `https://sustain-search-api.onrender.com/docs` directly to wake it.
2. **CORS** — `app.py` already allows all origins (`allow_origins=["*"]`), so this should not be an issue.
3. **Build logs** — Check Render's "Logs" tab to confirm the index was built successfully.

---

## 🔁 Keeping It Free — Tips & Limits

| Limit | Detail |
|---|---|
| Render free tier sleeps | After 15 min idle; first request takes ~30s to wake |
| 750 hrs/month | ~1 service running continuously — enough for 1 backend |
| 512 MB RAM | Sufficient for this stack (model + BM25 + ChromaDB) |
| Vercel hobby | Unlimited bandwidth, no sleep, perfect for static/SSR |
| Rebuild on redeploy | Every Render deploy re-ingests & re-embeds (~5–10 min) |

---

## 🌐 Optional: Use an Environment Variable for the API URL

Instead of hardcoding the Render URL in `page.tsx`, use a Next.js environment variable so you can switch between local and production easily.

**`sustain-search-ui/.env.local`** (for local dev, don't commit):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**In Vercel** → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL = https://sustain-search-api.onrender.com
```

**`page.tsx`** — replace the hardcoded URL with:
```ts
const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const url  = `${base}/search?q=${encodeURIComponent(query)}&mode=${mode}&sentiment_filter=${sentimentFilter}&limit=8`;
```

This way, local dev uses `localhost` and production automatically uses Render — no code changes needed per environment.

---

## Summary

```
GitHub repo
    ├── Render.com  →  builds index + runs FastAPI  →  https://your-app.onrender.com
    └── Vercel      →  serves Next.js UI            →  https://your-app.vercel.app
```
