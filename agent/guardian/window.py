"""Localização da janela do Lineage 2 (Win32 via ctypes, sem dependências extras)."""
from __future__ import annotations

import os
import sys
import time
from dataclasses import dataclass, asdict
from typing import Optional

IS_WINDOWS = sys.platform == "win32"

if IS_WINDOWS:
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.WinDLL("user32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

    WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    user32.EnumWindows.argtypes = [WNDENUMPROC, wintypes.LPARAM]
    user32.EnumWindows.restype = wintypes.BOOL
    user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
    user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    user32.IsWindowVisible.argtypes = [wintypes.HWND]
    user32.IsWindow.argtypes = [wintypes.HWND]
    user32.IsIconic.argtypes = [wintypes.HWND]
    user32.GetClientRect.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.RECT)]
    user32.ClientToScreen.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.POINT)]
    user32.GetForegroundWindow.restype = wintypes.HWND
    user32.SetForegroundWindow.argtypes = [wintypes.HWND]
    user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
    user32.BringWindowToTop.argtypes = [wintypes.HWND]
    user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
    user32.PostMessageW.argtypes = [wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
    user32.keybd_event.argtypes = [wintypes.BYTE, wintypes.BYTE, wintypes.DWORD, ctypes.c_size_t]
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.QueryFullProcessImageNameW.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR,
                                                    ctypes.POINTER(wintypes.DWORD)]
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    user32.SetCursorPos.argtypes = [ctypes.c_int, ctypes.c_int]
    user32.GetCursorPos.argtypes = [ctypes.POINTER(wintypes.POINT)]
    advapi32 = ctypes.WinDLL("advapi32", use_last_error=True)
    advapi32.OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.POINTER(wintypes.HANDLE)]
    advapi32.GetTokenInformation.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD,
                                             ctypes.POINTER(wintypes.DWORD)]

    ULONG_PTR = ctypes.c_size_t

    class _MOUSEINPUT(ctypes.Structure):
        _fields_ = [("dx", ctypes.c_long), ("dy", ctypes.c_long), ("mouseData", wintypes.DWORD),
                    ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD), ("dwExtraInfo", ULONG_PTR)]

    class _KEYBDINPUT(ctypes.Structure):
        _fields_ = [("wVk", wintypes.WORD), ("wScan", wintypes.WORD), ("dwFlags", wintypes.DWORD),
                    ("time", wintypes.DWORD), ("dwExtraInfo", ULONG_PTR)]

    class _HARDWAREINPUT(ctypes.Structure):
        _fields_ = [("uMsg", wintypes.DWORD), ("wParamL", wintypes.WORD), ("wParamH", wintypes.WORD)]

    class _INPUTUNION(ctypes.Union):
        _fields_ = [("mi", _MOUSEINPUT), ("ki", _KEYBDINPUT), ("hi", _HARDWAREINPUT)]

    class _INPUT(ctypes.Structure):
        _fields_ = [("type", wintypes.DWORD), ("u", _INPUTUNION)]

    user32.SendInput.argtypes = [wintypes.UINT, ctypes.POINTER(_INPUT), ctypes.c_int]
    user32.SendInput.restype = wintypes.UINT

    MOUSEEVENTF_MOVE = 0x0001
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004


@dataclass
class GameWindow:
    hwnd: int
    title: str
    process: str
    left: int  # origem da área cliente na tela (px físicos)
    top: int
    width: int
    height: int
    minimized: bool
    foreground: bool

    def to_dict(self) -> dict:
        d = asdict(self)
        d.pop("hwnd", None)
        return d


def enable_dpi_awareness() -> None:
    """Faz as coordenadas do Windows coincidirem com os pixels capturados."""
    if not IS_WINDOWS:
        return
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


def _title(hwnd) -> str:
    n = user32.GetWindowTextLengthW(hwnd)
    if n <= 0:
        return ""
    buf = ctypes.create_unicode_buffer(n + 1)
    user32.GetWindowTextW(hwnd, buf, n + 1)
    return buf.value


def _process_name(hwnd) -> str:
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    h = kernel32.OpenProcess(0x1000, False, pid.value)  # PROCESS_QUERY_LIMITED_INFORMATION
    if not h:
        return ""
    try:
        buf = ctypes.create_unicode_buffer(520)
        size = wintypes.DWORD(520)
        if kernel32.QueryFullProcessImageNameW(h, 0, buf, ctypes.byref(size)):
            return os.path.basename(buf.value)
        return ""
    finally:
        kernel32.CloseHandle(h)


def list_windows() -> list[dict]:
    """Janelas visíveis com título (para escolher a do jogo no painel)."""
    if not IS_WINDOWS:
        return []
    found = []

    def cb(hwnd, _lparam):
        if user32.IsWindowVisible(hwnd):
            t = _title(hwnd)
            if t:
                found.append({"hwnd": int(hwnd), "title": t, "process": _process_name(hwnd)})
        return True

    user32.EnumWindows(WNDENUMPROC(cb), 0)
    return found


def _describe(hwnd, title: str, process: str) -> Optional[GameWindow]:
    rect = wintypes.RECT()
    if not user32.GetClientRect(hwnd, ctypes.byref(rect)):
        return None
    pt = wintypes.POINT(0, 0)
    user32.ClientToScreen(hwnd, ctypes.byref(pt))
    fg = user32.GetForegroundWindow()
    return GameWindow(
        hwnd=int(hwnd), title=title, process=process,
        left=int(pt.x), top=int(pt.y), width=int(rect.right - rect.left), height=int(rect.bottom - rect.top),
        minimized=bool(user32.IsIconic(hwnd)), foreground=bool(fg) and int(fg) == int(hwnd),
    )


def find_game_window(title_contains: str, process_name: str = "") -> Optional[GameWindow]:
    """Primeira janela cujo título contém o texto E (se informado) cujo processo bate.

    Exigir o nome do processo evita confundir o jogo com, por exemplo, uma aba do
    navegador chamada "Lineage II".
    """
    if not IS_WINDOWS:
        return None
    needle = (title_contains or "").lower().strip()
    proc = (process_name or "").lower().strip()
    if not needle:
        return None
    for w in list_windows():
        if needle not in w["title"].lower():
            continue
        if proc and w["process"].lower() != proc:
            continue
        return _describe(w["hwnd"], w["title"], w["process"])
    return None


def refresh(win: GameWindow) -> Optional[GameWindow]:
    if not IS_WINDOWS or not user32.IsWindow(win.hwnd):
        return None
    return _describe(win.hwnd, win.title, win.process)


def bring_to_front(win: GameWindow) -> bool:
    if not IS_WINDOWS:
        return False
    if user32.IsIconic(win.hwnd):
        user32.ShowWindow(win.hwnd, 9)  # SW_RESTORE
    # Truque do ALT: libera a trava de primeiro plano do Windows.
    user32.keybd_event(0x12, 0, 0, 0)
    user32.SetForegroundWindow(win.hwnd)
    user32.BringWindowToTop(win.hwnd)
    user32.keybd_event(0x12, 0, 2, 0)
    time.sleep(0.25)
    fg = user32.GetForegroundWindow()
    return bool(fg) and int(fg) == int(win.hwnd)


def post_click(win: GameWindow, x: int, y: int) -> None:
    """Clique em segundo plano via mensagens da janela (alguns clientes ignoram)."""
    lparam = (int(y) << 16) | (int(x) & 0xFFFF)
    user32.PostMessageW(win.hwnd, 0x0200, 0, lparam)  # WM_MOUSEMOVE
    user32.PostMessageW(win.hwnd, 0x0201, 0x0001, lparam)  # WM_LBUTTONDOWN
    time.sleep(0.04)
    user32.PostMessageW(win.hwnd, 0x0202, 0, lparam)  # WM_LBUTTONUP


# --------------------------------------------------------------------------- permissões / cliques nativos

def is_admin() -> bool:
    """O agente está rodando como administrador?"""
    if not IS_WINDOWS:
        return False
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def process_elevated(win: GameWindow) -> Optional[bool]:
    """O processo do jogo roda como administrador? None = não foi possível saber.

    Se não conseguimos nem abrir o processo para consulta, quase sempre é porque
    ele roda com mais permissão que o agente.
    """
    if not IS_WINDOWS:
        return None
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(win.hwnd, ctypes.byref(pid))
    h = kernel32.OpenProcess(0x1000, False, pid.value)
    if not h:
        return True
    try:
        tok = wintypes.HANDLE()
        if not advapi32.OpenProcessToken(h, 0x0008, ctypes.byref(tok)):  # TOKEN_QUERY
            return True if ctypes.get_last_error() == 5 else None  # 5 = acesso negado
        try:
            elevation = wintypes.DWORD()
            size = wintypes.DWORD()
            if not advapi32.GetTokenInformation(tok, 20, ctypes.byref(elevation), ctypes.sizeof(elevation),
                                                ctypes.byref(size)):  # TokenElevation
                return None
            return bool(elevation.value)
        finally:
            kernel32.CloseHandle(tok)
    finally:
        kernel32.CloseHandle(h)


def cursor_pos() -> tuple[int, int]:
    pt = wintypes.POINT()
    user32.GetCursorPos(ctypes.byref(pt))
    return int(pt.x), int(pt.y)


def _mouse(flags: int, dx: int = 0, dy: int = 0) -> int:
    inp = _INPUT(type=0, u=_INPUTUNION(mi=_MOUSEINPUT(dx, dy, 0, flags, 0, 0)))
    return int(user32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(_INPUT)))


def physical_click(x: int, y: int, hover_ms: int = 90, hold_ms: int = 70) -> bool:
    """Clique como uma pessoa faria: leva o cursor, mexe 1 px, espera, aperta, segura e solta.

    Muitos jogos (o Lineage 2 incluso) ignoram um clique em que o cursor "teleporta"
    e clica no mesmo instante: o botão ainda não percebeu o mouse em cima dele.
    Devolve False se o Windows recusou os eventos.
    """
    user32.SetCursorPos(int(x), int(y))
    time.sleep(0.03)
    ok = _mouse(MOUSEEVENTF_MOVE, 1, 0) == 1
    time.sleep(0.02)
    ok = (_mouse(MOUSEEVENTF_MOVE, -1, 0) == 1) and ok
    user32.SetCursorPos(int(x), int(y))
    time.sleep(max(0.03, hover_ms / 1000))
    ok = (_mouse(MOUSEEVENTF_LEFTDOWN) == 1) and ok
    time.sleep(max(0.03, hold_ms / 1000))
    ok = (_mouse(MOUSEEVENTF_LEFTUP) == 1) and ok
    return ok


# --------------------------------------------------------------------------- quem está sob o ponto

if IS_WINDOWS:
    user32.WindowFromPoint.argtypes = [wintypes.POINT]
    user32.WindowFromPoint.restype = wintypes.HWND
    user32.GetAncestor.argtypes = [wintypes.HWND, wintypes.UINT]
    user32.GetAncestor.restype = wintypes.HWND


def _pid(hwnd) -> int:
    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    return int(pid.value)


def window_at(x: int, y: int) -> Optional[dict]:
    """Janela (de nível superior) visível no ponto da tela, ou None."""
    if not IS_WINDOWS:
        return None
    hwnd = user32.WindowFromPoint(wintypes.POINT(int(x), int(y)))
    if not hwnd:
        return None
    root = user32.GetAncestor(hwnd, 2) or hwnd  # GA_ROOT
    return {"hwnd": int(root), "pid": _pid(root), "title": _title(root), "process": _process_name(root)}


def point_on_game(win: GameWindow, x: int, y: int) -> tuple[bool, str]:
    """O ponto da tela está sobre a janela do jogo (e não coberto por outro programa)?"""
    at = window_at(x, y)
    if at is None:
        return True, ""  # não foi possível consultar: não bloqueia
    if at["hwnd"] == int(win.hwnd) or at["pid"] == _pid(win.hwnd):
        return True, ""
    return False, (at["title"] or at["process"] or "outra janela")
