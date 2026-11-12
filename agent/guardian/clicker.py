"""Dois cliques no botão RAID, com todas as verificações de segurança."""
from __future__ import annotations

import time

from . import window as win32

ADMIN_HINT = ("O jogo roda como administrador e o agente não, então o Windows descarta os cliques. "
              "Feche o agente e abra o iniciar.bat de novo, aceitando o pedido de permissão de administrador.")


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
    if not win32.is_admin() and win32.process_elevated(current):
        raise ClickError(ADMIN_HINT)

    if mode == "background":
        win32.post_click(current, x, y)
        time.sleep(max(0.05, delay_ms / 1000))
        win32.post_click(current, x, y)
        return

    if not current.foreground:
        raise ClickError("O jogo não está em primeiro plano. Clique cancelado para não atingir outro programa.")
    sx, sy = current.left + x, current.top + y
    original = win32.cursor_pos()
    try:
        if not win32.physical_click(sx, sy):
            raise ClickError("O Windows recusou o clique. " + ADMIN_HINT)
        time.sleep(max(0.05, delay_ms / 1000))
        # Confere de novo antes do segundo clique.
        again = win32.refresh(current)
        if again is None or (not again.foreground) or again.left != current.left or again.top != current.top:
            raise ClickError("A janela do jogo mudou entre os cliques. Segundo clique cancelado.")
        if not win32.physical_click(sx, sy):
            raise ClickError("O Windows recusou o segundo clique. " + ADMIN_HINT)
    finally:
        if restore_mouse:
            time.sleep(0.05)
            win32.user32.SetCursorPos(*original)
