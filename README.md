# Affective State Classification System
## Система мультикласової класифікації розширених афективних станів

---

## Архітектура

```
┌─────────────────┐     HTTP/multipart     ┌──────────────────────┐     HTTP/multipart    ┌─────────────────────────────┐
│   React UI      │ ──────────────────────▶ │   NestJS Gateway     │ ─────────────────────▶│  Python FastAPI ML Service  │
│  (port 5173)    │ ◀────────────────────── │   (port 3001)        │ ◀────────────────────│  (port 8000)                │
└─────────────────┘    GatewayResponse      └──────────────────────┘    InferenceResult    └─────────────────────────────┘
                                                                                                         │
                                                                                             EfficientNet-B4 (ImageNet)
                                                                                             Fine-tuned: AffectNet-11
                                                                                             + Valence/Arousal regression
```

## Класи емоцій (AffectNet-11)

| # | Label          | Valence | Arousal | Quadrant              |
|---|----------------|---------|---------|-----------------------|
| 0 | neutral        |  0.00   |  0.00   | center                |
| 1 | happiness      | +0.85   | +0.40   | high-arousal-positive |
| 2 | sadness        | -0.70   | -0.30   | low-arousal-negative  |
| 3 | surprise       | +0.10   | +0.75   | high-arousal-positive |
| 4 | fear           | -0.60   | +0.70   | high-arousal-negative |
| 5 | disgust        | -0.65   | +0.20   | high-arousal-negative |
| 6 | anger          | -0.55   | +0.65   | high-arousal-negative |
| 7 | contempt       | -0.45   | +0.10   | low-arousal-negative  |
| 8 | anxiety        | -0.40   | +0.60   | high-arousal-negative |
| 9 | helplessness   | -0.50   | -0.50   | low-arousal-negative  |
|10 | disappointment | -0.60   | -0.40   | low-arousal-negative  |

## Модель

- **Backbone**: EfficientNet-B4 (ImageNet pretrained)
- **Head**: GlobalAvgPool → Dropout(0.4) → FC(1792→512) → BN → GELU → FC(512→11)
- **Auxiliary**: V/A regression head → Tanh output in [-1, 1]
- **Loss**: Label smoothing CE (ε=0.1) + MSE for V/A (λ=0.3)
- **Aug**: RandomResizedCrop, ColorJitter, RandomErasing, Mixup(α=0.4)
- **Optim**: AdamW + CosineAnnealingWarmRestarts
- **Expected accuracy on AffectNet-val**: ~62-65%

## Запуск

### Python ML Service
```bash
cd python-ml
pip install -r requirements.txt
# Train (optional — requires AffectNet dataset):
python -c "from model import train, AffectNetClassifier; ..."
# Serve:
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### NestJS API Gateway
```bash
cd nestjs-api
npm install
npm run start:dev    # port 3001
```

### React UI
```bash
cd react-ui
npm install
npm run dev          # port 5173
```

## Типізація

```
Python (Pydantic v2 Literal types)
        │
        ▼
NestJS (Zod schema validation + branded types)
        │
        ▼
React  (discriminated ApiState<T> union + infer)
```

Всі 11 emotion labels — `Literal` / `const tuple` у всіх трьох сервісах.
Жодного вільного `string` там де потрібен `EmotionLabel`.
Жодного `any` у виробничому коді.

## Структура файлів

```
affective-system/
├── python-ml/
│   ├── types.py          # EmotionLabel Literal, Pydantic schemas
│   ├── model.py          # EfficientNet-B4, training loop, Mixup
│   ├── server.py         # FastAPI inference endpoint
│   └── requirements.txt
├── nestjs-api/
│   └── src/
│       ├── shared/types/index.ts     # Branded types, Zod schemas, GatewayResponse
│       └── modules/classification/
│           └── classification.module.ts  # Controller + Service
└── react-ui/
    └── src/
        └── app.tsx       # ApiState<T> union, useClassification hook, EmotionBar
```