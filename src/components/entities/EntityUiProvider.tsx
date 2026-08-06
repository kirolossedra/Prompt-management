import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CollectionName, EntityDialogState } from "../../types/domain";
import { useVault } from "../../context/VaultContext";
import { COLLECTION_LABELS } from "../../lib/constants";
import { archiveBlockers, deleteBlockers, recordTitle } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { EntityDialog } from "./EntityDialog";

interface EntityUiContextValue {
  openCreate: (kind: CollectionName, defaults?: Record<string, string>) => void;
  openEdit: (kind: CollectionName, id: string) => void;
  requestArchive: (kind: CollectionName, id: string) => void;
  requestDelete: (kind: CollectionName, id: string) => void;
  closeEntityDialog: () => void;
}

const EntityUiContext = createContext<EntityUiContextValue | null>(null);

export function EntityUiProvider({ children }: { children: ReactNode }) {
  const { data, archiveRecord, deleteRecord } = useVault();
  const [dialog, setDialog] = useState<EntityDialogState | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ kind: CollectionName; id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: CollectionName; id: string } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openCreate = useCallback((kind: CollectionName, defaults?: Record<string, string>) => {
    setDialog({ kind, defaults });
  }, []);

  const openEdit = useCallback((kind: CollectionName, id: string) => {
    setDialog({ kind, id });
  }, []);

  const requestArchive = useCallback((kind: CollectionName, id: string) => {
    setArchiveTarget({ kind, id });
  }, []);

  const requestDelete = useCallback((kind: CollectionName, id: string) => {
    setDeleteTarget({ kind, id });
  }, []);

  const closeEntityDialog = useCallback(() => setDialog(null), []);

  const value = useMemo(
    () => ({ openCreate, openEdit, requestArchive, requestDelete, closeEntityDialog }),
    [openCreate, openEdit, requestArchive, requestDelete, closeEntityDialog],
  );

  const archiveRecordTarget = archiveTarget ? data[archiveTarget.kind][archiveTarget.id] : undefined;
  const archiveDependencies = archiveTarget ? archiveBlockers(archiveTarget.kind, archiveTarget.id, data) : [];
  const deleteRecordTarget = deleteTarget ? data[deleteTarget.kind][deleteTarget.id] : undefined;
  const deleteDependencies = deleteTarget ? deleteBlockers(deleteTarget.kind, deleteTarget.id, data) : [];

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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRecord(deleteTarget.kind, deleteTarget.id);
      toast.success(`${COLLECTION_LABELS[deleteTarget.kind]} permanently deleted.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The record could not be deleted.");
    } finally {
      setDeleting(false);
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
        description={archiveRecordTarget && archiveTarget ? recordTitle(archiveTarget.kind, archiveRecordTarget) : undefined}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setArchiveTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={archiving} disabled={archiveDependencies.length > 0} icon={<Archive size={17} />} onClick={confirmArchive}>Archive</Button>
        </>}
      >
        {archiveDependencies.length ? (
          <div className="inline-callout warning">
            <strong>This record still has active dependents.</strong>
            <span>Archive these first: {archiveDependencies.join(", ")}.</span>
          </div>
        ) : (
          <div className="inline-callout">
            <strong>The record will move to Archive.</strong>
            <span>You can restore it later or permanently delete it from the Archive screen.</span>
          </div>
        )}
      </Modal>
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Permanently delete ${deleteTarget ? COLLECTION_LABELS[deleteTarget.kind].toLowerCase() : "record"}?`}
        description={deleteRecordTarget && deleteTarget ? recordTitle(deleteTarget.kind, deleteRecordTarget) : undefined}
        size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleting} disabled={deleteDependencies.length > 0} icon={<Trash2 size={17} />} onClick={confirmDelete}>Delete permanently</Button>
        </>}
      >
        {deleteDependencies.length ? (
          <div className="inline-callout warning">
            <strong>This record is still referenced.</strong>
            <span>Delete these dependents first: {deleteDependencies.join(", ")}.</span>
          </div>
        ) : (
          <div className="inline-callout warning">
            <strong>This action cannot be undone.</strong>
            <span>The record will be removed from Firebase permanently. Use Archive instead when you may need it later.</span>
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
