import { describe, it, expect, vi, beforeEach } from "vitest";
import { attachMoveSounds } from "./viewer-sounds.js";
import * as sound from "./sound.js";

vi.mock("./sound.js", () => ({ playSoundForSan: vi.fn() }));

function fakeViewer(san) {
  return {
    goTo: vi.fn(),
    toPath: vi.fn(),
    curData: vi.fn(() => ({ san })),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("attachMoveSounds", () => {
  it("returns a no-op teardown for a null viewer", () => {
    const teardown = attachMoveSounds(null);
    expect(typeof teardown).toBe("function");
    expect(() => teardown()).not.toThrow();
  });

  it("plays the SAN sound after goTo", () => {
    const v = fakeViewer("Nf3");
    attachMoveSounds(v);
    v.goTo("next");
    expect(sound.playSoundForSan).toHaveBeenCalledWith("Nf3");
  });

  it("plays the SAN sound after toPath", () => {
    const v = fakeViewer("exd5");
    attachMoveSounds(v);
    v.toPath("p");
    expect(sound.playSoundForSan).toHaveBeenCalledWith("exd5");
  });

  it("stays silent when the current node has no SAN", () => {
    const v = fakeViewer(undefined);
    attachMoveSounds(v);
    v.goTo("first");
    expect(sound.playSoundForSan).not.toHaveBeenCalled();
  });

  it("swallows curData errors", () => {
    const v = fakeViewer("Nf3");
    v.curData = vi.fn(() => { throw new Error("boom"); });
    attachMoveSounds(v);
    expect(() => v.goTo("next")).not.toThrow();
    expect(sound.playSoundForSan).not.toHaveBeenCalled();
  });

  it("teardown stops further sounds on navigation", () => {
    const v = fakeViewer("Nf3");
    const teardown = attachMoveSounds(v);
    teardown();
    v.goTo("next");
    v.toPath("p");
    expect(sound.playSoundForSan).not.toHaveBeenCalled();
  });
});
