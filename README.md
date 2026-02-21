---
title: SustainSearch API
emoji: 🌱
colorFrom: green
colorTo: emerald
sdk: docker
pinned: false
---

# 🌱 SustainSearch AI

> **Semantic Intelligence for Climate & Sustainability Data**

SustainSearch AI is a full-stack intelligent search engine built for climate and sustainability journalism. It combines **BM25 keyword search** with **vector semantic search** via a Reciprocal Rank Fusion (RRF) pipeline, backed by a curated dataset of 1,000+ real climate news articles with sentiment annotations.

---

## ✨ Features

| Feature | Description |
|---|---|
| ⚡ **Hybrid Search** | Combines BM25 exact-keyword matching + semantic vector similarity for best-of-both results |
| 🧠 **Semantic Search** | Sentence-Transformer embeddings (`all-MiniLM-L6-v2`) stored in ChromaDB |
| 🔑 **Keyword Search** | BM25Okapi index built at server startup, supports exact-phrase matching |
| 🌐 **Search Mode Toggle** | Switch between Hybrid / Semantic / Keyword directly from the UI |
| 🌱 **Sentiment Filtering** | Filter results by Positive / Neutral / Critical news tone |
| 📊 **Sentiment Analytics** | Stacked distribution bar + average score across every search result set |
| 🎨 **Color-coded Results** | Cards are green (positive), amber (neutral), or red (critical) based on AI sentiment |
| 🔗 **Clickable Source Links** | Every result links directly to the original news article |
| 🔍 **Keyword Highlighting** | Searched terms are highlighted in yellow inside result snippets (Hybrid & Keyword modes) |
| 🏷️ **Score Transparency** | Each result shows RRF score, BM25 rank, and Vector rank simultaneously |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Frontend                   │
│  Mode Toggle · Sentiment Filter · Analytics Bar      │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP (localhost:8000)
┌─────────────────────▼───────────────────────────────┐
│                FastAPI Backend (app.py)               │
│                                                      │
│  ┌──────────────┐        ┌──────────────────────┐   │
│  │  BM25 Index  │        │  ChromaDB Vector DB  │   │
│  │ (rank-bm25)  │        │ (sentence-transformers│   │
│  │ in-memory    │        │  all-MiniLM-L6-v2)   │   │
│  └──────┬───────┘        └──────────┬───────────┘   │
│         │  Ranked list              │  Ranked list   │
│         └─────────────┬─────────────┘               │
│                       ▼                              │
│           Reciprocal Rank Fusion (RRF)               │
│           Sentiment Filter (post-RRF)                │
└──────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│             Data Pipeline                            │
│  CSV → ingest_and_clean.py → build_ai_index.py       │
│  climate_headlines_sentiment.csv (1,025 articles)    │
└──────────────────────────────────────────────────────┘
```

---

## 🗂️ Project Structure

```
sustain-search/
│
├── app.py                          # FastAPI backend — hybrid search engine
├── ingest_and_clean.py             # Step 1: clean CSV → JSON docs
├── build_ai_index.py               # Step 2: embed docs → ChromaDB
├── rebuild_index.py                # Helper: wipe & rebuild index from scratch
├── requirements.txt                # Python dependencies
├── climate_headlines_sentiment.csv # Source dataset (1,025 articles)
├── data/cleaned/                   # Cleaned JSON documents (auto-generated)
├── vector_db/                      # ChromaDB persistent store (auto-generated)
│
└── sustain-search-ui/              # Next.js 16 frontend
    └── src/app/
        └── page.tsx                # Main search UI
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Backend Setup

```bash
# Clone the repo and enter the project root
cd sustain-search

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Build the Search Index

Run the pipeline **once** to clean the dataset and embed all documents:

```bash
python rebuild_index.py
```

This will:
1. Delete any existing `vector_db/` and `data/cleaned/`
2. Re-ingest & clean the CSV (titles, URLs, sentiment scores)
3. Re-embed all documents using `all-MiniLM-L6-v2`
4. Build the ChromaDB vector store
5. Build the in-memory BM25 index (done automatically at server start)

### 3. Start the API Server

```bash
python app.py
# → API live at http://localhost:8000
# → Docs at  http://localhost:8000/docs
```

### 4. Start the Frontend

```bash
cd sustain-search-ui
npm install
npm run dev
# → UI live at http://localhost:3000
```

---

## 🔌 API Reference

### `GET /search`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | string | required | Search query |
| `mode` | `hybrid` \| `vector` \| `bm25` | `hybrid` | Search algorithm |
| `sentiment_filter` | `all` \| `positive` \| `neutral` \| `critical` | `all` | Filter by news tone |
| `limit` | integer | `8` | Max results to return |

**Sentiment mapping:**

| Label | Score Range | Meaning |
|---|---|---|
| 🌱 Positive | ≥ 0.5 | Hopeful, solution-oriented |
| ⚖️ Neutral | -0.5 to 0.5 | Informational, balanced |
| ⚠️ Critical | ≤ -0.5 | Concerning, crisis-related |

**Example responses:**

```bash
# Hybrid search
GET /search?q=Amazon+drought&mode=hybrid&limit=5

# Keyword-only + filter for positive news
GET /search?q=renewable+energy&mode=bm25&sentiment_filter=positive

# Semantic + critical news only
GET /search?q=ocean+warming&mode=vector&sentiment_filter=critical
```

**Response shape:**

```json
{
  "query": "Amazon drought",
  "mode": "hybrid",
  "total_results": 5,
  "results": [
    {
      "id": "news_7",
      "title": "Amazon's record drought driven by climate change - BBC",
      "url": "https://www.bbc.com/news/science-environment-68032361",
      "content": "It was the main driver of the Amazon rainforest's worst drought...",
      "score": 0.0284,
      "score_detail": {
        "rrf_score": 0.028437,
        "bm25_rank": 1,
        "vector_rank": 4
      },
      "sentiment": -1.0,
      "sentiment_label": "critical"
    }
  ]
}
```

---

## 🧪 Testing the Search Modes

Once both servers are running, try these queries to compare modes:

| Query | Suggested Mode | What to observe |
|---|---|---|
| `Amazon drought` | **Keyword** | Exact word matches rank first |
| `shrinking glaciers` | **Semantic** | Related articles without exact words |
| `record temperature 2023` | **Hybrid** | Best combined coverage |
| `renewable energy policy` | **Hybrid** + Positive | Hopeful stories only |
| `climate crisis warning` | **Hybrid** + Critical | Crisis and warning articles |

---

## 🛠️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — async REST API
- [ChromaDB](https://www.trychroma.com/) — vector database
- [sentence-transformers](https://www.sbert.net/) — `all-MiniLM-L6-v2` embeddings
- [rank-bm25](https://github.com/dorianbrown/rank_bm25) — BM25Okapi keyword index

**Frontend**
- [Next.js 16](https://nextjs.org/) — React framework
- [Tailwind CSS v4](https://tailwindcss.com/) — utility-first styling
- TypeScript

**Dataset**
- `climate_headlines_sentiment.csv` — 1,025 climate & sustainability news articles scraped from global sources (BBC, Reuters, Guardian, Al Jazeera, etc.), annotated with sentiment scores from -1.0 to +1.0.

---