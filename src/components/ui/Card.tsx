import { motion, type HTMLMotionProps } from "motion/react";
import { cx } from "../../lib/utils";

export function Card({ className, children, ...props }: HTMLMotionProps<"section">) {
  return (
    <motion.section
      className={cx("card", className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      {...props}
    >
      {children}
    </motion.section>
  );
}
