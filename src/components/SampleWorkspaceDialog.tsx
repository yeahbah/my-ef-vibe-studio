import { ConfirmDialog } from "./ConfirmDialog";

interface SampleWorkspaceDialogProps {
  open: boolean;
  busy?: boolean;
  detail?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function SampleWorkspaceDialog({
  open,
  busy = false,
  detail,
  onConfirm,
  onClose,
}: SampleWorkspaceDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      busy={busy}
      title="Create a sample workspace?"
      message="MyEFvibe Studio can download the AdventureWorks SQLite sample, wire up scripts and extra usings, and open starter queries, comparisons, benchmarks, SQL, LINQ, and a notebook."
      detail={detail}
      confirmLabel={busy ? "Creating sample workspace…" : "Create sample workspace"}
      cancelLabel="Start empty"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
