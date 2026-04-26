from __future__ import annotations

from typing import Annotated, Literal, TypeAlias, get_args

from pydantic import BaseModel, Field, model_validator

_EMOTION_TUPLE = (
    "neutral",
    "happiness",
    "sadness",
    "surprise",
    "fear",
    "disgust",
    "anger",
    "contempt",
    "anxiety",
    "helplessness",
    "disappointment",
)

EmotionLabel: TypeAlias = Literal[
    "neutral",
    "happiness",
    "sadness",
    "surprise",
    "fear",
    "disgust",
    "anger",
    "contempt",
    "anxiety",
    "helplessness",
    "disappointment",
]

ALL_EMOTIONS: tuple[EmotionLabel, ...] = _EMOTION_TUPLE
NUM_CLASSES: Literal[11] = 11

assert len(ALL_EMOTIONS) == NUM_CLASSES

ConfidenceScore = Annotated[float, Field(ge=0.0, le=1.0, description="[0, 1] confidence")]
ImagePathStr = Annotated[str, Field(min_length=1, pattern=r".*\.(jpg|jpeg|png|webp|bmp)$")]


class EmotionPrediction(BaseModel):
    label: EmotionLabel
    confidence: ConfidenceScore
    rank: Annotated[int, Field(ge=1, le=NUM_CLASSES)]

    model_config = {"frozen": True}


class ClassificationResponse(BaseModel):
    status: Literal["success"]
    top_emotion: EmotionLabel
    confidence: ConfidenceScore
    all_predictions: Annotated[
        list[EmotionPrediction],
        Field(min_length=NUM_CLASSES, max_length=NUM_CLASSES),
    ]
    valence: Annotated[float, Field(ge=-1.0, le=1.0)]
    arousal: Annotated[float, Field(ge=-1.0, le=1.0)]
    inference_ms: Annotated[float, Field(ge=0.0)]
    model_version: str

    @model_validator(mode="after")
    def validate_probabilities_sum(self) -> "ClassificationResponse":
        total = sum(p.confidence for p in self.all_predictions)
        if not (0.98 <= total <= 1.02):
            raise ValueError(f"Probabilities must sum to ~1.0, got {total:.4f}")
        return self

    @model_validator(mode="after")
    def validate_top_matches_predictions(self) -> "ClassificationResponse":
        best = max(self.all_predictions, key=lambda p: p.confidence)
        if best.label != self.top_emotion:
            raise ValueError(
                f"top_emotion '{self.top_emotion}' does not match "
                f"highest-confidence prediction '{best.label}'"
            )
        return self


class ErrorResponse(BaseModel):
    status: Literal["error"]
    code: Literal["NO_FACE", "POOR_QUALITY", "INVALID_FORMAT", "MODEL_ERROR"]
    message: str
    details: str | None = None


InferenceResult: TypeAlias = ClassificationResponse | ErrorResponse

VALENCE_AROUSAL_MAP: dict[EmotionLabel, tuple[float, float]] = {
    "neutral": (0.00, 0.00),
    "happiness": (0.85, 0.40),
    "sadness": (-0.70, -0.30),
    "surprise": (0.10, 0.75),
    "fear": (-0.60, 0.70),
    "disgust": (-0.65, 0.20),
    "anger": (-0.55, 0.65),
    "contempt": (-0.45, 0.10),
    "anxiety": (-0.40, 0.60),
    "helplessness": (-0.50, -0.50),
    "disappointment": (-0.60, -0.40),
}


def _assert_full_coverage() -> None:
    missing = set(ALL_EMOTIONS) - set(VALENCE_AROUSAL_MAP.keys())
    if missing:
        raise RuntimeError(f"VALENCE_AROUSAL_MAP missing entries for: {missing}")


_assert_full_coverage()
