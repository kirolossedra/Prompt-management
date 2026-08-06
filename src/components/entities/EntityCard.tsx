import type { ReactNode } from "react";
import { Archive, ArrowUpRight, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "../ui/Button";

export function EntityCard({
  title,
  meta,
  excerpt,
  icon,
  badges,
  onOpen,
  onEdit,
  onArchive,
}: {
  title: string;
  meta?: string;
  excerpt?: string;
  icon: ReactNode;
  badges?: ReactNode;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <motion.article className="entity-card" layout whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <button className="entity-card__main" onClick={onOpen}>
        <div className="entity-card__icon">{icon}</div>
        <div className="entity-card__copy">
          {meta ? <span>{meta}</span> : null}
          <h3>{title}</h3>
          {excerpt ? <p>{excerpt}</p> : null}
        </div>
        <ArrowUpRight size={17} aria-hidden />
      </button>
      {badges ? <div className="entity-card__badges">{badges}</div> : null}
      <footer>
        <Button variant="ghost" size="sm" icon={<Pencil size={15} />} onClick={onEdit}>Edit</Button>
        <Button variant="ghost" size="sm" icon={<Archive size={15} />} onClick={onArchive}>Archive</Button>
      </footer>
    </motion.article>
  );
}
