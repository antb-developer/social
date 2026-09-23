// Shared visual language (ngrok-dashboard inspired): xl-radius cards, lg-radius
// controls, full-radius pills, generous padding, subtle gray borders.

export const card = "rounded-xl border border-gray-200 bg-white p-5 sm:p-6";

export const input =
  "w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/5";

export const button = {
  primary:
    "inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50",
  brand:
    "inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900",
} as const;

export function pill(active: boolean): string {
  return `whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
    active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"
  }`;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  pending_payment: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light";

const STATUS_BADGE_COLORS: Record<string, BadgeColor> = {
  new: "info",
  pending_payment: "warning",
  paid: "success",
  shipped: "primary",
  delivered: "success",
  cancelled: "error",
};

/** Color for the admin `<Badge>` for an order status. */
export function orderStatusColor(status: string): BadgeColor {
  return STATUS_BADGE_COLORS[status] ?? "light";
}

export function statusBadge(status: string): string {
  const color = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
  return `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${color}`;
}

export const pageHeader = "text-2xl font-semibold tracking-tight text-gray-900";
export const pageSubheader = "mt-1 text-sm text-gray-500";
export const sectionLabel = "text-sm font-medium text-gray-900";
