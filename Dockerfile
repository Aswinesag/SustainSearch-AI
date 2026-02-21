FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source files
COPY app.py ingest_and_clean.py build_ai_index.py climate_headlines_sentiment.csv ./

# Pre-build the search index at image build time
# This keeps the container startup fast and avoids OOM at runtime
RUN python ingest_and_clean.py climate_headlines_sentiment.csv && \
    python build_ai_index.py

# HF Spaces default port
EXPOSE 7860

CMD ["python", "app.py"]
