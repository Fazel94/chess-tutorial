"""
MkDocs-macros module for the Chess Tutorial course.

Each macro emits a `<div class="chess-widget" data-mode="…" data-…="…">`
placeholder that the widget bundle (`assets/widgets.js`) hydrates on
DOMContentLoaded. The shape is identical across modes so the JS hydrator can
dispatch on `data-mode`.

Macros:
  {{ board(fen=…, caption=…) }}              static position
  {{ viewer(pgn_file=…, caption=…) }}        PGN step-through (file or inline)
  {{ viewer(pgn=…, caption=…) }}             inline PGN string
  {{ puzzle(fen=…, solution=…, hint=…) }}    fixed inline puzzle
  {{ engine_play(fen=…, difficulty=…, color=…) }}
  {{ local_play(fen=…) }}
  {{ free_viewer() }}                         consumes ?fen=&pgn= from URL
  {{ puzzle_from_url() }}                     consumes ?fen=&solution=&hint=
  {{ engine_play_from_url() }}                consumes ?fen=&difficulty=&color=
  {{ local_play_from_url() }}                 consumes ?fen=

For PGN-as-file widgets the macro resolves the relative path from the page's
URL into a site-absolute URL. PGN files are served by MkDocs as ordinary
static assets from the docs tree.
"""

from __future__ import annotations

import json
import posixpath
from html import escape


def define_env(env):
    """Register macros with the mkdocs-macros plugin."""

    # ---------------------------------------------------------------- helpers

    def _resolve_url(rel_path: str) -> str:
        """
        Resolve a path that the page author wrote (relative to the page) into a
        site-absolute URL. MkDocs serves the docs tree from `/`.
        """
        page = getattr(env, "page", None)
        page_url = getattr(page, "url", "") if page else ""
        # page.url ends with "/" for directory_urls=True (default)
        # joining with the relative path from the source markdown's directory:
        # for a page at tutorials/opening-principles/01-center-control/ the
        # source markdown lives at tutorials/opening-principles/01-center-control.md;
        # author wrote "pgn/01-center-control.pgn" relative to *that* directory.
        src = getattr(page.file, "src_path", "") if page and page.file else ""
        # src is e.g. "tutorials/opening-principles/01-center-control.md"
        src_dir = posixpath.dirname(src.replace("\\", "/"))
        joined = posixpath.normpath(posixpath.join(src_dir, rel_path))
        return "/" + joined.lstrip("/")

    def _emit(mode: str, attrs: dict, fallback_label: str = "") -> str:
        attrs = {"data-mode": mode, **attrs}
        attr_str = " ".join(
            f'{k}="{escape(str(v), quote=True)}"' for k, v in attrs.items() if v not in (None, "")
        )
        label = fallback_label or mode
        noscript = escape(label)
        return (
            f'<div class="chess-widget" {attr_str}>'
            f'<noscript class="chess-widget-fallback">{noscript}</noscript>'
            f'</div>'
        )

    # ---------------------------------------------------------------- macros

    @env.macro
    def board(fen: str, caption: str = "", orientation: str = "white", id: str = "") -> str:
        attrs = {"data-fen": fen, "data-orientation": orientation}
        if caption:
            attrs["data-caption"] = caption
        if id:
            attrs["data-widget-id"] = id
        return _emit("board", attrs, caption or fen)

    @env.macro
    def viewer(
        pgn_file: str = "",
        pgn: str = "",
        caption: str = "",
        orientation: str = "white",
        id: str = "",
    ) -> str:
        if not pgn_file and not pgn:
            return '<div class="chess-widget-error">viewer macro requires pgn_file or pgn</div>'
        attrs = {"data-orientation": orientation}
        if pgn_file:
            attrs["data-pgn-url"] = _resolve_url(pgn_file)
        if pgn:
            attrs["data-pgn"] = pgn
        if caption:
            attrs["data-caption"] = caption
        if id:
            attrs["data-widget-id"] = id
        return _emit("viewer", attrs, caption or "PGN viewer")

    @env.macro
    def puzzle(fen: str, solution: str, hint: str = "", id: str = "") -> str:
        moves = [m.strip() for m in solution.split(",") if m.strip()]
        attrs = {
            "data-fen": fen,
            "data-solution": ",".join(moves),
        }
        if hint:
            attrs["data-hint"] = hint
        if id:
            attrs["data-widget-id"] = id
        return _emit("puzzle", attrs, f"Puzzle — {fen}")

    @env.macro
    def engine_play(fen: str = "", difficulty: str = "intermediate", color: str = "w") -> str:
        attrs = {"data-difficulty": difficulty, "data-color": color}
        if fen:
            attrs["data-fen"] = fen
        return _emit("engine_play", attrs, "Engine play")

    @env.macro
    def practice_opening(
        pgn_file: str,
        play_as: str = "white",
        caption: str = "",
        id: str = "",
        next_url: str = "",
        next_label: str = "",
    ) -> str:
        attrs = {
            "data-pgn-url": _resolve_url(pgn_file),
            "data-play-as": play_as,
        }
        if caption:
            attrs["data-caption"] = caption
        if id:
            attrs["data-widget-id"] = id
        # next_url is used verbatim (author writes the final URL, e.g. "/play/")
        # so a completed line can offer a "continue" link.
        if next_url:
            attrs["data-next-url"] = next_url
        if next_label:
            attrs["data-next-label"] = next_label
        return _emit("practice_opening", attrs, caption or "Practice opening")

    @env.macro
    def local_play(fen: str = "") -> str:
        attrs = {}
        if fen:
            attrs["data-fen"] = fen
        return _emit("local_play", attrs, "Local play")

    @env.macro
    def free_viewer() -> str:
        return _emit("free_viewer", {}, "Position viewer")

    @env.macro
    def puzzle_from_url() -> str:
        return _emit("puzzle_from_url", {}, "Puzzle")

    @env.macro
    def engine_play_from_url() -> str:
        return _emit("engine_play_from_url", {}, "Engine play")

    @env.macro
    def local_play_from_url() -> str:
        return _emit("local_play_from_url", {}, "Local play")
