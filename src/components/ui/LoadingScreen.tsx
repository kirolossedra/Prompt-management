import { motion } from "motion/react";

export function LoadingScreen({ label = "Opening your vault" }: { label?: string }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <motion.div
        className="vault-loader"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }}
      />
      <strong>{label}</strong>
      <span>Connecting to your private workspace…</span>
    </div>
  );
}
