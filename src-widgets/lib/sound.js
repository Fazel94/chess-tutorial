/**
 * Sound effects using the lichess "standard"/"sfx" sound files.
 *
 * Assets live in `assets/sounds/lichess/` and come from lichess-org/lila
 * (AGPLv3+, by Enigmahack / the lila authors). See SOUNDS-LICENSE.md.
 *
 * Lichess-style mapping: castling, promotion and take-back all reuse the plain
 * Move sound (lichess has no dedicated sound for those); game start / win /
 * loss / draw all use the generic notify sound (lichess's standard theme
 * symlinks Victory/Defeat/Draw to GenericNotify).
 */

const DIR = "assets/sounds/lichess/";

// Logical sound name → asset filename. Several names intentionally share a file.
const FILES = {
  move:      "Move.mp3",
  capture:   "Capture.mp3",
  castle:    "Move.mp3",
  promotion: "Move.mp3",
  takeBack:  "Move.mp3",
  check:     "Check.mp3",
  wrongMove: "Error.mp3",
  gameStart: "GenericNotify.mp3",
  gameWon:   "GenericNotify.mp3",
  gameLost:  "GenericNotify.mp3",
  gameDraw:  "GenericNotify.mp3",
};

let ctx = null;
/** @type {Record<string, AudioBuffer>} */
const buffers = {};
let loadPromise = null;

/**
 * Load every sound file (each unique file fetched once). Idempotent.
 * @returns {Promise<void>}
 */
export function loadSounds() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const baseUrl = import.meta.env.BASE_URL + DIR;

    // Fetch each distinct file once, then alias every logical name to its buffer.
    const namesByFile = {};
    for (const [name, file] of Object.entries(FILES)) {
      (namesByFile[file] ||= []).push(name);
    }
    await Promise.all(
      Object.entries(namesByFile).map(async ([file, names]) => {
        const resp = await fetch(baseUrl + file);
        const data = await resp.arrayBuffer();
        const buf = await ctx.decodeAudioData(data);
        for (const name of names) buffers[name] = buf;
      })
    );
  })();
  return loadPromise;
}

/**
 * Play a named sound. No-op if sounds aren't loaded or the name is unknown.
 * @param {keyof typeof FILES} name
 */
export function playSound(name) {
  const buf = buffers[name];
  if (!buf || !ctx) return;
  // Resume context if suspended (autoplay policy).
  if (ctx.state === "suspended") ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.connect(ctx.destination);
  source.start(0);
}

/**
 * Pick the sound name for a chess.js move from its flags.
 * Promotion takes priority over capture (a promotion may also capture).
 * @param {import("chess.js").Move} move
 * @returns {"promotion"|"capture"|"castle"|"move"}
 */
export function soundNameForMove(move) {
  if (move.flags.includes("p")) return "promotion";
  if (move.flags.includes("c") || move.flags.includes("e")) return "capture";
  if (move.flags.includes("k") || move.flags.includes("q")) return "castle";
  return "move";
}

/**
 * Pick the sound name for a move given only its SAN string (viewer path).
 * @param {string} san
 * @returns {"promotion"|"castle"|"capture"|"move"|null}
 */
export function soundNameForSan(san) {
  if (!san) return null;
  if (san.includes("=")) return "promotion";
  if (san.startsWith("O-O")) return "castle";
  if (san.includes("x")) return "capture";
  return "move";
}

/**
 * Play the appropriate sound for a chess move.
 * @param {import("chess.js").Move} move - Verbose move object from chess.js
 * @param {{ isCheck?: boolean, isCheckmate?: boolean }} state
 */
export function playSoundForMove(move, state = {}) {
  playSound(soundNameForMove(move));
  if (state.isCheck || state.isCheckmate) {
    // Small delay so the check sound doesn't collide with the move sound.
    setTimeout(() => playSound("check"), 50);
  }
}

/**
 * Play the appropriate sound for a move given only its SAN string.
 * @param {string} san
 */
export function playSoundForSan(san) {
  const name = soundNameForSan(san);
  if (!name) return;
  playSound(name);
  if (san.endsWith("+") || san.endsWith("#")) {
    setTimeout(() => playSound("check"), 50);
  }
}

/**
 * Sound dispatcher that reads check / checkmate flags from state.game.
 * @param {object} state - Widget state with a .game field (LiveGame).
 * @param {import("chess.js").Move} move
 */
export function playMoveSound(state, move) {
  playSoundForMove(move, {
    isCheck:     state.game.isCheck(),
    isCheckmate: state.game.isCheckmate(),
  });
}
