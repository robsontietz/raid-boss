"""Dois cliques no botão RAID.

O jeito de clicar segue o script que já funciona no PC do usuário
(l2_raid_monitor.py): PyAutoGUI, levando o mouse até o botão em 0,15 s,
esperando um instante e segurando o botão a cada clique. O Lineage 2 ignora
cliques "instantâneos".

Não exige que o jogo esteja em primeiro plano: tenta trazê-lo para frente e
confere que o botão RAID está realmente visível (não coberto por outra janela)
antes de clicar.
"""
from __future__ import annotations

import time

from . import window as win32

ADMIN_HINT = ("O jogo roda como administrador e o agente não, então o Windows descarta os cliques. "
              "Feche o agente e abra o iniciar.bat de novo, aceitando o pedido de permissão de administrador.")

CLICK_HOLD_S = 0.08


class ClickError(Exception):
    pass


def _pyautogui():
    import pyautogui  # import tardio: só existe no Windows/desktop
    pyautogui.FAILSAFE = False  # o mouse parado num canto não deve cancelar o ciclo
    return pyautogui


def human_click_sequence(x: int, y: int, count: int, gap_s: float, restore_mouse: bool) -> None:
    """Mesma sequência do l2_raid_monitor.py: move, espera, aperta/segura/solta N vezes."""
    pg = _pyautogui()
    prev = pg.position()
    pg.moveTo(x, y, duration=0.15)
    time.sleep(0.1)
    for i in range(max(1, int(count))):
        pg.mouseDown()
        time.sleep(CLICK_HOLD_S)
        pg.mouseUp()
        if i < count - 1:
            time.sleep(gap_s)
    time.sleep(0.15)
    if restore_mouse:
        pg.moveTo(*prev)


def click_raid_twice(win: win32.GameWindow, point: dict, mode: str, delay_ms: int, restore_mouse: bool,
                     wait_visible_s: float = 0.0) -> None:
    """Clica duas vezes no ponto calibrado (relativo à área cliente da janela).

    Não clica se a janela sumiu, está minimizada, se o ponto cair fora dela ou se
    outra janela estiver cobrindo o botão RAID.
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

    gap_s = max(0.15, delay_ms / 1000)
    if mode == "background":
        win32.post_click(current, x, y)
        time.sleep(gap_s)
        win32.post_click(current, x, y)
        return

    if not current.foreground:
        win32.bring_to_front(current)
        current = win32.refresh(current) or current
    sx, sy = current.left + x, current.top + y

    deadline = time.time() + max(0.0, wait_visible_s)
    ok, other = win32.point_on_game(current, sx, sy)
    while not ok and time.time() < deadline:
        time.sleep(0.5)
        win32.bring_to_front(current)
        current = win32.refresh(current) or current
        sx, sy = current.left + x, current.top + y
        ok, other = win32.point_on_game(current, sx, sy)
    if not ok:
        raise ClickError(f"O botão RAID está coberto por outra janela ({other}). Clique cancelado para não "
                         "atingir outro programa. Deixe a janela do jogo visível.")
    try:
        human_click_sequence(sx, sy, 2, gap_s, restore_mouse)
    except Exception as exc:  # noqa: BLE001
        raise ClickError(f"O Windows recusou o clique ({exc}). " + ADMIN_HINT) from exc
