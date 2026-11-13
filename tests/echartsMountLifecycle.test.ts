// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { mountWhenSizedAndConnected } from "../src/core/domLifecycle";

describe("mountWhenSizedAndConnected (Obsidian virtualized off-DOM lifecycle)", () => {
  it("waits while element is detached or zero-width, then mounts immediately once attached and sized", () => {
    let resizeCallback: () => void = () => {};
    class MockResizeObserver {
      constructor(cb: () => void) {
        resizeCallback = cb;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);

    const detachedEl = document.createElement("div");
    let width = 0;
    let height = 320;
    Object.defineProperty(detachedEl, "clientWidth", { get: () => width });
    Object.defineProperty(detachedEl, "clientHeight", { get: () => height });

    const onMount = vi.fn();
    const onResize = vi.fn();
    const onDispose = vi.fn();

    const handle = mountWhenSizedAndConnected(detachedEl, {
      onMount,
      onResize,
      onDispose
    });

    // 1. Detached & 0 width -> must NOT mount prematurely
    expect(onMount).not.toHaveBeenCalled();

    // 2. Attached to DOM, still 0 width (e.g. hidden background tab) -> still waits
    document.body.appendChild(detachedEl);
    resizeCallback?.();
    expect(onMount).not.toHaveBeenCalled();

    // 3. Layout completes (width = 1200) -> mounts immediately!
    width = 1200;
    resizeCallback?.();
    expect(onMount).toHaveBeenCalledTimes(1);

    // 4. Subsequent resize -> triggers onResize instead of remounting
    width = 960;
    resizeCallback?.();
    expect(onMount).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledTimes(1);

    // 5. Cleanup disposes cleanly
    handle.cleanup();
    expect(onDispose).toHaveBeenCalledTimes(1);
    detachedEl.remove();
    vi.unstubAllGlobals();
  });
});
