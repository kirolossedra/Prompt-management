import type { ReactNode } from "react";
import { motion } from "motion/react";

export function StatCard({
  label,
  value,
  helper,
  icon,
  delay = 0,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  delay?: number;
}) {
  return (
    <motion.article
      className="stat-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
    >
      <div className="stat-card__icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </motion.article>
  );
}
