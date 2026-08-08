import { Fragment } from "react";

export function HighlightText({ text, query }: { text: string; query: string }) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return <>{text}</>;
  const escaped = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(${escaped.join("|")})`, "ig");
  return <>{text.split(matcher).map((part, index) =>
    words.some((word) => part.toLowerCase() === word.toLowerCase())
      ? <mark key={index}>{part}</mark>
      : <Fragment key={index}>{part}</Fragment>
  )}</>;
}
