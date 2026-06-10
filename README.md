# Chess Opening Tutorial (آموزش گشایش شطرنج)

Interactive Farsi chess-opening course — read the four opening principles,
watch them in annotated games, then practise real opening lines move by move
against an auto-replying book and Stockfish. Live at <https://chess.nlogn.ir>.

## Architecture

Static site, no SPA, no router. [MkDocs Material](https://squidfunk.github.io/mkdocs-material/)
renders RTL Farsi markdown into HTML at build time. Each `{{ board(...) }}` /
`{{ viewer(...) }}` / `{{ practice_opening(...) }}` macro in `course/macros.py`
emits a `<div class="chess-widget" data-mode="...">` placeholder. A Vite-built
bundle from `src-widgets/` hydrates those placeholders on the client into
interactive boards using [chessground](https://github.com/lichess-org/chessground),
[chess.js](https://github.com/jhlywa/chess.js), and Stockfish 16 (NNUE, WASM,
single-threaded Web Worker). URLs are real files — back/forward, deep links,
and SEO all work without JS state.

## Build

MkDocs must run before Vite (Vite drops its bundle into the site dir MkDocs
creates — see the [`Makefile`](Makefile)).

```sh
python -m venv course/.venv
course/.venv/bin/pip install -r course/requirements.txt
npm install
make build      # MkDocs → Vite
make serve      # full build → http://localhost:8000
```

## Tests

```sh
npx vitest run
```

## License

GPL-3.0 — chessground is GPL, so the combined work is GPL (see [`LICENSE`](LICENSE)).
Sound assets are licensed separately; see [`SOUNDS-LICENSE.md`](SOUNDS-LICENSE.md).

## Credits

Annotated game lines are adapted — ideas only, with original Farsi commentary —
from GM Mykhaylo Oleksiyenko's *Opening Compass*. Built with
[lichess-org/chessground](https://github.com/lichess-org/chessground),
[chess.js](https://github.com/jhlywa/chess.js), and
[Stockfish](https://stockfishchess.org/).
