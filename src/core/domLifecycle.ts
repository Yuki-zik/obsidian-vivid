export interface DeferredMountHooks {
  onMount: () => void;
  onResize: () => void;
  onDispose?: () => void;
}

/**
 * Safely mounts size-dependent canvases (such as Apache ECharts) across Obsidian's
 * off-DOM Reading View virtualizer, Live Preview embeds, collapsed Callouts, and background tabs.
 */
export function mountWhenSizedAndConnected(
  el: HTMLElement,
  hooks: DeferredMountHooks
): { cleanup: () => void } {
  let mounted = false;
  let disposed = false;
  let lastW = 0;
  let lastH = 0;
  const timers: number[] = [];

  const clearTimers = () => {
    while (timers.length > 0) {
      const t = timers.pop();
      if (t !== undefined) window.clearTimeout(t);
    }
  };

  const check = () => {
    if (disposed) return;
    if (!el.isConnected) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w <= 0 || h <= 0) return;

    if (!mounted) {
      mounted = true;
      lastW = w;
      lastH = h;
      clearTimers();
      hooks.onMount();
    } else if (w !== lastW || h !== lastH) {
      lastW = w;
      lastH = h;
      hooks.onResize();
    }
  };

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => check())
      : null;
  ro?.observe(el);

  const io =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            check();
          }
        })
      : null;
  io?.observe(el);

  check();
  if (!mounted) {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => check());
    }
    for (const delay of [60, 200, 600, 1500]) {
      timers.push(window.setTimeout(() => check(), delay));
    }
  }

  return {
    cleanup: () => {
      if (disposed) return;
      disposed = true;
      clearTimers();
      ro?.disconnect();
      io?.disconnect();
      if (mounted) {
        hooks.onDispose?.();
      }
    }
  };
}
