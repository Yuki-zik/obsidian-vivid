import { describe, it, expect } from "vitest";
import { buildSandboxedArtifactSrcdoc, ARTIFACT_SANDBOX_ATTR } from "../src/core/artifactSandbox";

describe("artifactSandbox", () => {
  it("never includes allow-same-origin in iframe sandbox attributes", () => {
    expect(ARTIFACT_SANDBOX_ATTR).toBe("allow-scripts");
    expect(ARTIFACT_SANDBOX_ATTR).not.toContain("allow-same-origin");
  });

  it("injects theme variables and auto-resize postMessage bridge into HTML srcdoc", () => {
    const src = `<div class="card">Hello Interactive Widget</div>`;
    const doc = buildSandboxedArtifactSrcdoc(src, "artifact-123", true);
    expect(doc).toContain("gpt-rich-artifact-resize");
    expect(doc).toContain("artifact-123");
    expect(doc).toContain("data-theme=\"dark\"");
    expect(doc).toContain("Hello Interactive Widget");
  });
});
