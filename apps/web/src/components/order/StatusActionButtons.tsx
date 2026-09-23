import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../../lib/apiClient";
import { button } from "../../lib/ui";

// What this button renders as the *direct* status-setting action, for each
// current status. This is deliberately narrower than
// apps/api/src/services/orderStatusService.ts's full transition table:
// pending_payment and paid each have their own dedicated, gated entry point
// instead (sending a payment request, and proof review / the manual paid
// confirmation) — see patchSellerOrderStatus, which refuses to set either
// directly. Kept in sync with the backend by hand since the frontend and API
// don't share a code package; the backend is the source of truth regardless
// of what renders here.
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new: ["cancelled"],
  pending_payment: ["cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const PRIMARY_ACTION_LABEL: Record<string, string> = {
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
};

type Props = {
  orderId: string;
  status: string;
  onChanged: () => void;
  className?: string;
};

export function StatusActionButtons({ orderId, status, onChanged, className = "" }: Props) {
  const patchStatus = useMutation({
    mutationFn: (next: string) =>
      apiFetch(`/api/seller/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      }),
    onSuccess: onChanged,
  });

  const nextStatuses = ALLOWED_TRANSITIONS[status] ?? [];
  const primaryNext = nextStatuses.find((s) => s !== "cancelled");
  const canCancel = nextStatuses.includes("cancelled");

  if (!primaryNext && !canCancel) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {primaryNext && (
        <button
          type="button"
          disabled={patchStatus.isPending}
          onClick={() => patchStatus.mutate(primaryNext)}
          className={`${button.primary} gap-1.5`}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4 10 4 4 8-8" />
          </svg>
          {PRIMARY_ACTION_LABEL[primaryNext] ?? primaryNext.replace("_", " ")}
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          disabled={patchStatus.isPending}
          onClick={() => {
            if (window.confirm("Cancel this order? This can't be undone.")) {
              patchStatus.mutate("cancelled");
            }
          }}
          className="text-sm font-medium text-error-600 hover:text-error-700 disabled:opacity-50"
        >
          Cancel order
        </button>
      )}
    </div>
  );
}
