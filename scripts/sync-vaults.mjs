import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function resolveObsidianConfigPath() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library/Application Support/obsidian/obsidian.json");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "obsidian", "obsidian.json");
  }
  return path.join(os.homedir(), ".config", "obsidian", "obsidian.json");
}

const obsidianCfgPath = resolveObsidianConfigPath();
const artifacts = ["manifest.json", "main.js", "styles.css"];
const projectRoot = process.cwd();

if (!fs.existsSync(obsidianCfgPath)) {
  console.log("No local Obsidian configuration found, skipping vault sync.");
  process.exit(0);
}

const cfg = JSON.parse(fs.readFileSync(obsidianCfgPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "manifest.json"), "utf8"));
const vaults = Object.values(cfg.vaults || {});

for (const v of vaults) {
  if (!v.path || !fs.existsSync(v.path)) continue;
  const pluginDir = path.join(v.path, ".obsidian", "plugins", manifest.id);
  fs.mkdirSync(pluginDir, { recursive: true });
  for (const file of artifacts) {
    fs.copyFileSync(path.join(projectRoot, file), path.join(pluginDir, file));
  }
  console.log(`✓ Synced ${manifest.id} v${manifest.version} -> ${pluginDir}`);
}
