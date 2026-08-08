import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_PROMPT,
  MAX_PROMPT_ATTACHMENT_BYTES,
  formatBytes,
  validateAttachmentBatch,
} from "./attachments";

describe("prompt attachment guardrails", () => {
  it("accepts a small multi-file batch", () => {
    const result = validateAttachmentBatch([], [
      { name: "a.txt", size: 100 },
      { name: "b.pdf", size: 1_000 },
    ]);
    expect(result.ok).toBe(true);
    expect(result.resultingCount).toBe(2);
  });

  it("rejects a file above the per-file limit", () => {
    const result = validateAttachmentBatch([], [{ name: "large.bin", size: MAX_ATTACHMENT_BYTES + 1 }]);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("per-file limit");
  });

  it("rejects a batch above the prompt total limit", () => {
    const existing = [{ sizeBytes: MAX_PROMPT_ATTACHMENT_BYTES - 100 }];
    const result = validateAttachmentBatch(existing, [{ name: "extra.txt", size: 101 }]);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("in total");
  });

  it("rejects a batch above the attachment-count limit", () => {
    const existing = Array.from({ length: MAX_ATTACHMENTS_PER_PROMPT }, () => ({ sizeBytes: 1 }));
    const result = validateAttachmentBatch(existing, [{ name: "extra.txt", size: 1 }]);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("up to");
  });

  it("formats file sizes for the UI", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
