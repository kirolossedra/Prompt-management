import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import type { CollectionName, EntityDialogState } from "../../types/domain";
import { useVault } from "../../context/VaultContext";
import { COLLECTION_LABELS } from "../../lib/constants";
import { archiveBlockers, recordTitle } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { EntityDialog } from "./EntityDialog";

interface EntityUiContextValue {
  openCreate: (kind: CollectionName, defaults?: Record<string, string>) => void;
  openEdit: (kind: CollectionName, id: string) => void;
  requestArchive: (kind: CollectionName, id: string) => void;
  closeEntityDialog: () => void;
}

const EntityUiContext = createContext<EntityUiContextValue | null>(null);

export function EntityUiProvider({ children }: { children: ReactNode }) {
  const { data, archiveRecord } = useVault();
  const [dialog, setDialog] = useState<EntityDialogState | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ kind: CollectionName; id: string } | null>(null);
  const [archiving, setArchiving] = useState(false);

  const openCreate = useCallback((kind: CollectionName, defaults?: Record<string, string>) => {
    setDialog({ kind, defaults });
  }, []);

  const openEdit = useCallback((kind: CollectionName, id: string) => {
    setDialog({ kind, id });
  }, []);

  const requestArchive = useCallback((kind: CollectionName, id: string) => {
    setArchiveTarget({ kind, id });
  }, []);

  const closeEntityDialog = useCallback(() => setDialog(null), []);

  const value = useMemo(
    () => ({ openCreate, openEdit, requestArchive, closeEntityDialog }),
    [openCreate, openEdit, requestArchive, closeEntityDialog],
  );

  const targetRecord = archiveTarget ? data[archiveTarget.kind][archiveTarget.id] : undefined;
  const blockers = archiveTarget ? archiveBlockers(archiveTarget.kind, archiveTarget.id, data) : [];

  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveRecord(archiveTarget.kind, archiveTarget.id);
      toast.success(`${COLLECTION_LABELS[archiveTarget.kind]} archived.`);
      setArchiveTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The record could not be archived.");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <EntityUiContext.Provider value={value}>
      {children}
      <EntityDialog state={dialog} onClose={closeEntityDialog} />
      <Modal
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title={`Archive ${archiveTarget ? COLLECTION_LABELS[archiveTarget.kind].toLowerCase() : "record"}?`}
        description={targetRecord ? recordTitle(archiveTarget!.kind, targetRecord) : undefined}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setArchiveTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={archiving} disabled={blockers.length > 0} icon={<Archive size={17} />} onClick={confirmArchive}>Archive</Button>
        </>}
      >
        {blockers.length ? (
          <div className="inline-callout warning">
            <strong>This record still has active dependents.</strong>
            <span>Archive these first: {blockers.join(", ")}.</span>
          </div>
        ) : (
          <div className="inline-callout">
            <strong>The record will move to Archive.</strong>
            <span>Permanent deletion is intentionally unavailable while historical-deletion behavior remains an Open decision.</span>
          </div>
        )}
      </Modal>
    </EntityUiContext.Provider>
  );
}

export function useEntityUi(): EntityUiContextValue {
  const value = useContext(EntityUiContext);
  if (!value) throw new Error("useEntityUi must be used inside EntityUiProvider.");
  return value;
}
