# main.py
# Developer: Marcus Daley
# Date: 2026-05-04
# Purpose: FastAPI sidecar serving MentalRoBERTa crisis classification for VetAssist

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

LOG_LEVEL = os.getenv("LOG_LEVEL", "info").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
log = logging.getLogger(__name__)

MODEL_NAME = "mental/mental-roberta-base"
MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "/model-cache")

# Module-level model state — loaded once at startup
_tokenizer = None
_model = None
_model_ready = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _tokenizer, _model, _model_ready
    log.info("Loading %s from cache dir %s", MODEL_NAME, MODEL_CACHE_DIR)
    try:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir=MODEL_CACHE_DIR)
        _model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_NAME, cache_dir=MODEL_CACHE_DIR
        )
        _model.eval()
        _model_ready = True
        log.info("Model loaded successfully")
    except Exception as exc:
        log.error("Model failed to load: %s", exc)
        _model_ready = False
    yield
    log.info("Shutting down ml-pipeline")


app = FastAPI(title="VetAssist ML Pipeline", lifespan=lifespan)


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    level: int
    confidence: float


def _confidence_to_level(confidence: float) -> int:
    if confidence >= 0.85:
        return 3
    if confidence >= 0.70:
        return 2
    if confidence >= 0.50:
        return 1
    return 0


@app.post("/crisis/classify", response_model=ClassifyResponse)
async def classify(req: ClassifyRequest) -> ClassifyResponse:
    if not _model_ready:
        raise HTTPException(status_code=503, detail="model_loading")
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=422, detail="text_required")
    try:
        inputs = _tokenizer(
            req.text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True,
        )
        with torch.no_grad():
            outputs = _model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1)
        # Index 1 = crisis class for binary mental health classifiers
        confidence = float(probs[0][1].item())
        level = _confidence_to_level(confidence)
        return ClassifyResponse(level=level, confidence=confidence)
    except Exception as exc:
        log.error("Inference failed: %s", exc)
        raise HTTPException(status_code=500, detail="inference_failed") from exc


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "model": "loaded" if _model_ready else "loading"}
