import pandas as pd
import json
import os
import re

def clean_text(text):
    if not isinstance(text, str): return ""
    text = re.sub(r'http\S+', '', text) # Remove links
    text = re.sub(r'[^\x00-\x7F]+', ' ', text) # Remove emojis
    return " ".join(text.split())

def run_pipeline(csv_path, output_dir="data/cleaned"):
    os.makedirs(output_dir, exist_ok=True)
    df = pd.read_csv(csv_path)
    
    print(f"🚜 Processing {len(df)} records...")
    for i, row in df.iterrows():
        try:
            sentiment = float(row.get('Sentiment', 0.0))
        except (ValueError, TypeError):
            sentiment = 0.0

        doc = {
            "id": f"news_{i}",
            "title": clean_text(row.get('Headline', 'Untitled')),
            "url": str(row.get('Link', '')).strip(),
            "sentiment": sentiment,
            "content": clean_text(row.get('Content', '')),
            "metadata": {"row": i}
        }

        if len(doc["content"]) > 20:
            with open(os.path.join(output_dir, f"{doc['id']}.json"), "w") as f:
                json.dump(doc, f)

if __name__ == "__main__":
    run_pipeline("climate_headlines_sentiment.csv")
    print("✅Complete: Data cleaned and stored.")