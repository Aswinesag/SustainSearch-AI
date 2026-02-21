"""
Rebuilds the ChromaDB index from scratch with URL metadata included.
Run once after updating ingest_and_clean.py and build_ai_index.py.
"""
import chromadb
import shutil
import os

print("🗑️  Deleting old vector DB...")
if os.path.exists("./vector_db"):
    shutil.rmtree("./vector_db")
    print("✅ Old vector DB removed.")

print("\n📥 Re-ingesting data...")
from ingest_and_clean import run_pipeline
run_pipeline("climate_headlines_sentiment.csv")

print("\n🧠 Re-indexing into ChromaDB...")
from build_ai_index import run_indexing
run_indexing()

print("\n🎉 Done! Vector DB rebuilt with URL metadata.")
