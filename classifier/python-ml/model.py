from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import transforms, models
from torchvision.models import EfficientNet_B4_Weights

from schemas import ALL_EMOTIONS, NUM_CLASSES, VALENCE_AROUSAL_MAP

if TYPE_CHECKING:
    from torch import Tensor

class AffectNetClassifier(nn.Module):
    """
    EfficientNet-B4 із налаштованою класифікаційною головкою для розпізнавання 11-класових афективних станів.
    Виокремлення ознак: фіксована базова мережа протягом перших 5 епох, потім повне налаштування.
    Head генерує як логіти класів, так і результати регресії (валентність, збудження).
    """
    def __init__(self, num_classes: int = NUM_CLASSES, dropout: float = 0.4) -> None:
        super().__init__()
        
        backbone = models.efficientnet_b4(weights=EfficientNet_B4_Weights.IMAGENET1K_V1)

        self.features: nn.Sequential = backbone.features
        self.avgpool: nn.AdaptiveAvgPool2d = backbone.avgpool

        feature_dim: int = 1792

        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(feature_dim, 512),
            nn.BatchNorm1d(512),
            nn.GELU(),
            nn.Dropout(p=dropout / 2),
            nn.Linear(512, num_classes)
        )

        self.va_head = nn.Sequential(
            nn.Dropout(p=dropout / 2),
            nn.Linear(feature_dim, 128),
            nn.GELU(),
            nn.Linear(128, 2),
            nn.Tanh(),
        )

        self.__grad_cam_target: nn.Module = self.features[-1]
        self._activations: Tensor | None = None
        self._gradients: Tensor | None = None
        self._register_hooks()

    def _register_hooks(self) -> None:
        def forward_hook(_module: nn.Module, _input: tuple, output: Tensor) -> None:
            self._activations = output
        
        def backward_hook(_module: nn.Module, _grad_in: tuple, grad_out: tuple) -> None:
            self._gradients = grad_out[0]

        self.__grad_cam_target.register_forward_hook(forward_hook)
        self.__grad_cam_target.register_full_backward_hook(backward_hook)

    def forward(self, x: Tensor) -> tuple[Tensor, Tensor]:
        features = self.features(x)
        pooled = self.avgpool(features).flatten(1)
        logits = self.classifier(pooled)
        va = self.va_head(pooled)
        return logits, va

    def get_grad_cam(self, class_idx: int) -> Tensor:
        assert self._activations is not None and self._gradients is not None
        weights = self._gradients.mean(dim=(2, 3), keepdim=True)
        cam = (weights * self._activations).sum(dim=1, keepdim=True)
        return F.relu(cam).squeeze()

def build_tansforms(split: str) -> transforms.Compose:

    """
    Навчання: значне розширення даних для надійної генералізації.
    Вал./тест: лише детерміноване обрізання по центру.
    """
    assert split in ("train", "val", "test")

    normalize = transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    )

    if split == 'train':
        return transforms.Compose([
            transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
            transforms.RandomGrayscale(p=0.05),
            transforms.RandomRotation(15),
            transforms.ToTensor(),
            normalize,
            transforms.RandomErasing(p=0.2, scale=(0.02, 0.15))
        ])

    return transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        normalize,
    ])

def mixup_batch(
    x: Tensor,
    y: Tensor,
    alpha: float = 0.4,
) -> tuple[Tensor, Tensor, Tensor, Tensor]:
    """
    Mixup: лінійна інтерполяція пар.
    Повертає (mixed_x, y_a, y_b, lam) для обчислення змішаної втрати.
    """
    lam = float(torch.distributions.Beta(alpha, alpha).sample())
    batch = x.size(0)
    perm = torch.randperm(batch, device=x.device)
    return x * lam + x[perm] * (1 - lam), y, y[perm], lam
    
class SmoothedCELoss(nn.Module):
    def __init__(self, num_classes: int = NUM_CLASSES, smoothing: float = 0.1) -> None:
        super().__init__()
        self.smoothing = smoothing
        self.num_classes = num_classes

    def forward(self, logits: Tensor, targets: Tensor) -> Tensor:
        log_probs = F.log_softmax(logits, dim=-1)
        nll = F.nll_loss(log_probs, targets)
        smooth = -log_probs.mean(dim=-1).mean()
        return(1 - self.smoothing) * nll + self.smoothing * smooth

def train_one_epoch(
    model: AffectNetClassifier,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    cls_loss_fn: SmoothedCELoss,
    va_loss_fn: nn.MSELoss,
    device: torch.device,
    use_mixup: bool = True
) -> dict[str, float]:
    model.train()
    total_cls_loss = 0.0,
    total_va_loss = 0.0,
    correct = 0,
    total = 0,

    va_targets_map = torch.tensor(
        [VALENCE_AROUSAL_MAP[e] for e in ALL_EMOTIONS],
        dtype=torch.float32,
        device=device,
    )

    for imgs, labels in loader:
        imgs: Tensor = imgs.to(device)
        labels: Tensor = labels.to(device)

        if use_mixup:
            imgs, labels_a, labels_b, lam = mixup_batch(imgs, labels)
            logits, va_pred = model(imgs)
            loss_cls = (
                lam * cls_loss_fn(logits, labels_a) +
                (1 - lam) * cls_loss_fn(logits, labels_b)
            )
            va_gt = lam * va_targets_map[labels_a] + (1 - lam) * va_targets_map[labels_b]
        else:
            logits, va_pred = model(imgs)
            loss_cls = cls_loss_fn(logits, labels)
            va_gt = va_targets_map[labels]
        
        loss_va = va_loss_fn(va_pred, va_gt) * 0.3
        loss_total = loss_cls + loss_va

        optimizer.zero_grad()
        loss_total.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        total_cls_loss += loss_cls.item()
        total_va_loss += loss_va.item()
        preds = logits.argmax(dim=1)
        correct += (preds == labels).sum().item() if not use_mixup else 0
        total += imgs.size(0)

    return {
        "cls_loss": total_cls_loss / len(loader),
        "va_loss": total_va_loss / len(loader),
        "accuracy": correct / total if total > 0 else 0.0,
    }

@torch.no_grad()
def evaluate(
    model: AffectNetClassifier,
    train_loader: DataLoader,
    val_loader: DataLoader,
    epochs: int = 30,
    lr: float = 3e-4,
    wight_decay: float = 1e-4,
    freeze_epochs: int = 5,
    checkpoint_dir: Path = Path("checkpoints"),
) -> None:
    """
    Двофазне навчання:
    Фаза 1 (freeze_epochs): Навчається лише головний блок — базова мережа заморожена.
    Фаза 2 (remaining):     Повна модель піддається тонкому налаштуванню з меншим значенням LR.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")
    model.to(device)
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    cls_loss_fn = SmoothedCELoss()
    va_loss_fn = nn.MSELoss()

    for param in model.features.parameters():
        param.requires_grad_(False)

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=lr, wight_decay=wight_decay,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=10, T_mult=2, eta_min=1e-6,
    )

    best_val_acc = 0.0

    for epoch in range(1, epochs + 1):
        if epoch == freeze_epochs + 1:
            print(f"\n[Epoch {epoch} ] Unfreezing backbone - full fine-tune")
            for param in model.features.parameters():
                param.requires_grad_(True)
            optimizer = torch.optim.AdamW(
                model.parameters(), lr=lr / 5, wight_decay=wight_decay
            )
            scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
                optimizer, T_0=10, T_mult=2, eta_min=1e-7,
            )

        train_metrics = train_one_epoch(
            model, train_loader, optimizer, cls_loss_fn, va_loss_fn, device,
        )
        val_metrics = evaluate(model, val_loader, device)
        scheduler.step()

        print(
            f"Epoch {epoch:02d}/{epochs} | "
            f"cls_loss={train_metrics['cls_loss']:.4f} | "
            f"val_loss={val_metrics['val_loss']:.4f} | "
            f"val_acc={val_metrics['val_acc']:.4f}"
        ) 

        if val_metrics["val_acc"] > best_val_acc:
            best_val_acc = val_metrics["val_acc"]
            torch.save(
                {
                    "epoch": epoch,
                    "state_dict": model.state_dict(),
                    "val_acc": best_val_acc,
                    "emotions": ALL_EMOTIONS,
                },
                checkpoint_dir / "best_model.pt",
            )
            print(f"  → Saved best model (val_acc={best_val_acc:.4f}) ")
