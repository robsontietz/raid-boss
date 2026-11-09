"""Dois cliques no botão RAID, com todas as verificações de segurança."""
from __future__ import annotations

import time

from . import window as win32


class ClickError(Exception):
    pass


def click_raid_twice(win: win32.GameWindow, point: dict, mode: str, delay_ms: int, restore_mouse: bool) -> None:
    """Clica duas vezes no ponto calibrado (relativo à área cliente da janela).

    Não clica se a janela sumiu, está minimizada, ou se o ponto cair fora dela.
    """
    current = win32.refresh(win)
    if current is None:
        raise ClickError("A janela do jogo foi fechada. Nenhum clique executado.")
    if current.minimized:
        raise ClickError("A janela do jogo está minimizada. Nenhum clique executado.")
    x, y = int(point["x"]), int(point["y"])
    if not (0 <= x < current.width and 0 <= y < current.height):
        raise ClickError("O ponto do botão RAID está fora da janela do jogo. Recalibre.")

    if mode == "background":
        win32.post_click(current, x, y)
        time.sleep(max(0.05, delay_ms / 1000))
        win32.post_click(current, x, y)
        return

    if not current.foreground:
        raise ClickError("O jogo não está em primeiro plano. Clique cancelado para não atingir outro programa.")
    import pyautogui  # import tardio
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0
    sx, sy = current.left + x, current.top + y
    try:
        original = pyautogui.position()
        pyautogui.click(sx, sy)
        time.sleep(max(0.05, delay_ms / 1000))
        # Confere de novo antes do segundo clique.
        again = win32.refresh(current)
        if again is None or (not again.foreground) or again.left != current.left or again.top != current.top:
            raise ClickError("A janela do jogo mudou entre os cliques. Segundo clique cancelado.")
        pyautogui.click(sx, sy)
        if restore_mouse:
            pyautogui.moveTo(original.x, original.y)
    except pyautogui.FailSafeException as exc:
        raise ClickError("Clique interrompido pelo FAILSAFE (mouse no canto da tela).") from exc
