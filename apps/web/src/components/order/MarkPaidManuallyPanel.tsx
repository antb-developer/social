import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../../lib/apiClient";

type Props = {
  orderId: string;
  onMarked: () => void;
};

// The deliberate escape hatch for payments with no proof to review — cash,
// a bank transfer confirmed by phone, etc. Gated the same way ProofReviewPanel
// gates Approve: a checkbox that must be ticked before the button works, so
// "paid" is never one accidental click away.
export function MarkPaidManuallyPanel({ orderId, onMarked }: Props) {
  const [open, setOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [note, setNote] = useState("");

  const markPaid = useMutation({
    mutationFn: () =>
      apiFetch(`/api/seller/orders/${orderId}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ verified: true, note: note.trim() || undefined }),
      }),
    onSuccess: () => {
      onMarked();
      setOpen(false);
      setVerified(false);
      setNote("");
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-xs font-medium text-gray-500 underline hover:text-gray-700"
      >
        Mark as paid manually
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-900">Confirm payment received</p>
      <p className="mt-1 text-xs text-gray-500">
        Use this only when there's no payment proof to review — cash, a bank transfer confirmed by phone, etc.
      </p>

      <label className="mt-3 flex items-center gap-2 text-xs text-gray-700">
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        I verified payment details
      </label>

      <textarea
        rows={2}
        placeholder="Notes (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />

      {markPaid.isError && (
        <p className="mt-2 text-xs text-error-600">
          {markPaid.error instanceof Error ? markPaid.error.message : "Could not mark this order paid"}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!verified || markPaid.isPending}
          onClick={() => markPaid.mutate()}
          className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {markPaid.isPending ? "Marking..." : "Mark as paid"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setVerified(false);
            setNote("");
          }}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
