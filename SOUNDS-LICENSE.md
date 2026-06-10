# Sound assets license

The move/capture/check/notify/error sounds in
`course/docs/assets/sounds/lichess/` are taken from
[lichess-org/lila](https://github.com/lichess-org/lila/tree/master/public/sound):

| File | Source in lila | Theme |
|------|----------------|-------|
| `Move.mp3` | `public/sound/standard/Move.mp3` | standard |
| `Capture.mp3` | `public/sound/standard/Capture.mp3` | standard |
| `Error.mp3` | `public/sound/standard/Error.mp3` | standard |
| `GenericNotify.mp3` | `public/sound/standard/GenericNotify.mp3` | standard |
| `Check.mp3` | `public/sound/sfx/Check.mp3` | sfx |

These sounds are by [Enigmahack](https://github.com/Enigmahack) / the lila
authors and are licensed **AGPL-3.0-or-later** (lila's default license; the
`sfx` theme is listed explicitly under that license in lila's `COPYING.md`).

This project is GPL-3.0 (chessground forces GPL on the combined work). Bundling
AGPL-3.0 audio with a GPL-3.0 work is acceptable for this open, source-available
static site: the full source is published, satisfying AGPL's source-availability
requirement. Attribution to lichess / the lila authors is retained here.

The previous custom sprite (`course/docs/assets/sounds/chess_console_sounds.mp3`)
is no longer referenced by the widgets and can be removed once no other consumer
depends on it.
