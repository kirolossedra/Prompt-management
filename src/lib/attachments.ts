import type { PromptAttachment } from "../types/domain";

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const MAX_PROMPT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_PROMPT = 20;

export interface AttachmentBatchValidation {
  ok: boolean;
  message: string;
  incomingBytes: number;
  resultingBytes: number;
  resultingCount: number;
}

export function validateAttachmentBatch(
  existing: Pick<PromptAttachment, "sizeBytes">[],
  files: Array<Pick<File, "name" | "size">>,
): AttachmentBatchValidation {
  if (!files.length) {
    return { ok: false, message: "Choose at least one file.", incomingBytes: 0, resultingBytes: 0, resultingCount: existing.length };
  }

  const oversized = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
  if (oversized) {
    return {
      ok: false,
      message: `${oversized.name} is larger than the ${formatBytes(MAX_ATTACHMENT_BYTES)} per-file limit.`,
      incomingBytes: files.reduce((sum, file) => sum + file.size, 0),
      resultingBytes: existing.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0),
      resultingCount: existing.length + files.length,
    };
  }

  const empty = files.find((file) => file.size <= 0);
  if (empty) {
    return {
      ok: false,
      message: `${empty.name} is empty and was not added.`,
      incomingBytes: files.reduce((sum, file) => sum + file.size, 0),
      resultingBytes: existing.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0),
      resultingCount: existing.length + files.length,
    };
  }

  const existingBytes = existing.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0);
  const incomingBytes = files.reduce((sum, file) => sum + file.size, 0);
  const resultingBytes = existingBytes + incomingBytes;
  const resultingCount = existing.length + files.length;

  if (resultingCount > MAX_ATTACHMENTS_PER_PROMPT) {
    return {
      ok: false,
      message: `A prompt can contain up to ${MAX_ATTACHMENTS_PER_PROMPT} files. Remove an existing file before adding more.`,
      incomingBytes,
      resultingBytes,
      resultingCount,
    };
  }

  if (resultingBytes > MAX_PROMPT_ATTACHMENT_BYTES) {
    return {
      ok: false,
      message: `Prompt files can use up to ${formatBytes(MAX_PROMPT_ATTACHMENT_BYTES)} in total. This selection would use ${formatBytes(resultingBytes)}.`,
      incomingBytes,
      resultingBytes,
      resultingCount,
    };
  }

  return { ok: true, message: "", incomingBytes, resultingBytes, resultingCount };
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");
      if (comma < 0) {
        reject(new Error(`Could not encode ${file.name}.`));
        return;
      }
      resolve(value.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

export function downloadAttachmentFile(attachment: PromptAttachment): void {
  const binary = atob(attachment.base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: attachment.mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = attachment.fileName || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function attachmentKind(attachment: Pick<PromptAttachment, "mimeType" | "fileName">): "image" | "pdf" | "text" | "archive" | "file" {
  const mime = String(attachment.mimeType || "").toLowerCase();
  const name = String(attachment.fileName || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("text/") || /\.(txt|md|csv|json|xml|yaml|yml|log|ts|tsx|js|jsx|py|java|c|cpp|h|hpp|css|html)$/i.test(name)) return "text";
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name) || mime.includes("zip") || mime.includes("compressed")) return "archive";
  return "file";
}
