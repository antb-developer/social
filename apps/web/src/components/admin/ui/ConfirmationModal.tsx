import { useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  /** Destructive actions (red confirm button) may also require typing this exact phrase before confirming. */
  variant?: "normal" | "destructive";
  requireTypedConfirmation?: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
};

export function ConfirmationModal({ isOpen, onClose, ...rest }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6">
      {/* Mounted fresh each time the modal opens (Modal unmounts its children while
          closed), so the typed-confirmation field naturally starts blank every time
          instead of needing an effect to reset it. */}
      {isOpen && <ConfirmationModalBody onClose={onClose} {...rest} />}
    </Modal>
  );
}

function ConfirmationModalBody({
  onClose,
  onConfirm,
  title,
  description,
  variant = "normal",
  requireTypedConfirmation,
  confirmLabel,
  loading = false,
  error,
}: Omit<Props, "isOpen">) {
  const [typed, setTyped] = useState("");

  const typedMismatch = Boolean(requireTypedConfirmation) && typed !== requireTypedConfirmation;
  const disabled = loading || typedMismatch;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-800">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>

      {requireTypedConfirmation && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Type <span className="font-mono font-semibold">{requireTypedConfirmation}</span> to confirm
          </label>
          <Input
            type="text"
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={requireTypedConfirmation}
          />
        </div>
      )}

      {error && <p className="text-sm text-error-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={variant === "destructive" ? "danger" : "primary"} onClick={onConfirm} disabled={disabled}>
          {loading ? "Working..." : (confirmLabel ?? "Confirm")}
        </Button>
      </div>
    </div>
  );
}
