/**
 * Stockfish engine wrapper using Web Worker.
 * Loads Stockfish 16 NNUE single-threaded from local public assets.
 * The .js + .wasm files live in public/assets/stockfish/ so Vite serves them as-is.
 *
 * UCI protocol: send commands as strings, parse responses.
 */

/** Difficulty presets: maps level name to UCI Skill Level + search depth. */
const DIFFICULTY = {
  beginner:     { skillLevel: 1,  depth: 5  },
  intermediate: { skillLevel: 10, depth: 10 },
  advanced:     { skillLevel: 20, depth: 15 },
};

export class Engine {
  constructor() {
    /** @type {Worker|null} */
    this._worker = null;
    /** @type {((line: string) => void)|null} */
    this._onMessage = null;
    this._ready = false;
    this._difficulty = "intermediate";
  }

  /**
   * Initialize the engine. Must be called before any other method.
   * @returns {Promise<void>} Resolves when engine responds to UCI handshake.
   */
  async init() {
    if (this._worker) return;

    const workerUrl = import.meta.env.BASE_URL + "assets/stockfish/stockfish.js";

    return new Promise((resolve, reject) => {
      try {
        this._worker = new Worker(workerUrl);
      } catch (err) {
        reject(new Error("Failed to create Stockfish worker: " + err.message));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Stockfish init timed out"));
      }, 30_000);

      this._worker.onmessage = (e) => {
        const line = typeof e.data === "string" ? e.data : String(e.data);
        if (line.includes("uciok")) {
          this._ready = true;
          this._applyDifficulty();
          this._send("isready");
        }
        if (line.includes("readyok") && this._ready) {
          clearTimeout(timeout);
          resolve();
        }
        if (this._onMessage) {
          this._onMessage(line);
        }
      };

      this._worker.onerror = (err) => {
        clearTimeout(timeout);
        reject(new Error("Stockfish worker error: " + (err.message || "unknown")));
      };

      this._send("uci");
    });
  }

  /**
   * Set difficulty level.
   * @param {"beginner"|"intermediate"|"advanced"} level
   */
  setDifficulty(level) {
    if (!DIFFICULTY[level]) return;
    this._difficulty = level;
    if (this._ready) this._applyDifficulty();
  }

  /**
   * Get best move for a position.
   * @param {string} fen
   * @returns {Promise<string>} Best move in UCI format (e.g. "e2e4")
   */
  async getBestMove(fen) {
    if (!this._worker) throw new Error("Engine not initialized");

    const { depth } = DIFFICULTY[this._difficulty];

    return new Promise((resolve) => {
      this._onMessage = (line) => {
        if (line.startsWith("bestmove")) {
          this._onMessage = null;
          resolve(line.split(" ")[1]);
        }
      };
      this._send(`position fen ${fen}`);
      this._send(`go depth ${depth}`);
    });
  }

  /** Stop any running search. */
  stop() {
    if (this._worker) this._send("stop");
  }

  /** Shut down the engine worker. */
  destroy() {
    if (this._worker) {
      this._send("quit");
      this._worker.terminate();
      this._worker = null;
      this._ready = false;
    }
  }

  /** @private */
  _send(cmd) {
    this._worker?.postMessage(cmd);
  }

  /** @private */
  _applyDifficulty() {
    const { skillLevel } = DIFFICULTY[this._difficulty];
    this._send(`setoption name Skill Level value ${skillLevel}`);
  }
}
