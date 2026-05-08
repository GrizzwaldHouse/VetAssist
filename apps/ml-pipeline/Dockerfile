# Dockerfile
# Developer: Marcus Daley
# Date: 2026-05-04
# Purpose: Container for VetAssist MentalRoBERTa classification sidecar

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

ENV MODEL_CACHE_DIR=/model-cache
ENV LOG_LEVEL=info

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
