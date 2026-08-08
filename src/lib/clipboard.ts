/**
 * Copies plain text to the system clipboard.
 * Uses the modern Clipboard API on HTTPS and falls back to a temporary textarea
 * for browsers where navigator.clipboard is unavailable.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  const value = String(text ?? "");

  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard access is not available in this environment.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("The browser did not allow clipboard access.");
  }
}
