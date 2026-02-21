from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import chromadb
import os
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
import re
from typing import Literal, Optional

app = FastAPI(title="SustainSearch AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup: load model, vector DB, and build in-memory BM25 index
# ---------------------------------------------------------------------------

print("🧠 Loading AI Search Engine...")
model = SentenceTransformer('all-MiniLM-L6-v2')

db_client = chromadb.PersistentClient(path="./vector_db")
collection = db_client.get_collection(name="climate_search")

print("📚 Building BM25 keyword index from all documents...")
_all        = collection.get(include=["documents", "metadatas"])
_doc_ids    = _all["ids"]       # list[str]
_documents  = _all["documents"] # list[str]
_metadatas  = _all["metadatas"] # list[dict]

def _tokenize(text: str) -> list[str]:
    return re.sub(r"[^a-z0-9\s]", " ", text.lower()).split()

_bm25_corpus = [_tokenize(doc) for doc in _documents]
_bm25        = BM25Okapi(_bm25_corpus)
_id_to_idx   = {doc_id: i for i, doc_id in enumerate(_doc_ids)}

print(f"✅ BM25 index ready — {len(_doc_ids)} documents indexed.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def bm25_search(query: str, n: int) -> list[tuple[str, int]]:
    tokens  = _tokenize(query)
    scores  = _bm25.get_scores(tokens)
    ranked  = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    return [(_doc_ids[idx], rank + 1) for rank, idx in enumerate(ranked[:n])]


def vector_search(query: str, n: int) -> list[tuple[str, int]]:
    qv      = model.encode(query).tolist()
    results = collection.query(query_embeddings=[qv], n_results=n, include=["distances"])
    return [(doc_id, rank + 1) for rank, doc_id in enumerate(results["ids"][0])]


def rrf_merge(ranked_lists: list[list[tuple[str, int]]], k: int = 60) -> dict[str, float]:
    scores: dict[str, float] = {}
    for ranked in ranked_lists:
        for doc_id, rank in ranked:
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
    return dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))


def sentiment_label(value: float) -> str:
    if value >= 0.5:
        return "positive"
    elif value <= -0.5:
        return "critical"
    return "neutral"


# ---------------------------------------------------------------------------
# Search endpoint
# ---------------------------------------------------------------------------

@app.get("/search")
def search(
    q: str,
    limit: int = 8,
    mode: Literal["hybrid", "vector", "bm25"] = "hybrid",
    sentiment_filter: Optional[Literal["positive", "neutral", "critical", "all"]] = "all",
):
    # Fetch a larger candidate pool so filtering doesn't starve results
    candidates = max(limit * 6, 40)

    if mode == "vector":
        vec_ranks  = vector_search(q, candidates)
        ranked_ids = [doc_id for doc_id, _ in vec_ranks]
        rank_details = {doc_id: {"vector_rank": r} for doc_id, r in vec_ranks}

    elif mode == "bm25":
        bm25_ranks = bm25_search(q, candidates)
        ranked_ids = [doc_id for doc_id, _ in bm25_ranks]
        rank_details = {doc_id: {"bm25_rank": r} for doc_id, r in bm25_ranks}

    else:  # hybrid
        bm25_ranks = bm25_search(q, candidates)
        vec_ranks  = vector_search(q, candidates)
        fused      = rrf_merge([bm25_ranks, vec_ranks])
        ranked_ids = list(fused.keys())

        bm25_map = {doc_id: r for doc_id, r in bm25_ranks}
        vec_map  = {doc_id: r for doc_id, r in vec_ranks}
        rank_details = {
            doc_id: {
                "rrf_score":   round(fused[doc_id], 6),
                "bm25_rank":   bm25_map.get(doc_id),
                "vector_rank": vec_map.get(doc_id),
            }
            for doc_id in ranked_ids
        }

    if not ranked_ids:
        return {"query": q, "mode": mode, "total_results": 0, "results": []}

    # Fetch metadata + content for the full candidate pool
    fetched = collection.get(ids=ranked_ids, include=["documents", "metadatas"])
    id_to_data = {
        fetched["ids"][i]: {
            "document": fetched["documents"][i],
            "metadata": fetched["metadatas"][i],
        }
        for i in range(len(fetched["ids"]))
    }

    # Build full result list (preserving ranked order), apply sentiment filter
    formatted_results = []
    for doc_id in ranked_ids:
        if doc_id not in id_to_data:
            continue
        data     = id_to_data[doc_id]
        metadata = data["metadata"]
        details  = rank_details.get(doc_id, {})

        sent_value = float(metadata.get("sentiment", 0.0))
        sent_label = sentiment_label(sent_value)

        # Apply sentiment filter
        if sentiment_filter and sentiment_filter != "all":
            if sent_label != sentiment_filter:
                continue

        if mode == "hybrid":
            display_score = details.get("rrf_score", 0)
        elif mode == "bm25":
            display_score = details.get("bm25_rank", 0)
        else:
            display_score = details.get("vector_rank", 0)

        formatted_results.append({
            "id":              doc_id,
            "title":           metadata.get("title", "Untitled"),
            "url":             metadata.get("url") or None,
            "content":         data["document"],
            "score":           display_score,
            "score_detail":    details,
            "sentiment":       sent_value,
            "sentiment_label": sent_label,
        })

        if len(formatted_results) >= limit:
            break

    return {
        "query":         q,
        "mode":          mode,
        "total_results": len(formatted_results),
        "results":       formatted_results,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    print(f"🚀 API is live at http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)