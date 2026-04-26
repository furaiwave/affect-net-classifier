from __future__ import annotations

import io
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, AsyncIterator

import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from model import AffectNetClassifier

from schemas import (
    ALL_EMOTIONS, NUM_CLASSES, VALENCE_AROUSAL_MAP,
    ClassificationResponse, EmotionPrediction, ErrorResponse,
    InferenceResult
)

CHECKPOINT_PATH = Path("checkponts/best_model.pt")
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MODEL_VERSION = "efficientnet-b4-affectnet11-v1.0"

class _ModelState:
    model: AffectNetClassifier
    device: torch.device

_state = _ModelState()

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Завантажувати ваги моделі під час запуску, звільняти під час завершення роботи."""
    _state.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _state.model = AffectNetClassifier(num_classes=NUM_CLASSES)

    if CHECKPOINT_PATH.exists():
        checkpoint = torch.load(CHECKPOINT_PATH, map_location=_state.device, weights_only=True)
        _state.model.load_state_dict(checkpoint["state_dict"])
        print(f"Loaded checkpoint from epoch {checkpoint['epoch']} (val_acc={checkpoint['val_acc']:.4f})")
    else:
        print("WARNING: No checkpoint found — running with random weights (for development only)")

    _state.model.to(_state.device).eval()
    print(f"Model ready on {_state.device}")
    yield

app = FastAPI(
    title="Affectnet-11 Inference API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

def __preprocess(image_bytes: bytes) -> torch.Tensor:
    """
    Декодування PIL → RGB → зміна розміру/обрізка → нормалізація.
    Точно відповідає перетворенню val/test із файлу model.py.
    """
    from torchvision import transforms

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError as e:
        raise ValueError(f"Cannot decode image: {e}") from e

    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return transform(img).unsqueeze(0)

@app.post(
    "/classify",
    response_model=InferenceResult,
    responses={
        200: { "description": "Successful classification" },
        422: { "description": "Invalis image format" },
        500: { "description": "Model inference error" },
    }
)

async def classify_image(
    file: Annotated[UploadFile, File(description="Face image(JPEG/PNG/WebP, max 10MB)")],
) -> InferenceResult:
    if file.content_type not in ("image/jpeg", "image/png", "image/webp", "image/bmp"):
        return ErrorResponse(
            status="error",
            code="INVALID_FORMAT",
            message=f"Unsupported content type: {file.content_type}",
        )

    raw = await file.read()

    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Image exceeds {MAX_IMAGE_BYTES // 1024 // 1024} MB limit",
        )

    try:
        tensor = __preprocess(raw)
    except ValueError as e:
        return ErrorResponse(
            status="error",
            code="INVALID_FORMAT",
            message=str(e),
        )

    try:
        t0 = time.perf_counter()

        with torch.inference_mode():
            tensor = tensor.to(_state.device)
            logits, va = _state.model(tensor)
            probs = F.softmax(logits, dim=1).squeeze(0)

        inference_ms = (time.perf_counter() - t0) * 1000

        prob_list = probs.cpu().tolist()
        ranked_indices = sorted(range(NUM_CLASSES), key=lambda i: prob_list[i], reverse=True)
        predictions = [
            EmotionPrediction(
                label=ALL_EMOTIONS[idx],
                confidence=round(prob_list[idx], 6),
                rank=rank + 1,
            )
            for rank, idx in enumerate(ranked_indices)
        ]

        top = predictions[0]
        va_coords = va.squeeze(0).cpu().tolist()

        return ClassificationResponse(
            status = "success",
            top_emotion = top.label,
            confidence = round(top.confidence, 6),
            all_predictions = predictions,
            valence = round(va_coords[0], 4),
            arousal = round(va_coords[1], 4),
            inference_ms = round(inference_ms, 2),
            model_version = MODEL_VERSION,
        )

    except Exception as e:
        return ErrorResponse(
            status="error",
            code="MODEL_ERROR",
            message="Inference failed",
            details=str(e),
        )

@app.get('/health')
async def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "device": str(_state.device),
        "num_classes": NUM_CLASSES,
        "emotions": list(ALL_EMOTIONS)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)