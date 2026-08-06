import type { ReactNode } from "react";
import { cx } from "../../lib/utils";

export function Badge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger" | "purple";
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("badge", `badge--${tone}`, className)}>
      {icon}
      {children}
    </span>
  );
}
