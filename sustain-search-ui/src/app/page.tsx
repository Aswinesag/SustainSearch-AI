"use client";

import { useMemo, useState } from "react";

type SearchMode = "hybrid" | "vector" | "bm25";
type SentimentFilter = "all" | "positive" | "neutral" | "critical";

interface ScoreDetail {
  rrf_score?: number;
  bm25_rank?: number;
  vector_rank?: number;
}

interface SearchResult {
  id: string;
  title: string;
  url: string | null;
  content: string;
  score: number;
  score_detail: ScoreDetail;
  sentiment: number;
  sentiment_label: "positive" | "neutral" | "critical";
}

// ─── Config ──────────────────────────────────────────────────────────────
const MODES: { id: SearchMode; label: string; icon: string; desc: string }[] = [
  { id: "hybrid", label: "Hybrid", icon: "⚡", desc: "BM25 + Semantic (best results)" },
  { id: "vector", label: "Semantic", icon: "🧠", desc: "Vector similarity search" },
  { id: "bm25", label: "Keyword", icon: "🔑", desc: "Exact keyword matching (BM25)" },
];

const SENTIMENT_FILTERS: { id: SentimentFilter; label: string; icon: string; color: string }[] = [
  { id: "all", label: "All", icon: "🌐", color: "gray" },
  { id: "positive", label: "Positive", icon: "🌱", color: "green" },
  { id: "neutral", label: "Neutral", icon: "⚖️", color: "amber" },
  { id: "critical", label: "Critical", icon: "⚠️", color: "red" },
];

const SENTIMENT_STYLES = {
  positive: {
    border: "border-green-500",
    bg: "bg-green-50",
    badge: "bg-green-100 text-green-800",
    icon: "🌱",
    label: "Positive",
  },
  neutral: {
    border: "border-amber-400",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    icon: "⚖️",
    label: "Neutral",
  },
  critical: {
    border: "border-red-500",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-800",
    icon: "⚠️",
    label: "Critical",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function sentimentBar(value: number): { width: string; color: string } {
  // value is -1.0 … 1.0  → map to 0…100%
  const pct = Math.round(((value + 1) / 2) * 100);
  const color =
    value >= 0.5 ? "#22c55e"  // green-500
      : value <= -0.5 ? "#ef4444"  // red-500
        : "#f59e0b";                  // amber-400
  return { width: `${pct}%`, color };
}

function HighlightedText({ text, query, active }: { text: string; query: string; active: boolean }) {
  if (!active || !query.trim()) return <span>{text}</span>;
  const words = query.trim().split(/\s+/).filter(Boolean);
  const pattern = new RegExp(
    `(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi"
  );
  const parts = text.split(pattern);
  return (
    <span>
      {parts.map((part, i) =>
        pattern.test(part)
          ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

function ScoreBadge({ mode, detail }: { mode: SearchMode; detail: ScoreDetail }) {
  if (mode === "hybrid") return (
    <div className="flex flex-wrap gap-2">
      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
        ⚡ RRF {detail.rrf_score?.toFixed(4)}
      </span>
      {detail.bm25_rank && (
        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full">
          🔑 #{detail.bm25_rank}
        </span>
      )}
      {detail.vector_rank && (
        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
          🧠 #{detail.vector_rank}
        </span>
      )}
    </div>
  );
  if (mode === "bm25") return (
    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
      🔑 BM25 Rank #{detail.bm25_rank}
    </span>
  );
  return (
    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
      🧠 Vector Rank #{detail.vector_rank}
    </span>
  );
}

// ─── Analytics bar ───────────────────────────────────────────────────────

function SentimentDistribution({ results }: { results: SearchResult[] }) {
  const counts = useMemo(() => {
    const c = { positive: 0, neutral: 0, critical: 0 };
    results.forEach(r => { c[r.sentiment_label] = (c[r.sentiment_label] ?? 0) + 1; });
    return c;
  }, [results]);

  const total = results.length;
  if (total === 0) return null;

  const avgSentiment = results.reduce((s, r) => s + r.sentiment, 0) / total;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">📊 Sentiment Distribution</span>
        <span className="text-xs text-gray-400">
          Avg score: <span className={
            avgSentiment >= 0.5 ? "text-green-600 font-bold"
              : avgSentiment <= -0.5 ? "text-red-600 font-bold"
                : "text-amber-600 font-bold"
          }>{avgSentiment.toFixed(2)}</span>
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
        {counts.positive > 0 && (
          <div
            className="bg-green-400 transition-all"
            style={{ width: `${(counts.positive / total) * 100}%` }}
            title={`Positive: ${counts.positive}`}
          />
        )}
        {counts.neutral > 0 && (
          <div
            className="bg-amber-300 transition-all"
            style={{ width: `${(counts.neutral / total) * 100}%` }}
            title={`Neutral: ${counts.neutral}`}
          />
        )}
        {counts.critical > 0 && (
          <div
            className="bg-red-400 transition-all"
            style={{ width: `${(counts.critical / total) * 100}%` }}
            title={`Critical: ${counts.critical}`}
          />
        )}
      </div>

      {/* Legend counts */}
      <div className="flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" />
          🌱 Positive <strong>{counts.positive}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-300" />
          ⚖️ Neutral <strong>{counts.neutral}</strong>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />
          ⚠️ Critical <strong>{counts.critical}</strong>
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function Home() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searchedMode, setSearchedMode] = useState<SearchMode>("hybrid");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const url = `${base}/search?q=${encodeURIComponent(query)}&mode=${mode}&sentiment_filter=${sentimentFilter}&limit=8`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results ?? []);
      setSearchedQuery(query);
      setSearchedMode(mode);
    } catch {
      alert("Make sure your FastAPI server is running on localhost:8000");
    } finally {
      setLoading(false);
    }
  };

  const highlightActive = searchedMode === "bm25" || searchedMode === "hybrid";

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-emerald-800 mb-3">🌱 SustainSearch AI</h1>
          <p className="text-lg text-gray-600">Semantic Intelligence for Climate &amp; Sustainability Data</p>
        </div>

        {/* Search Mode Toggle */}
        <div className="flex justify-center gap-2 mb-4">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.desc}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm border ${mode === m.id
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105"
                : "bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700"
                }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Sentiment Filter Toggle */}
        <div className="flex justify-center gap-2 mb-2">
          {SENTIMENT_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setSentimentFilter(f.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${sentimentFilter === f.id
                ? f.id === "positive" ? "bg-green-500 text-white border-green-500"
                  : f.id === "critical" ? "bg-red-500 text-white border-red-500"
                    : f.id === "neutral" ? "bg-amber-400 text-white border-amber-400"
                      : "bg-gray-600 text-white border-gray-600"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mb-6">
          {MODES.find(m => m.id === mode)?.desc}
          {sentimentFilter !== "all" && ` · showing ${sentimentFilter} news only`}
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            className="flex-1 p-4 rounded-full border-2 border-gray-200 focus:border-emerald-500 outline-none shadow-sm transition-all text-black"
            placeholder="Search 'Amazon drought', 'carbon policy'…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-bold transition-colors shadow-lg disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Search"}
          </button>
        </form>

        {/* Analytics bar */}
        {results.length > 0 && <SentimentDistribution results={results} />}

        {/* Results */}
        <div className="space-y-5">
          {results.length > 0 ? (
            results.map((res, idx) => {
              const sty = SENTIMENT_STYLES[res.sentiment_label];
              const bar = sentimentBar(res.sentiment);
              return (
                <div
                  key={res.id ?? idx}
                  className={`bg-white p-6 rounded-xl shadow-md border-l-4 ${sty.border} hover:shadow-lg transition-shadow`}
                >
                  {/* Title */}
                  <h3 className="text-xl font-bold text-emerald-900 mb-2">
                    {res.url
                      ? <a href={res.url} target="_blank" rel="noopener noreferrer"
                        className="hover:text-emerald-600 hover:underline transition-colors">
                        {res.title}
                      </a>
                      : res.title}
                  </h3>

                  {/* Content */}
                  <p className="text-gray-700 leading-relaxed mb-3">
                    <HighlightedText text={res.content} query={searchedQuery} active={highlightActive} />
                  </p>

                  {/* URL */}
                  {res.url && (
                    <div className="mb-3">
                      <a href={res.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-800 hover:underline break-all">
                        🔗 {res.url}
                      </a>
                    </div>
                  )}

                  {/* Sentiment mini-bar */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sty.badge}`}>
                        {sty.icon} {sty.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        Sentiment: {res.sentiment.toFixed(1)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: bar.width, backgroundColor: bar.color }}
                      />
                    </div>
                  </div>

                  {/* Search score */}
                  <ScoreBadge mode={searchedMode} detail={res.score_detail} />
                </div>
              );
            })
          ) : !loading && searchedQuery ? (
            <p className="text-center text-gray-500 py-8">
              No results found for &quot;{searchedQuery}&quot;
              {sentimentFilter !== "all" && ` with ${sentimentFilter} sentiment`}.
            </p>
          ) : null}
        </div>

      </div>
    </main>
  );
}