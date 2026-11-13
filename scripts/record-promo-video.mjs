import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import esbuild from "esbuild";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const SCRATCH_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "vivid-promo-studio-"));
const OUT_MP4 = path.join(PROJECT_ROOT, "docs", "assets", "vivid-promo.mp4");
const OUT_GIF = path.join(PROJECT_ROOT, "docs", "assets", "hero-demo.gif");
const CHROME_BIN =
  process.env.CHROME_BIN ||
  (fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "google-chrome");
const FFMPEG_BIN =
  process.env.FFMPEG_BIN ||
  (fs.existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg");

const FPS = 60;
const DURATION_SEC = 24;
const TOTAL_FRAMES = FPS * DURATION_SEC; // 1440 frames

async function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.code}: ${msg.error.message}`));
      else resolve(msg.result);
    }
  });

  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return {
    send,
    close: () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  };
}

function buildStudioHtml(bundlePath, cssPath) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1920, initial-scale=1.0" />
  <link rel="stylesheet" href="file://${cssPath}" />
  <style>
    :root {
      --background-primary: #14151a;
      --background-secondary: #1b1d24;
      --background-secondary-alt: rgba(255, 255, 255, 0.04);
      --background-modifier-border: rgba(255, 255, 255, 0.10);
      --background-modifier-border-hover: rgba(99, 102, 241, 0.45);
      --background-modifier-hover: rgba(255, 255, 255, 0.07);
      --text-normal: #f3f4f6;
      --text-muted: #9ca3af;
      --text-faint: #6b7280;
      --interactive-accent: #818cf8;
      --link-color: #818cf8;
      --link-color-hover: #a5b4fc;
      --tag-background: rgba(99, 102, 241, 0.16);
      --tag-color: #a5b4fc;
      --font-monospace: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-text: "PingFang SC", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      background: #070b14;
      font-family: var(--font-text);
      color: var(--text-normal);
      -webkit-font-smoothing: antialiased;
    }
    #viewport {
      position: relative;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
    }
    #camera-rig {
      position: absolute;
      inset: 0;
      width: 1920px;
      height: 1080px;
      transform-origin: 0 0;
      will-change: transform;
    }
    .wallpaper-backdrop {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 16% 18%, rgba(99, 102, 241, 0.55) 0%, transparent 45%),
        radial-gradient(circle at 86% 24%, rgba(168, 85, 247, 0.46) 0%, transparent 44%),
        radial-gradient(circle at 52% 92%, rgba(14, 165, 233, 0.34) 0%, transparent 48%),
        linear-gradient(135deg, #090d16 0%, #15142b 52%, #0c1322 100%);
    }
    .macos-obsidian-window {
      position: absolute;
      left: 160px;
      top: 48px;
      width: 1600px;
      height: 944px;
      border-radius: 16px;
      background: #14151a;
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow:
        0 38px 98px rgba(0, 0, 0, 0.72),
        0 0 0 1px rgba(255, 255, 255, 0.06),
        inset 0 1px 0 rgba(255, 255, 255, 0.10);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .macos-titlebar {
      height: 44px;
      flex-shrink: 0;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(28, 29, 36, 0.96);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .traffic-lights {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 110px;
    }
    .tl { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .tl-red { background: #ff5f57; }
    .tl-yellow { background: #febc2e; }
    .tl-green { background: #28c840; }
    .obsidian-tabs-bar {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 100%;
      padding-top: 7px;
    }
    .obsidian-tab-btn {
      appearance: none;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-bottom: none;
      background: rgba(20, 21, 28, 0.55);
      color: #9ca3af;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 600;
      padding: 7px 15px;
      border-radius: 8px 8px 0 0;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
    }
    .obsidian-tab-btn.is-active {
      background: #14151a;
      color: #f9fafb;
      border-color: rgba(129, 140, 248, 0.35);
      box-shadow: inset 0 2px 0 #818cf8;
    }
    .tab-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #6b7280;
    }
    .obsidian-tab-btn.is-active .tab-dot {
      background: #818cf8;
    }
    .tab-mode-pill {
      font-size: 10.5px;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.16);
      color: #a5b4fc;
    }
    .titlebar-right-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 11px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.28);
      color: #6ee7b7;
      font-size: 11.5px;
      font-weight: 600;
    }
    .live-pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
    }
    .obsidian-workspace-body {
      flex: 1;
      display: flex;
      min-height: 0;
      position: relative;
    }
    .obsidian-mini-ribbon {
      width: 46px;
      flex-shrink: 0;
      background: #111217;
      border-right: 1px solid rgba(255, 255, 255, 0.07);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 14px;
      gap: 14px;
    }
    .ribbon-icon {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      color: #6b7280;
    }
    .ribbon-icon.is-active {
      background: rgba(99, 102, 241, 0.20);
      color: #a5b4fc;
    }
    .obsidian-scroll-pane {
      position: relative;
      flex: 1;
      overflow: hidden;
      padding: 16px 38px 20px;
      background: #14151a;
    }
    .obsidian-doc-container {
      max-width: 1420px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 13px;
    }
    .tab-panel {
      display: none;
      flex-direction: column;
      gap: 13px;
    }
    .tab-panel.is-active {
      display: flex;
    }
    .doc-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .doc-hero-title {
      font-size: 21px;
      font-weight: 750;
      letter-spacing: -0.02em;
      background: linear-gradient(90deg, #f9fafb, #a5b4fc 60%, #6ee7b7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .doc-meta-pills {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .doc-meta-pill {
      font-size: 11px;
      padding: 3px 9px;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.13);
      border: 1px solid rgba(129, 140, 248, 0.28);
      color: #c7d2fe;
      font-family: var(--font-monospace);
    }
    .tab2-bottom-grid {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 14px;
      align-items: stretch;
    }
    .vault-pulse-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .studio-calc-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
      justify-content: center;
    }
    .studio-calc-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .studio-calc-label {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--text-muted);
    }
    .studio-calc-label b {
      color: #a5b4fc;
      font-size: 14.5px;
      font-variant-numeric: tabular-nums;
    }
    .studio-calc-range {
      width: 100%;
      accent-color: #818cf8;
      height: 6px;
    }
    .studio-calc-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .studio-stat-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 10px;
      padding: 10px 12px;
    }
    .studio-stat-k {
      font-size: 11px;
      color: var(--text-muted);
    }
    .studio-stat-v {
      font-size: 18px;
      font-weight: 700;
      margin-top: 4px;
      color: #34d399;
      font-variant-numeric: tabular-nums;
    }
    .safety-bar-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 2px;
    }
    .safety-bar-head {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: var(--text-muted);
    }
    .safety-bar-track {
      height: 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }
    .safety-bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #6366f1, #10b981);
    }
    /* Ensure Promo SVG diagram scales cleanly inside fixed-height viewport with zero top/bottom clipping */
    .gpt-rich-svg-viewport {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .gpt-rich-svg-viewport svg {
      max-height: 214px;
      width: auto !important;
      max-width: 100%;
      height: auto !important;
      display: block;
    }
    /* Toast & Popover */
    .obsidian-toast {
      position: absolute;
      top: 22px;
      right: 30px;
      background: rgba(20, 22, 32, 0.96);
      border: 1px solid rgba(16, 185, 129, 0.65);
      color: #ecfdf5;
      padding: 11px 18px;
      border-radius: 11px;
      font-size: 13.5px;
      font-weight: 600;
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.65);
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.18s ease, transform 0.18s ease;
      pointer-events: none;
      z-index: 10001;
    }
    .obsidian-toast.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
    .obsidian-popover {
      position: absolute;
      width: 420px;
      background: rgba(22, 23, 30, 0.98);
      border: 1px solid rgba(129, 140, 248, 0.48);
      border-radius: 11px;
      padding: 12px 14px;
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.68);
      opacity: 0;
      transform: scale(0.95);
      transition: opacity 0.15s ease, transform 0.15s ease;
      pointer-events: none;
      z-index: 45;
    }
    .obsidian-popover.is-visible {
      opacity: 1;
      transform: scale(1);
    }
    .popover-title { font-size: 13px; font-weight: 700; color: #f9fafb; }
    .popover-meta { font-size: 11px; color: #818cf8; margin: 4px 0 6px; font-family: var(--font-monospace); }
    .popover-body { font-size: 12px; color: #d1d5db; line-height: 1.48; }

    /* Virtual Cursor, Highlight Halo & Dual Ripples */
    #click-ripples {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 9998;
    }
    .cursor-ripple {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2.4px solid #818cf8;
      background: rgba(129, 140, 248, 0.18);
      box-shadow: 0 0 16px rgba(129, 140, 248, 0.40);
      pointer-events: none;
    }
    .cursor-ripple.is-secondary {
      border-color: #34d399;
      background: transparent;
      box-shadow: none;
    }
    #macos-cursor {
      position: absolute;
      left: 0;
      top: 0;
      z-index: 9999;
      pointer-events: none;
      transform-origin: 0 0;
      will-change: transform;
    }
    #cursor-halo {
      position: absolute;
      left: 0;
      top: 0;
      width: 68px;
      height: 68px;
      margin-left: -34px;
      margin-top: -34px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(129, 140, 248, 0.30) 0%, rgba(56, 189, 248, 0.11) 48%, transparent 72%);
      pointer-events: none;
      transform-origin: 50% 50%;
      opacity: 0.22;
      will-change: transform, opacity;
    }

    /* Bottom Frosted Caption Pill */
    .studio-caption-pill {
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 9px 19px;
      border-radius: 999px;
      background: rgba(15, 17, 26, 0.86);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 14px 36px rgba(0, 0, 0, 0.50);
      font-size: 14.5px;
      font-weight: 600;
      color: #f9fafb;
      z-index: 10000;
      white-space: nowrap;
    }
    .caption-badge {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.06em;
      padding: 3px 8px;
      border-radius: 999px;
      background: linear-gradient(135deg, #6366f1, #10b981);
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="file://${bundlePath}"></script>
</body>
</html>`;
}

function runCommandAsync(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${bin} exited with ${code}:\n${stderr.slice(-800)}`));
    });
  });
}

async function main() {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MP4), { recursive: true });

  const bundlePath = path.join(SCRATCH_DIR, "studio-bundle.js");
  const htmlPath = path.join(SCRATCH_DIR, "studio.html");
  const profileDir = path.join(SCRATCH_DIR, "chrome-profile");
  fs.rmSync(profileDir, { recursive: true, force: true });
  fs.mkdirSync(profileDir, { recursive: true });

  console.log("1/4 Bundling studio showcase app with esbuild...");
  await esbuild.build({
    entryPoints: [path.join(PROJECT_ROOT, "scripts/promo-studio/studioEntry.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome120",
    outfile: bundlePath,
    logLevel: "warning"
  });

  fs.writeFileSync(
    htmlPath,
    buildStudioHtml(bundlePath, path.join(PROJECT_ROOT, "styles.css")),
    "utf8"
  );

  console.log("2/4 Launching headless Google Chrome via CDP...");
  const chrome = spawn(
    CHROME_BIN,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      `--user-data-dir=${profileDir}`,
      "--remote-debugging-port=0",
      "--window-size=1920,1080"
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  const wsBaseUrl = await new Promise((resolve, reject) => {
    let logs = "";
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for Chrome DevTools WS. Logs:\n${logs}`)),
      25000
    );
    const onData = (chunk) => {
      logs += String(chunk);
      const match = /DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/.exec(logs);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    };
    chrome.stderr.on("data", onData);
    chrome.stdout.on("data", onData);
    chrome.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited prematurely (${code}). Logs:\n${logs}`));
    });
  });

  const httpPort = new URL(wsBaseUrl).port;
  const targets = await (await fetch(`http://127.0.0.1:${httpPort}/json/list`)).json();
  const pageTarget = targets.find((t) => t.type === "page") ?? targets[0];
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error("Could not find page target WebSocket URL");
  }

  const cdp = await createCdpClient(pageTarget.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Page.navigate", { url: `file://${htmlPath}` });

  for (let i = 0; i < 60; i++) {
    const res = await cdp.send("Runtime.evaluate", {
      expression: "Boolean(window.__studioReady)"
    });
    if (res?.result?.value === true) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  await cdp.send("Runtime.evaluate", { expression: "window.__stepStudio(0)" });

  console.log(`3/4 Recording ${TOTAL_FRAMES} deterministic 60fps frames to ${OUT_MP4}...`);
  const ffmpeg = spawn(
    FFMPEG_BIN,
    [
      "-y",
      "-f",
      "image2pipe",
      "-framerate",
      String(FPS),
      "-c:v",
      "mjpeg",
      "-i",
      "-",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      OUT_MP4
    ],
    { stdio: ["pipe", "ignore", "pipe"] }
  );

  let ffmpegErr = "";
  ffmpeg.stderr.on("data", (d) => {
    ffmpegErr += String(d);
  });

  const dtMs = 1000 / FPS;
  const startWall = Date.now();

  try {
    for (let f = 0; f < TOTAL_FRAMES; f++) {
      await cdp.send("Runtime.evaluate", {
        expression: `window.__stepStudio(${dtMs})`,
        awaitPromise: false
      });
      const shot = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 94,
        optimizeForSpeed: true
      });
      const buf = Buffer.from(shot.data, "base64");
      const canContinue = ffmpeg.stdin.write(buf);
      if (!canContinue) {
        await new Promise((res) => ffmpeg.stdin.once("drain", res));
      }
      if ((f + 1) % 240 === 0) {
        const elapsed = ((Date.now() - startWall) / 1000).toFixed(1);
        console.log(`  captured frame ${f + 1}/${TOTAL_FRAMES} (${elapsed}s)`);
      }
    }
  } finally {
    ffmpeg.stdin.end();
    cdp.close();
    chrome.kill("SIGKILL");
  }

  await new Promise((resolve, reject) => {
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with ${code}:\n${ffmpegErr.slice(-800)}`));
    });
  });

  console.log(`4/4 Generating palette-optimized README GIF -> ${OUT_GIF}...`);
  await runCommandAsync(FFMPEG_BIN, [
    "-y",
    "-i",
    OUT_MP4,
    "-vf",
    "fps=12,scale=860:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
    "-loop",
    "0",
    OUT_GIF
  ]);

  if (process.env.PROMO_COPY_DIR) {
    fs.mkdirSync(process.env.PROMO_COPY_DIR, { recursive: true });
    fs.copyFileSync(OUT_MP4, path.join(process.env.PROMO_COPY_DIR, "vivid-promo.mp4"));
    fs.copyFileSync(OUT_GIF, path.join(process.env.PROMO_COPY_DIR, "hero-demo.gif"));
  }
  fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });

  const mp4Mb = (fs.statSync(OUT_MP4).size / 1024 / 1024).toFixed(2);
  const gifMb = (fs.statSync(OUT_GIF).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Done! MP4: ${OUT_MP4} (${mp4Mb} MB), GIF: ${OUT_GIF} (${gifMb} MB)`);
}

main().catch((err) => {
  console.error("❌ Promo generation failed:", err);
  process.exit(1);
});
