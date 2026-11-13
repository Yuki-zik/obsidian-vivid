import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  globalIgnores([
    "node_modules",
    "dist",
    "main.js",
    "esbuild.config.mjs",
    "vitest.config.ts",
    "scripts/**",
    "tests/**",
    "browser-companion/**",
    "launch-kit/**",
    "examples/**",
    "docs/**",
    "assets/**"
  ]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"]
        },
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
]);
