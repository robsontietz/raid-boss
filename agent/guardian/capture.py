"""Captura de tela (MSS) e codificação de imagens para o painel."""
from __future__ import annotations

import base64

import cv2
import numpy as np


class CaptureError(Exception):
    pass


def grab(left: int, top: int, width: int, height: int) -> np.ndarray:
    """Captura um retângulo da tela e devolve uma imagem BGR."""
    if width <= 0 or height <= 0:
        raise CaptureError("Área de captura vazia.")
    try:
        import mss  # import tardio: só existe no Windows/desktop
        with mss.mss() as sct:
            shot = sct.grab({"left": int(left), "top": int(top), "width": int(width), "height": int(height)})
            img = np.asarray(shot)[:, :, :3].copy()
    except Exception as exc:  # noqa: BLE001
        raise CaptureError(f"Falha ao capturar a tela: {exc}") from exc
    return img


def crop(img: np.ndarray, region: dict) -> np.ndarray:
    x, y, w, h = int(region["x"]), int(region["y"]), int(region["w"]), int(region["h"])
    H, W = img.shape[:2]
    if x < 0 or y < 0 or x + w > W or y + h > H:
        raise CaptureError("A área da lista está fora da janela do jogo. Recalibre.")
    return img[y:y + h, x:x + w].copy()


def to_data_url(img: np.ndarray, fmt: str = "jpg", quality: int = 88, max_width: int | None = None) -> str:
    if max_width and img.shape[1] > max_width:
        scale = max_width / img.shape[1]
        img = cv2.resize(img, (max_width, int(img.shape[0] * scale)), interpolation=cv2.INTER_AREA)
    if fmt == "png":
        ok, buf = cv2.imencode(".png", img)
        mime = "image/png"
    else:
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
        mime = "image/jpeg"
    if not ok:
        raise CaptureError("Falha ao codificar imagem.")
    return f"data:{mime};base64," + base64.b64encode(buf.tobytes()).decode("ascii")
