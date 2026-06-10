# Chess Tutorial - TODO

Pending work lives above `Completed milestones`. Historical done items stay at the end so project memory is preserved without hiding the open work.

## Active fixes / polish
- [x] `promotion-overlay.js`: picker `top`/`left` are relative to `boardEl.parentElement` (the widget), not to the board itself. Fix: add `boardEl.offsetTop`/`boardEl.offsetLeft` to the square-geometry offset so the picker aligns with the actual board square instead of the widget container top. Affects rank-1 (black) and rank-8 (white) promotions — the column is correct but the row is shifted upward by the height of any content above the board (e.g. the play-settings dropdowns).

- [x] Viewer: keep the board/PGN layout stable so the page does not jump while navigating moves. you don't need to follow through to move in screen when next/prev button hits
- [x] Viewer: scroll the current highlighted move into view while navigating.
- [x] Viewer: keep FEN/notation display LTR under chess positions as subtitle without breaking the surrounding RTL layout. or move them out of subtitle
- [x] Chessground dark-theme polish: inspect `.move-dest`, `.last-move`, and `.check` square colors.
- [x] is current features implemented as chessground designed it to be?
- [ ] add credits to Kiyarash Fazeli
## Shared UX / cross-cutting

- [x] Board flip button (pgn viewer for example and fen viewer doesn't need it )
- [x] Keyboard shortcuts help overlay (? button + panel on all viewer widgets, RTL-aware, Escape closes; 11 tests).
- [x] Mobile responsive layout.
- [ ] Dark/light theme toggle.
- [x] Sound effects for engine-play and local-play (move, capture, castle, check, game-start, takeback via `lib/sound.js` sprite).
- [x] Sound effects for viewer (step-through moves play piece sounds via `lib/sound.js`; promotion/castle/capture/move + delayed check, derived from SAN).
- [x] Touch/drag piece input on mobile.
- [ ] PWA support.

### Review findings (2026-05-30)
- [x] Free viewer (`/view/`) step-through sounds — extracted `attachMoveSounds` into `lib/viewer-sounds.js`, reused in `free-viewer-widget.js`.
- [x] Free viewer FEN load: validate via chess.js before rebuilding; FEN bar shows an inline error and keeps the value on failure.
- [x] Promotion sound audit: all five modes route promotions to the `promotion` slice (flag `p` first / SAN `=`); regression test added.

## Feature roadmap by mode

### Viewer
- [ ] Arrow/highlight overlays for annotated moves (and reuse the same overlay system in Tutorial Mode).
- [ ] Human-readable labels for move-quality annotations (good / bad / brilliant) where they improve readability.
- [ ] Line exploration / side variations.

### Board Editor
- [ ] MVP: Empty board, drag pieces from a piece tray onto squares.
- [ ] Set side to move, castling rights, en passant square.
- [ ] Generate FEN from current setup, copy to clipboard.
- [ ] "Play from here" → opens Free Play with this FEN.
- [ ] "Create puzzle" → opens Puzzle Creator with this FEN.
- [ ] Load FEN from text input to edit existing position.
- [ ] Piece count validation (max 1 king per side, max 8 pawns, etc.).
- [ ] Clear board / reset to starting position buttons.

### Free Play vs Engine
- [x] MVP: Play from starting position or FEN, engine responds, game-over detection.
- [x] 3 difficulty levels (beginner / intermediate / advanced).
- [x] Choose color (play as white or black).
- [x] Undo / takeback (rewind last full move pair).
- [x] Engine thinking indicator (status text while Stockfish is computing).
- [x] Move sound effects (reuses `lib/sound.js` sprite).
- [x] Promotion piece picker dialog.
- [ ] Resign / offer draw buttons.
- [ ] Post-game: "Analyze" button → opens Analysis mode with the played game.
- [ ] Time controls (optional clock per side).

### Puzzle
- [x] MVP: FEN + solution line, validate user moves one by one, correct/incorrect feedback.
- [x] Hint button (highlight destination square of next correct move).
- [x] Retry on wrong move (snap back to last correct position, re-enable input).
- [x] Puzzle complete celebration state (status flash + `.puzzle-solved` CSS class).
- [x] Show engine's response moves (auto-plays opponent moves at 400 ms delay).
- [x] Puzzle URL format: `?fen=&solution=&hint=` and `?data=<base64-json>` (both supported).
- [x] Sound effects: move/capture/castle/check on correct + auto-played opponent moves, wrong-move buzz on rejection, won fanfare on solve (via `lib/sound.js`).
- [ ] Puzzle Creator: set up position, record solution moves, generate shareable URL.
- [ ] Puzzle sets: load multiple puzzles in sequence, track progress.
- [ ] Difficulty rating per puzzle.

### Practice Opening
- [x] MVP: Select an opening line (PGN), app plays opponent moves, user plays book moves.
- [x] scholar mate terminology: the 4-move Qxf7# mate is called «مات ناپلئونی» in Persian (Scholar's Mate ≡ Napoleon's Mate by language, like German Schäfermatt). Chapter/PGN unified to «مات ناپلئونی» with the fa.wikipedia link. (A prior over-correction to «مات دانشمند» was reverted.)
- [x] Wrong move feedback: show the book move, allow retry.
- [x] next page button (optional `next_url`/`next_label` on the `practice_opening` macro; completion shows a "continue" link).

#### Practice widget UX
- [x] **Move counter** — shows "حرکت X از N" (Persian digits) during practice, incrementing per ply.
- [x] **Per-move "why" annotation** — `parsePgnMainline` now extracts PGN move comments (chess.js `getComments`) and the widget shows the Farsi rationale of the move just played (user + opponent) in a panel below the board; `italian-mainline.pgn` annotated. Cleared on reset.
- [ ] **"نشان بده" (Show me) button** — plays the correct move automatically so the learner can see it, then resets the board to that position for them to try again. Better than snapping back with just a SAN string.
- [ ] **Line completion recap** — after completing a line, show which of the 4 principles each move illustrated (e.g. "۷ حرکت، ۴ اصل در عمل"). Can be a static data-principle per move in the PGN comment format `{[مرکز] اصل اول}`.
- [ ] **Quick restart on completion screen** — the "تلاش دوباره" button disappears when the line is done. Keep it (or add a "بدون اشتباه امتحان کن" variant) on the completion screen so learners can try for a clean run.

#### Practice content — lines needed
- [ ] **Italian as Black** (`play_as='black'`, same `italian-mainline.pgn`) — flip the board; learner plays Black's book replies while White auto-plays. Adds the same line from the opponent side; no new PGN needed, just a second `{{ practice_opening(... play_as='black') }}` block on the practice page.
- [ ] **Ruy Lopez main line as White** — 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 — the other primary White weapon after 1.e4; pairs naturally with the Italian chapter. Needs a new annotated PGN (`practice/pgn/ruy-lopez-mainline.pgn`) with Farsi per-move comments.
- [ ] **Italian — handling Bb4+ check** — the Italian mainline currently ends at 7.Nc3 accepting the pin; add a second practice line showing 7.Bd2 (blocking with the bishop) so learners see both main responses. Short addition to the practice page.
- [ ] **Common opponent deviation — 3...Bc5 skipped** — in the Italian, if Black plays 3...Nf6 (two knights) instead of 3...Bc5, the line diverges immediately. A short practice line showing the correct response (4.Ng5 or 4.d4) teaches learners not to get lost when the book deviates.
- [ ] **Sicilian: basic structure** — 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 e6 — the most popular Black response to 1.e4; Persian beginners will face it constantly as White. Even a 5-move orientation line as Black is more useful than none.

#### Practice page — navigation and learning path
- [ ] **Opening selector** — the practice page currently shows one hard-coded block. Replace it with a card-grid of available lines (opening name, color, length, difficulty badge). Tapping a card loads that line's widget. Macro approach: `{{ practice_grid() }}` that renders cards from a YAML data file.
- [ ] **Embed practice at the end of ch7** — ch7 (Giuoco Piano) ends with "در فصل بعد..." but offers no practice widget. Add `{{ practice_opening(...) }}` at the bottom of `07-giuoco-piano.md` so learners can drill the line immediately after reading about it. This is the highest-impact content change: learners currently have to navigate away.
- [ ] **Chapter-end practice links** — chs 1–6 cover principles but don't link to a practice exercise for those principles. Add a "تمرین این اصل →" callout at the bottom of each principle chapter pointing to the relevant practice line or puzzle.
- [ ] **Learning path overview** — add a visual progress map to the practice page (or to index.md): read chs 1–4 → study Opera/Giuoco → practice Italian → play vs engine. Orienting learners who don't know what to do next is the #1 drop-off point for beginners.

#### Persian learner pedagogy
- [ ] **Chess terms glossary page** (`course/docs/glossary.md`, linked from nav and from first use of each term inline) — تمپو، سنجاق، آچمز، دام، سیخ، قلعه‌بندی، کنترل مرکز، توسعه، اتصال رخ، پیاده‌ی گذشته، فیل بد — each with a one-sentence Farsi definition and a FEN example board. Currently terms are linked to Wikipedia individually; a single coherent glossary is far more learner-friendly.
- [ ] **Principle cheat-sheet during practice** — show the 4 principles (one line each) in a collapsed/expandable sidebar or tooltip during the practice widget so learners can cross-reference while playing. Avoids tab-switching to ch1–4.
- [ ] **Principle tagging in practice PGNs** — annotate each practice move comment with the principle it demonstrates using a conventional prefix: `{[اصل ۲: توسعه] اسب به f3 — پیاده e5 را زیر فشار می‌گیرد}`. The widget can then badge each move as it plays, reinforcing the connection between principle and move.
- [ ] **Farsi opening names** — the practice page uses "بازی ایتالیایی" (Italian Game) which is good. Ensure all opening names across the site use the correct established Farsi names (e.g. "دفاع سیسیلی"، "گشایش اسپانیایی"، "گامبی وزیر") and are consistent between the nav, practice cards, and tutorial chapter headings.
- [ ] **"Opening line library (a few common openings bundled: Italian, Sicilian, Queen's Gambit, etc.)"** — superseded by the opening selector above; retire in favour of the concrete lines listed above.

### Analysis
- [ ] MVP: Free move entry for both sides, no opponent, position history with undo.
- [ ] Engine evaluation bar (Stockfish score per position).
- [ ] Best move suggestion on demand.
- [ ] Branch/variation tree: explore alternatives without losing the main line.
- [ ] Load PGN for post-game review.
- [ ] Arrow drawing (click+drag to annotate).
- [ ] Export analyzed game as PGN with engine eval comments.

### Local Play
- [x] Promotion picker UI (piece-picker overlay, cancellable via Escape or click-outside).
- [ ] Captured-pieces side panel (compute from FEN diff).
- [ ] Optional board auto-flip on each turn.
- [ ] Move clock (Fischer/increment).
- [ ] "Analyze" button after game ends.

### Tutorial Mode
- [ ] Tabs for PGN game showcases — when a `{{viewer}}` contains multiple games, show them as clickable tabs instead of a dropdown select.
- [ ] Farsi translation of PGN move comments.
- [x] Lazy-mount boards on scroll (`IntersectionObserver`, 200 px lead; fallback to immediate mount).

## Content / curriculum

### Historic-game annotation expansion
Chapters 1–4 each ship with a historic-game PGN containing 3–5 short Farsi annotations on critical moments. The full Opening Compass commentary (in `pgns/principle-aligned/Opening Compass for Black and White by GM Mykhaylo Oleksiyenko.pgn`) is much richer. Expand each PGN's annotations to match the depth of `course/docs/tutorials/opening-principles/pgn/06-opera-game.pgn` (one Farsi note per move):

- [x] `course/docs/tutorials/opening-principles/pgn/01-rotlewi-rubinstein-1907.pgn` — source: Compass lines 549–590.
- [x] `course/docs/tutorials/opening-principles/pgn/02-morphy-hart-1857.pgn` — source: Compass lines 645–675.
- [x] `course/docs/tutorials/opening-principles/pgn/03-lasker-thomas-1911.pgn` — source: Compass lines 1791–1822.
- [x] `course/docs/tutorials/opening-principles/pgn/04-steinitz-bardeleben-1895.pgn` — source: Compass lines 1988–2023.

Per-game game/chapter mapping is documented in `pgns/README.md`.

### Teaching notes and content additions
- [ ] Add a short tutorial on how to read PGN.
  - [ ] First pass: link to a good external explainer.
  - [ ] Later: incorporate an in-site tutorial.
- [ ] Add a glossary/teaching note for the definition of a fork.
- [ ] Add historical-context blurbs for the featured games.
- [ ] Credit GM Oleksiyenko / original annotators inline in chapters that reuse annotated games.

## Platform / publishing
- [ ] Promote
  - [ ] jadi
- [ ] analytics check
- [x] Add a GPL-3.0 `LICENSE` file (chessground is GPL-3.0-or-later; combined work is GPL).
- [ ] Review license/terms-of-use for any Chessable-derived material before publishing (see `pgns/README.md` license note).
- [x] Deployment: static S3 hosting on Sotoon (`s3://fazelblog`, `https://chess.nlogn.ir`), four-pass cache strategy via `make deploy`.
- [x] Hosting model: fully static — MkDocs build → Vite bundle → s3cmd sync.

## Research / tooling

- [ ] Find a PGN explorer/reviewer tool for authoring workflows, or build one tailored to this project.

## Completed milestones

### Opening course / platform
- [x] Opening course baseline.
- [x] SEO-friendly tutorial/site URLs.
- [x] Stack simplification.

### Viewer
- [x] MVP: Display FEN, step through PGN, move list, keyboard nav.
- [x] Multi-language (FA/EN) with switcher.
- [x] "Play from here" button — hand off current position to Free Play vs Engine.
- [x] Move annotations (!, ?, !!, ??, !?, ?!) display.
- [x] Comment/annotation text display between moves.
- [x] Export current position as FEN (copy to clipboard).
- [x] Share button (copy URL with current move position).

### Local Play
- [x] MVP: Alternating turns on one board, game-over detection.
- [x] Move history panel (SAN list matching engine-play style).
- [x] Undo / takeback.
- [x] Game persistence via localStorage (key: `chess-tutorial:local-play:fen`).
- [x] Sound effects (`lib/sound.js` sprite).

### Free Play vs Engine
- [x] MVP: FEN load, Stockfish WASM worker, game-over detection.
- [x] Difficulty selector (beginner / intermediate / advanced).
- [x] Color selector (play as white or black).
- [x] Undo (rewinds one full move pair).
- [x] Engine thinking status indicator.
- [x] Move sound effects.
- [x] Promotion piece picker.
- [x] FEN bar (display + load arbitrary position mid-game).
- [x] Move history panel.

### Tutorial Mode
- [x] Markdown renderer with `{{board}}` and `{{viewer}}` stub widgets.
- [x] Static board positions with captions.
- [x] Interactive PGN viewers with move list, NAG badges, comments.
- [x] Multi-game PGN selector (game tabs/dropdown).
- [x] Keyboard navigation (RTL-aware arrows).

### Puzzle
- [x] MVP: FEN + UCI solution line, move-by-move validation.
- [x] Hint button (marks destination square, shows hint text in status).
- [x] Wrong-move snap-back with "wrong" flash status.
- [x] Auto-play opponent response moves (400 ms delay).
- [x] Solved state (flash + persistent `.puzzle-solved` class).
- [x] URL params: `?fen=&solution=&hint=` and `?data=<base64-json>`.
- [x] FEN bar (read-only display of current position).
- [x] Promotion piece picker for promotion moves in solutions.
