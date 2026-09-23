import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Breadcrumb } from "../components/admin/Breadcrumb";
import { AddressBlock } from "../components/order/AddressBlock";
import { EnableNotificationsButton } from "../components/EnableNotificationsButton";
import { MessageBubble } from "../components/order/MessageBubble";
import { ReplyComposer } from "../components/order/ReplyComposer";
import { StatusTimeline } from "../components/order/StatusTimeline";
import { useOrderRealtime } from "../hooks/useOrderRealtime";
import { apiFetch } from "../lib/apiClient";
import { computeOrderSteps, findAddressResponseTimestamp } from "../lib/orderSteps";
import { buildWhatsAppUrl } from "../lib/whatsapp";
import type { OrderMessage, OrderStatusHistoryEntry } from "../types/order";

type OrderItem = {
  id: string;
  name_snapshot: string;
  price_snapshot_paise: number;
  qty: number;
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
  status_history: OrderStatusHistoryEntry[];
  seller: {
    id: string;
    name: string;
    whatsapp_number: string | null;
    upi_id: string | null;
    upi_name: string | null;
  } | null;
};

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

const STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  pending_payment: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Order placed",
  pending_payment: "Awaiting payment",
  paid: "Payment confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function OrderPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiFetch<OrderDetail>(`/api/orders/${orderId}`),
  });

  function refetchThread() {
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
  }

  useOrderRealtime(orderId, refetchThread);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [orderQuery.data?.messages.length]);

  if (orderQuery.isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading order...</div>;
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="p-4 text-sm text-red-600">
        We couldn't find this order. If you just placed it, make sure you're logged in with the same
        phone number.
      </div>
    );
  }

  const order = orderQuery.data;
  const orderUrl = typeof window !== "undefined" ? window.location.href : "";

  const proofMessages = order.messages.filter((m) => m.kind === "payment_proof");
  const proofSubmittedAt =
    order.status === "pending_payment" && proofMessages.length > 0
      ? proofMessages[proofMessages.length - 1].created_at
      : null;

  const steps = computeOrderSteps({
    status: order.status,
    createdAt: order.created_at,
    addressAt: findAddressResponseTimestamp(order.messages),
    history: order.status_history,
    proofSubmittedAt,
  });

  return (
    <div>
      <Breadcrumb
        title={`Order ${order.order_no}`}
        description={order.seller ? `From ${order.seller.name}` : undefined}
        homeTo="/account"
        homeLabel="Account"
        action={
          <div className="flex items-center gap-2">
            <EnableNotificationsButton />
            {order.seller?.whatsapp_number && (
              <a
                href={buildWhatsAppUrl(
                  order.seller.whatsapp_number,
                  `Hi! I just placed order ${order.order_no}. ${orderUrl}`
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                WhatsApp store
              </a>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Order summary</h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {STATUS_LABEL[order.status] ?? order.status.replace("_", " ")}
              </span>
            </div>

            <div className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">
                    IMG
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{item.name_snapshot}</p>
                    <p className="text-xs text-gray-500">Qty {item.qty}</p>
                  </div>
                  <span className="shrink-0 font-medium text-gray-900">
                    {formatRupees(item.price_snapshot_paise * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatRupees(order.total_paise)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Progress</p>
            <StatusTimeline steps={steps} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Delivering to</p>
            {order.address ? (
              <AddressBlock address={order.address} />
            ) : (
              <p className="text-sm text-gray-500">No address yet — the seller will ask for it in chat.</p>
            )}
          </div>
        </div>

        <div className="flex h-[70vh] min-h-[420px] flex-col rounded-2xl border border-gray-200 bg-white lg:h-[calc(100vh-16rem)]">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Chat with {order.seller?.name ?? "the store"}</h2>
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
                        {formatDayLabel(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={grouped ? "mt-1.5" : "mt-4 first:mt-0"}>
                    <MessageBubble
                      message={message}
                      orderId={order.id}
                      orderNo={order.order_no}
                      upiId={order.seller?.upi_id ?? null}
                      upiName={order.seller?.upi_name ?? null}
                      onThreadUpdated={refetchThread}
                    />
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <ReplyComposer orderId={order.id} onSent={refetchThread} />
        </div>
      </div>
    </div>
  );
}
