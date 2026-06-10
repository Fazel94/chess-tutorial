import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Global stubs ───────────────────────────────────────────────────────────────
// Must be in place before any import of sound.js so the module captures them.

const mockStart = vi.fn();
const mockConnect = vi.fn();
const mockSource = { buffer: null, connect: mockConnect, start: mockStart };
const mockDecodeAudioData = vi.fn(async (buf) => buf);
const mockCreateBufferSource = vi.fn(() => mockSource);
const mockResume = vi.fn();
const mockCtx = {
  state: "running",
  createBufferSource: mockCreateBufferSource,
  decodeAudioData: mockDecodeAudioData,
  resume: mockResume,
  destination: {},
};

vi.stubGlobal("AudioContext", vi.fn(() => mockCtx));
vi.stubGlobal(
  "fetch",
  vi.fn(() =>
    Promise.resolve({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })
  )
);

// Distinct files referenced by the lichess sound mapping (each fetched once).
const UNIQUE_FILES = 5; // Move, Capture, Check, Error, GenericNotify

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("sound", () => {
  // Dynamically imported per test so module-level singletons reset.
  let loadSounds, playSound, playSoundForMove, playMoveSound, playSoundForSan,
      soundNameForMove, soundNameForSan;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCtx.state = "running";
    ({
      loadSounds, playSound, playSoundForMove, playMoveSound, playSoundForSan,
      soundNameForMove, soundNameForSan,
    } = await import("./sound.js"));
  });

  // ── loadSounds ───────────────────────────────────────────────────────────────

  describe("loadSounds", () => {
    it("fetches each unique sound file exactly once", async () => {
      await loadSounds();
      expect(fetch).toHaveBeenCalledTimes(UNIQUE_FILES);
    });

    it("is idempotent — second call does not fetch again", async () => {
      await loadSounds();
      await loadSounds();
      expect(fetch).toHaveBeenCalledTimes(UNIQUE_FILES);
    });

    it("decodes each fetched file as audio", async () => {
      await loadSounds();
      expect(mockDecodeAudioData).toHaveBeenCalledTimes(UNIQUE_FILES);
      expect(mockDecodeAudioData.mock.calls[0][0]).toBeInstanceOf(ArrayBuffer);
    });

    it("loads the lichess assets path", async () => {
      await loadSounds();
      const urls = fetch.mock.calls.map((c) => c[0]);
      expect(urls.every((u) => u.includes("assets/sounds/lichess/"))).toBe(true);
      expect(urls.some((u) => u.endsWith("Move.mp3"))).toBe(true);
      expect(urls.some((u) => u.endsWith("Check.mp3"))).toBe(true);
    });
  });

  // ── playSound ────────────────────────────────────────────────────────────────

  describe("playSound", () => {
    it("is a no-op when sounds have not been loaded yet", () => {
      playSound("move");
      expect(mockStart).not.toHaveBeenCalled();
    });

    it("is a no-op for an unknown sound name", async () => {
      await loadSounds();
      playSound("notARealSound");
      expect(mockStart).not.toHaveBeenCalled();
    });

    it("plays a loaded sound from the start (no sprite offset)", async () => {
      await loadSounds();
      playSound("move");
      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(mockStart.mock.calls[0]).toEqual([0]); // start(0), whole clip
    });

    it("resumes a suspended context before playing", async () => {
      await loadSounds();
      mockCtx.state = "suspended";
      playSound("move");
      expect(mockResume).toHaveBeenCalled();
    });

    it("does not resume an already-running context", async () => {
      await loadSounds();
      mockCtx.state = "running";
      playSound("move");
      expect(mockResume).not.toHaveBeenCalled();
    });
  });

  // ── soundNameForMove (pure mapping) ───────────────────────────────────────────

  describe("soundNameForMove", () => {
    it("maps a quiet move to 'move'", () => {
      expect(soundNameForMove({ flags: "n" })).toBe("move");
    });
    it("maps captures (c / e) to 'capture'", () => {
      expect(soundNameForMove({ flags: "c" })).toBe("capture");
      expect(soundNameForMove({ flags: "e" })).toBe("capture");
    });
    it("maps castling (k / q) to 'castle'", () => {
      expect(soundNameForMove({ flags: "k" })).toBe("castle");
      expect(soundNameForMove({ flags: "q" })).toBe("castle");
    });
    it("maps promotion to 'promotion'", () => {
      expect(soundNameForMove({ flags: "np" })).toBe("promotion");
    });
    it("prioritises promotion over capture", () => {
      expect(soundNameForMove({ flags: "cp" })).toBe("promotion");
    });
  });

  // ── soundNameForSan (pure mapping) ────────────────────────────────────────────

  describe("soundNameForSan", () => {
    it("returns null for empty SAN", () => {
      expect(soundNameForSan("")).toBeNull();
      expect(soundNameForSan(undefined)).toBeNull();
    });
    it("maps quiet move / capture / castle / promotion", () => {
      expect(soundNameForSan("Nf3")).toBe("move");
      expect(soundNameForSan("exd5")).toBe("capture");
      expect(soundNameForSan("O-O")).toBe("castle");
      expect(soundNameForSan("O-O-O")).toBe("castle");
      expect(soundNameForSan("e8=Q")).toBe("promotion");
    });
    it("prioritises promotion over capture (exd8=Q)", () => {
      expect(soundNameForSan("exd8=Q+")).toBe("promotion");
    });
  });

  // ── playSoundForMove ─────────────────────────────────────────────────────────

  describe("playSoundForMove", () => {
    beforeEach(async () => {
      await loadSounds();
      vi.clearAllMocks();
    });

    it("plays exactly one sound for a quiet move with no check", () => {
      playSoundForMove({ flags: "n" }, {});
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it("layers a delayed check sound when state.isCheck is true", async () => {
      vi.useFakeTimers();
      playSoundForMove({ flags: "n" }, { isCheck: true });
      expect(mockStart).toHaveBeenCalledTimes(1); // move sound now
      await vi.runAllTimersAsync();
      expect(mockStart).toHaveBeenCalledTimes(2); // + delayed check
      vi.useRealTimers();
    });

    it("does not play a check sound when state is empty", async () => {
      vi.useFakeTimers();
      playSoundForMove({ flags: "n" }, {});
      await vi.runAllTimersAsync();
      expect(mockStart).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  // ── playSoundForSan ──────────────────────────────────────────────────────────

  describe("playSoundForSan", () => {
    beforeEach(async () => {
      await loadSounds();
      vi.clearAllMocks();
    });

    it("is a no-op for empty SAN", () => {
      playSoundForSan("");
      expect(mockStart).not.toHaveBeenCalled();
    });

    it("plays one sound for a quiet move", () => {
      playSoundForSan("Nf3");
      expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it("layers a delayed check sound when SAN ends in + or #", async () => {
      vi.useFakeTimers();
      playSoundForSan("Qh7#");
      expect(mockStart).toHaveBeenCalledTimes(1);
      await vi.runAllTimersAsync();
      expect(mockStart).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });

  // ── playMoveSound ────────────────────────────────────────────────────────────

  describe("playMoveSound", () => {
    beforeEach(async () => {
      await loadSounds();
      vi.clearAllMocks();
    });

    it("delegates to playSoundForMove with check flags from state.game", async () => {
      vi.useFakeTimers();
      const state = { game: { isCheck: () => true, isCheckmate: () => false } };
      playMoveSound(state, { flags: "n" });
      expect(mockStart).toHaveBeenCalledTimes(1);
      await vi.runAllTimersAsync();
      expect(mockStart).toHaveBeenCalledTimes(2); // check sound layered
      vi.useRealTimers();
    });
  });
});
