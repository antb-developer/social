import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRightIcon } from "../../components/admin/icons";
import { Badge } from "../../components/admin/ui/Badge";
import { AddressBlock } from "../../components/order/AddressBlock";
import { MarkPaidManuallyPanel } from "../../components/order/MarkPaidManuallyPanel";
import { OrderStepperHorizontal } from "../../components/order/OrderStepperHorizontal";
import { ProofReviewPanel } from "../../components/order/ProofReviewPanel";
import { SellerMessageBubble } from "../../components/order/SellerMessageBubble";
import { SellerQuickActions } from "../../components/order/SellerQuickActions";
import { SellerReplyComposer } from "../../components/order/SellerReplyComposer";
import { StatusActionButtons } from "../../components/order/StatusActionButtons";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useOrderRealtime } from "../../hooks/useOrderRealtime";
import { apiFetch } from "../../lib/apiClient";
import { getSignedProofUrl } from "../../lib/storage";
import { computeOrderSteps, findAddressResponseTimestamp } from "../../lib/orderSteps";
import { buildWhatsAppUrl } from "../../lib/whatsapp";
import type { OrderMessage, TemplateField } from "../../types/order";

type OrderItem = {
  id: string;
  name_snapshot: string;
  price_snapshot_paise: number;
  qty: number;
};

type Proof = {
  id: string;
  image_url: string;
  utr: string;
  amount_paise: number;
  review: "pending" | "approved" | "rejected";
  created_at: string;
};

type OrderDetail = {
  id: string;
  order_no: string;
  status: string;
  total_paise: number;
  created_at: string;
  address: Record<string, unknown> | null;
  items: OrderItem[];
  messages: OrderMessage[];
  status_history: { to_status: string; created_at: string }[];
  payment_proofs: Proof[];
  customer: { id: string; name: string | null; phone: string } | null;
};

type Seller = { upi_id: string | null; upi_name: string | null };

const STATUS_BADGE: Record<string, "info" | "warning" | "success" | "primary" | "error" | "light"> = {
  new: "info",
  pending_payment: "warning",
  paid: "success",
  shipped: "primary",
  delivered: "success",
  cancelled: "error",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Order placed",
  pending_payment: "Awaiting payment",
  paid: "Payment confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

const CHECK_ICON = (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 10 4 4 8-8" />
  </svg>
);

export function DashboardOrderDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const moreRef = useClickOutside<HTMLDivElement>(() => setMoreOpen(false), moreOpen);

  const orderQuery = useQuery({
    queryKey: ["seller-order", id],
    queryFn: () => apiFetch<OrderDetail>(`/api/seller/orders/${id}`),
  });

  const sellerQuery = useQuery({
    queryKey: ["seller-settings"],
    queryFn: () => apiFetch<Seller>("/api/seller/settings"),
  });

  function refetch() {
    queryClient.invalidateQueries({ queryKey: ["seller-order", id] });
  }

  useOrderRealtime(id, refetch);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [orderQuery.data?.messages.length]);

  if (orderQuery.isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading order...</div>;
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <div className="p-4 text-sm text-red-600">Order not found.</div>;
  }

  const order = orderQuery.data;
  const orderUrl = typeof window !== "undefined" ? `${window.location.origin}/o/${order.id}` : "";
  const customerName = order.customer?.name ?? order.customer?.phone ?? "Customer";
  const customerInitials = customerName.trim().slice(0, 2).toUpperCase();

  const pendingProof = order.payment_proofs.find((p) => p.review === "pending");
  const latestProof = order.payment_proofs[0] ?? null;

  const steps = computeOrderSteps({
    status: order.status,
    createdAt: order.created_at,
    addressAt: findAddressResponseTimestamp(order.messages),
    history: order.status_history,
    proofSubmittedAt: pendingProof?.created_at ?? null,
  });

  const addressSent = order.messages.some(
    (m) =>
      m.kind === "form_request" &&
      Array.isArray(m.payload.fields) &&
      (m.payload.fields as TemplateField[]).some((f) => f.key === "pincode")
  );
  const lastAddressRequest = [...order.messages].reverse().find((m) => m.kind === "form_request");
  const paymentSent = order.messages.some((m) => m.kind === "payment_request");
  const lastPaymentRequest = [...order.messages].reverse().find((m) => m.kind === "payment_request");
  const subtotal = order.items.reduce((sum, item) => sum + item.price_snapshot_paise * item.qty, 0);

  const paymentBadge: { label: string; color: "success" | "warning" | "error" | "light" } =
    order.status === "paid" || order.status === "shipped" || order.status === "delivered"
      ? { label: "Paid", color: "success" }
      : latestProof?.review === "pending"
        ? { label: "Verifying", color: "warning" }
        : latestProof?.review === "rejected"
          ? { label: "Proof rejected", color: "error" }
          : paymentSent
            ? { label: "Awaiting proof", color: "warning" }
            : { label: "Not requested", color: "light" };

  async function viewScreenshot(proofId: string) {
    const url = await getSignedProofUrl(proofId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function copyOrderLink() {
    navigator.clipboard.writeText(orderUrl);
    setCopied(true);
    setMoreOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-gray-500" aria-label="Breadcrumb">
            <Link to="/dashboard/orders" className="hover:text-gray-700">
              Orders
            </Link>
            <ChevronRightIcon />
            <span className="font-medium text-gray-700">{order.order_no}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{order.order_no}</h1>
            <Badge color={STATUS_BADGE[order.status] ?? "light"}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Placed {formatDateTime(order.created_at)} · {customerName} · via order link
          </p>
        </div>

        <div className="flex items-center gap-2">
          {order.customer?.phone && (
            <a
              href={buildWhatsAppUrl(order.customer.phone, `Hi! Here's your order ${order.order_no}: ${orderUrl}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Send order link
            </a>
          )}

          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
              aria-label="More actions"
            >
              &#8230;
            </button>
            {moreOpen && (
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg">
                <button
                  type="button"
                  onClick={copyOrderLink}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {copied ? "Copied!" : "Copy order link"}
                </button>
              </div>
            )}
          </div>

          <StatusActionButtons orderId={order.id} status={order.status} onChanged={refetch} />
        </div>
      </div>

      <div className="mt-5">
        <OrderStepperHorizontal steps={steps} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Items</p>
            <div className="divide-y divide-gray-100 border-y border-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">
                    IMG
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{item.name_snapshot}</p>
                    <p className="text-xs text-gray-500">
                      Qty {item.qty} · {formatRupees(item.price_snapshot_paise)} each
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-gray-900">
                    {formatRupees(item.price_snapshot_paise * item.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatRupees(subtotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatRupees(order.total_paise)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Customer & shipping</p>
              <Badge size="sm" color={order.address ? "success" : "warning"} startIcon={order.address ? CHECK_ICON : undefined}>
                {order.address ? "Filled" : "Waiting"}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                  {customerInitials}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{customerName}</p>
                  {order.customer?.phone && <p className="text-xs text-gray-500">{order.customer.phone}</p>}
                </div>
              </div>
              {order.customer?.phone && (
                <a
                  href={`tel:${order.customer.phone}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                  aria-label="Call customer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"
                    />
                  </svg>
                </a>
              )}
            </div>

            <div className="mt-3">
              {order.address ? (
                <AddressBlock address={order.address} className="rounded-lg bg-gray-50 px-3 py-2.5" />
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Address requested</p>
                    <p className="text-xs text-gray-500">
                      {addressSent && lastAddressRequest
                        ? `Sent ${formatTime(lastAddressRequest.created_at)} · not filled yet`
                        : "Not sent yet"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Payment</p>
              <Badge size="sm" color={paymentBadge.color} startIcon={paymentBadge.color === "success" ? CHECK_ICON : undefined}>
                {paymentBadge.label}
              </Badge>
            </div>

            <p className="text-2xl font-bold text-gray-900">{formatRupees(order.total_paise)}</p>
            {sellerQuery.data?.upi_id && <p className="text-xs text-gray-500">UPI · {sellerQuery.data.upi_id}</p>}

            <div className="mt-3 divide-y divide-gray-100 rounded-lg bg-gray-50 px-3 text-sm">
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Requested</span>
                <span className="text-gray-900">
                  {lastPaymentRequest ? formatTime(lastPaymentRequest.created_at) : "—"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">UTR / reference</span>
                <span className="text-gray-900">{latestProof?.utr ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Screenshot</span>
                {latestProof ? (
                  <button
                    type="button"
                    onClick={() => viewScreenshot(latestProof.id)}
                    className="font-medium text-brand-600 underline hover:text-brand-700"
                  >
                    View
                  </button>
                ) : (
                  <span className="text-gray-900">—</span>
                )}
              </div>
            </div>

            {pendingProof ? (
              <div className="mt-3">
                <ProofReviewPanel proof={pendingProof} onReviewed={refetch} />
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-500">When proof arrives you'll get Approve / Reject here and in chat.</p>
            )}

            {order.status === "pending_payment" && (
              <MarkPaidManuallyPanel orderId={order.id} onMarked={refetch} />
            )}
          </div>
        </div>

        <div className="flex h-[70vh] min-h-[480px] flex-col rounded-2xl border border-gray-200 bg-white lg:h-[calc(100vh-9.5rem)]">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Chat with {customerName}</h2>
              <p className="text-xs text-gray-500">Customer sees this on their order page</p>
            </div>
            {order.customer?.phone && (
              <a
                href={buildWhatsAppUrl(order.customer.phone, `Hi! Update on your order ${order.order_no}: ${orderUrl}`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Continue on WhatsApp
              </a>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 sm:px-5">
            {order.messages.map((message, i) => {
              const prev = order.messages[i - 1];
              const showDateDivider = !prev || !isSameDay(prev.created_at, message.created_at);
              const grouped = Boolean(prev) && !showDateDivider && prev.sender === message.sender;
              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="my-4 flex justify-center first:mt-0">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm ring-1 ring-gray-100">
                        {new Date(message.created_at).toDateString() === new Date().toDateString()
                          ? "Today"
                          : formatDateTime(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={grouped ? "mt-1.5" : "mt-4 first:mt-0"}>
                    <SellerMessageBubble message={message} />
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <SellerQuickActions
            orderId={order.id}
            totalPaise={order.total_paise}
            addressSent={addressSent}
            paymentSent={paymentSent}
            onSent={refetch}
          />
          <SellerReplyComposer orderId={order.id} customerName={customerName} onSent={refetch} />
        </div>
      </div>
    </div>
  );
}
