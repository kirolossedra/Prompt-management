import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { motion } from "motion/react";
import { cx } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "secondary",
    size = "md",
    loading = false,
    icon,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      className={cx("button", `button--${variant}`, `button--${size}`, className)}
      disabled={disabled || loading}
      whileHover={disabled || loading ? undefined : { y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.14 }}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden className="spin" size={17} /> : icon}
      {children}
    </motion.button>
  );
});
