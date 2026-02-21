# 🚀 Deployment Guide — SustainSearch AI (Free Tier)

This guide deploys SustainSearch AI at **zero cost** using:

| Service | Role | Free Tier |
|---|---|---|
| [Hugging Face Spaces](https://huggingface.co/spaces) | FastAPI backend | 16 GB RAM, 2 vCPU, Docker |
| [Vercel](https://vercel.com) | Next.js frontend | Unlimited for hobby projects |

> **Total cost: $0/month**

---

## ⚠️ Before You Start

Make sure the following files are committed to your GitHub repo:

```
sustain-search/
├── app.py
├── ingest_and_clean.py
├── build_ai_index.py
├── requirements.txt
├── Dockerfile                        ← HF Spaces Docker config
├── climate_headlines_sentiment.csv   ← source data (must be committed)
├── README.md
├── DEPLOY.md
└── sustain-search-ui/
```

Push everything to GitHub first:

```bash
git add .
git commit -m "ready for deployment"
git push origin main
```

---

## Part 1 — Deploy the Backend to Hugging Face Spaces

HF Spaces is the best free platform for ML workloads — 16 GB RAM vs Render's 512 MB.
The `Dockerfile` builds the ChromaDB index at image build time, so the container starts quickly.

### Step 1 — Create a Hugging Face account

Sign up at [huggingface.co](https://huggingface.co) (free).

### Step 2 — Create a new Space

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space)
2. Fill in the details:

| Field | Value |
|---|---|
| **Space name** | `sustain-search-api` |
| **SDK** | **Docker** |
| **Visibility** | Public |

3. Click **Create Space**

### Step 3 — Push your backend code to the Space

HF Spaces uses a git repo. Add it as a remote:

```bash
# In d:\sustain-search
git remote add space https://huggingface.co/spaces/YOUR_USERNAME/sustain-search-api

# Push only backend files (not the UI folder)
git subtree push --prefix=. space main
```

> Replace `YOUR_USERNAME` with your HF username.

**Or (simpler):** Clone the Space repo separately, copy your backend files in, and push:

```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/sustain-search-api hf-space
cd hf-space

# Copy backend files
copy ..\sustain-search\app.py .
copy ..\sustain-search\ingest_and_clean.py .
copy ..\sustain-search\build_ai_index.py .
copy ..\sustain-search\requirements.txt .
copy ..\sustain-search\Dockerfile .
copy "..\sustain-search\climate_headlines_sentiment.csv" .

git add .
git commit -m "deploy: SustainSearch AI backend"
git push
```

### Step 4 — Wait for the build

HF Spaces will:
1. Build the Docker image (~10–15 min first time — model download + full dataset indexing)
2. Start the container on port 7860

Your API URL will be:
```
https://YOUR_USERNAME-sustain-search-api.hf.space
```

Test it:
```
https://YOUR_USERNAME-sustain-search-api.hf.space/docs
```

---

## Part 2 — Deploy the Frontend to Vercel

### Step 1 — Create a Vercel account

Sign up at [vercel.com](https://vercel.com) with your GitHub account (free).

### Step 2 — Add the API URL to Vercel

Before deploying, you need to tell the frontend where the backend lives.

In Vercel → your project → **Settings** → **Environment Variables**, add:

```
NEXT_PUBLIC_API_URL = https://YOUR_USERNAME-sustain-search-api.hf.space
```

### Step 3 — Import project on Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select your GitHub repo
2. Set **Root Directory** to `sustain-search-ui`
3. Click **Deploy** — live in ~1 minute

Your live URL:
```
https://sustain-search-ui.vercel.app
```

---

## Part 3 — Test the Live App

| Check | URL |
|---|---|
| Backend API docs | `https://YOUR_USERNAME-sustain-search-api.hf.space/docs` |
| Test search endpoint | `https://YOUR_USERNAME-sustain-search-api.hf.space/search?q=climate&mode=hybrid` |
| Frontend | `https://your-app.vercel.app` |

---

## Free Tier Comparison

| Platform | RAM | Sleep? | Best For |
|---|---|---|---|
| **HF Spaces** ✅ | 16 GB | No (public spaces stay up) | ML backends |
| Render | 512 MB | Yes (15 min idle) | Lightweight APIs |
| Railway | 512 MB | No | General web apps |
| Vercel | Serverless | N/A | Next.js frontends |

---

## Local Development

Everything still works locally — the env var falls back to `localhost:8000`:

```bash
# Backend (d:\sustain-search)
venv\Scripts\activate
python app.py          # → http://localhost:7860

# Frontend (d:\sustain-search\sustain-search-ui)
npm run dev            # → http://localhost:3000
```
