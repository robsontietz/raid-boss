"""Análise visual da lista RAID.

Funções puras (sem dependência do Windows) para:
  * separar a região da lista em linhas (uma por boss);
  * isolar os pixels do texto de cada linha;
  * medir a cor predominante do texto (ignorando antialiasing, sombras e brilho);
  * comparar o formato do texto com uma referência para confirmar que a lista
    realmente está visível (e não outra janela / tela preta);
  * decidir se uma diferença de cor é uma mudança real de estado.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, asdict
from typing import Optional, Sequence

import cv2
import numpy as np

# Contraste mínimo (canal V do HSV, 0-255) entre o texto e o fundo da linha.
MIN_CONTRAST = 40.0
# Fração mínima/máxima de pixels de texto dentro de uma linha.
MIN_TEXT_FRACTION = 0.008
MAX_TEXT_FRACTION = 0.55
# Quantidade mínima de pixels "núcleo" (centro do traço) para medir a cor.
MIN_CORE_PIXELS = 12
# Croma (distância de a,b ao neutro no Lab de 8 bits) abaixo do qual a cor é cinza.
NEUTRAL_CHROMA = 14.0
# Deslocamento máximo (px) tolerado ao comparar o formato do texto com a referência.
MAX_SHIFT = 3

BUCKET_NAMES_PT = {
    "gray": "Cinza",
    "red": "Vermelho",
    "orange": "Laranja",
    "yellow": "Amarelo",
    "green": "Verde",
    "cyan": "Ciano",
    "blue": "Azul",
    "purple": "Roxo",
    "pink": "Rosa",
}


@dataclass
class RowReading:
    valid: bool
    reason: str = ""
    lab: Optional[tuple[float, float, float]] = None
    bucket: Optional[str] = None
    hex: Optional[str] = None
    match: Optional[float] = None
    text_fraction: float = 0.0
    contrast: float = 0.0

    def to_dict(self) -> dict:
        d = asdict(self)
        if self.lab is not None:
            d["lab"] = [round(float(x), 2) for x in self.lab]
        if self.match is not None:
            d["match"] = round(float(self.match), 3)
        d["text_fraction"] = round(float(self.text_fraction), 4)
        d["contrast"] = round(float(self.contrast), 1)
        d["color_name"] = BUCKET_NAMES_PT.get(self.bucket or "", None)
        return d


# --------------------------------------------------------------------------- linhas

def row_bounds(height: int, rows: int) -> list[tuple[int, int]]:
    """Limites verticais (y0, y1) de cada linha, distribuídas igualmente."""
    rows = max(1, int(rows))
    out = []
    for i in range(rows):
        y0 = int(round(i * height / rows))
        y1 = int(round((i + 1) * height / rows))
        out.append((y0, max(y0 + 1, y1)))
    return out


def split_rows(img: np.ndarray, rows: int) -> list[np.ndarray]:
    return [img[y0:y1, :] for (y0, y1) in row_bounds(img.shape[0], rows)]


# --------------------------------------------------------------------------- texto

def text_mask(row_bgr: np.ndarray) -> tuple[np.ndarray, float]:
    """Máscara binária (0/1) dos pixels do texto e o contraste texto/fundo.

    O texto do Lineage 2 é mais claro que o fundo da janela. Usamos o canal V
    (brilho máximo entre R, G, B), que trata igualmente texto cinza e colorido,
    e um limiar adaptativo (Otsu) para que o formato da máscara não dependa da cor.
    """
    if row_bgr.size == 0:
        return np.zeros(row_bgr.shape[:2], np.uint8), 0.0
    v = row_bgr.max(axis=2).astype(np.uint8)
    bg = float(np.median(v))
    peak = float(np.percentile(v, 99.5))
    contrast = peak - bg
    if contrast < MIN_CONTRAST:
        return np.zeros(v.shape, np.uint8), contrast
    otsu, _ = cv2.threshold(v, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thr = max(float(otsu), bg + 0.35 * contrast)
    mask = (v > thr).astype(np.uint8)
    return mask, contrast


def dominant_lab(row_bgr: np.ndarray, mask: np.ndarray) -> Optional[tuple[float, float, float]]:
    """Cor predominante do texto, em Lab (OpenCV, 8 bits).

    Considera apenas o "núcleo" dos traços (metade mais brilhante dos pixels do
    texto), descartando bordas com antialiasing e sombras. Em seguida agrupa as
    cores em 2 grupos e devolve a mediana do grupo majoritário.
    """
    pix = row_bgr[mask > 0]
    if len(pix) < MIN_CORE_PIXELS:
        return None
    v = pix.max(axis=1)
    core = pix[v >= np.percentile(v, 50)]
    if len(core) < MIN_CORE_PIXELS:
        return None
    lab = cv2.cvtColor(core.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    if len(lab) >= 40:
        cv2.setRNGSeed(12345)
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 0.5)
        _, labels, _ = cv2.kmeans(lab[:, 1:].copy(), 2, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
        labels = labels.ravel()
        counts = np.bincount(labels, minlength=2)
        major = int(np.argmax(counts))
        lab = lab[labels == major]
    med = np.median(lab, axis=0)
    return (float(med[0]), float(med[1]), float(med[2]))


# --------------------------------------------------------------------------- cores

def lab_to_bgr(lab: Sequence[float]) -> tuple[int, int, int]:
    px = np.array([[[np.clip(lab[0], 0, 255), np.clip(lab[1], 0, 255), np.clip(lab[2], 0, 255)]]], np.uint8)
    b, g, r = cv2.cvtColor(px, cv2.COLOR_LAB2BGR)[0, 0]
    return int(b), int(g), int(r)


def lab_to_hex(lab: Sequence[float]) -> str:
    b, g, r = lab_to_bgr(lab)
    return f"#{r:02X}{g:02X}{b:02X}"


def color_bucket(lab: Sequence[float]) -> str:
    """Nome da família de cor (gray, red, orange, ...)."""
    chroma = math.hypot(lab[1] - 128.0, lab[2] - 128.0)
    if chroma < NEUTRAL_CHROMA:
        return "gray"
    b, g, r = lab_to_bgr(lab)
    h = int(cv2.cvtColor(np.array([[[b, g, r]]], np.uint8), cv2.COLOR_BGR2HSV)[0, 0, 0])
    if h < 8 or h >= 170:
        return "red"
    if h < 19:
        return "orange"
    if h < 34:
        return "yellow"
    if h < 85:
        return "green"
    if h < 100:
        return "cyan"
    if h < 128:
        return "blue"
    if h < 148:
        return "purple"
    return "pink"


def change_score(lab1: Sequence[float], lab2: Sequence[float]) -> float:
    """Distância entre cores dando pouco peso ao brilho (L).

    Variações de brilho/captura mexem principalmente em L; mudanças reais de
    estado (cinza -> vermelho, etc.) mexem no tom/croma (a, b).
    """
    dc = math.hypot(lab1[1] - lab2[1], lab1[2] - lab2[2])
    dl = abs(lab1[0] - lab2[0])
    return dc + 0.35 * dl


def sensitivity_threshold(sensitivity: float) -> float:
    """Sensibilidade 1 (pouco sensível) .. 10 (muito sensível) -> limiar de distância."""
    s = min(10.0, max(1.0, float(sensitivity)))
    return 60.0 - 4.5 * s


def is_relevant_change(prev_lab, prev_bucket, lab, bucket, sensitivity: float) -> bool:
    """Decide se a cor atual representa uma mudança real em relação à anterior."""
    score = change_score(prev_lab, lab)
    thr = sensitivity_threshold(sensitivity)
    if bucket != prev_bucket:
        return score >= thr * 0.6
    # Mesma família de cor: só conta se a diferença for muito grande.
    return score >= thr * 1.6


# --------------------------------------------------------------------------- formato

def _shift(a: np.ndarray, dx: int, dy: int) -> np.ndarray:
    out = np.zeros_like(a)
    h, w = a.shape
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    if xs1 <= xs0 or ys1 <= ys0:
        return out
    out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = a[ys0:ys1, xs0:xs1]
    return out


def shape_similarity(mask: np.ndarray, ref: np.ndarray, max_shift: int = MAX_SHIFT) -> float:
    """Semelhança (0..1) entre o formato do texto atual e o de referência.

    Independe da cor: compara apenas máscaras binárias (interseção / união),
    tolerando pequenos deslocamentos. O limiar adaptativo da máscara faz o
    mesmo nome render quase a mesma máscara em cinza, vermelho ou outra cor.
    """
    if mask.shape != ref.shape:
        return 0.0
    if ref.sum() == 0 or mask.sum() == 0:
        return 0.0
    best = 0.0
    for dy in range(-max_shift, max_shift + 1):
        for dx in range(-max_shift, max_shift + 1):
            m = _shift(mask, dx, dy)
            union = float((m | ref).sum())
            if union == 0:
                continue
            iou = float((m & ref).sum()) / union
            if iou > best:
                best = iou
    return best


# --------------------------------------------------------------------------- linha / lista

def read_row(row_bgr: np.ndarray, ref_mask: Optional[np.ndarray] = None, match_threshold: float = 0.55) -> RowReading:
    mask, contrast = text_mask(row_bgr)
    area = max(1, mask.size)
    frac = float(mask.sum()) / area
    if contrast < MIN_CONTRAST:
        return RowReading(False, "sem texto visível", contrast=contrast, text_fraction=frac)
    if frac < MIN_TEXT_FRACTION:
        return RowReading(False, "texto muito pequeno", contrast=contrast, text_fraction=frac)
    if frac > MAX_TEXT_FRACTION:
        return RowReading(False, "região não parece texto", contrast=contrast, text_fraction=frac)
    match = None
    if ref_mask is not None:
        match = shape_similarity(mask, ref_mask)
        if match < match_threshold:
            return RowReading(False, "texto não corresponde à referência", match=match, contrast=contrast, text_fraction=frac)
    lab = dominant_lab(row_bgr, mask)
    if lab is None:
        return RowReading(False, "poucos pixels de texto", match=match, contrast=contrast, text_fraction=frac)
    return RowReading(True, "", lab=lab, bucket=color_bucket(lab), hex=lab_to_hex(lab), match=match,
                      contrast=contrast, text_fraction=frac)


def analyze_list(img: np.ndarray, rows: int, references: Optional[Sequence[np.ndarray]] = None,
                 match_threshold: float = 0.55) -> list[RowReading]:
    crops = split_rows(img, rows)
    out = []
    for i, crop in enumerate(crops):
        ref = references[i] if references is not None and i < len(references) else None
        out.append(read_row(crop, ref, match_threshold))
    return out


def row_masks(img: np.ndarray, rows: int) -> list[np.ndarray]:
    return [text_mask(crop)[0] for crop in split_rows(img, rows)]


def is_blank_capture(img: np.ndarray) -> bool:
    """Imagem sem conteúdo (preta/uniforme) = falha de captura, nunca mudança."""
    if img is None or img.size == 0:
        return True
    return float(img.std()) < 2.0
