import chromadb
from sentence_transformers import SentenceTransformer
import json
import os

def run_indexing(input_dir="data/cleaned"):
    print("🧠 Loading AI Model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    client = chromadb.PersistentClient(path="./vector_db")
    
    collection = client.get_or_create_collection(name="climate_search")

    files = [f for f in os.listdir(input_dir) if f.endswith(".json")]
    if not files:
        print(f"❌ No JSON files found in {input_dir}.")
        return

    print(f"🚀 Found {len(files)} files. Indexing into AI Brain...")

    for i, filename in enumerate(files):
        with open(os.path.join(input_dir, filename), "r", encoding="utf-8") as f:
            data = json.load(f)
            
            collection.add(
                documents=[data["content"]],
                metadatas=[{
                    "title":     data["title"],
                    "url":       data.get("url", ""),
                    "sentiment": float(data.get("sentiment", 0.0)),
                }],
                ids=[data["id"]]
            )
        
        if (i + 1) % 50 == 0:
            print(f"✅ Indexed {i+1}/{len(files)} documents...")

    print("\n✨Complete! AI Index is ready in /vector_db")

if __name__ == "__main__":
    run_indexing()