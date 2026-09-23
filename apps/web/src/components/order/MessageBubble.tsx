import { useState } from "react";
import { Modal } from "../admin/ui/Modal";
import type { OrderMessage, TemplateField } from "../../types/order";
import { FormRequestCard } from "./FormRequestCard";
import { PaymentRequestCard } from "./PaymentRequestCard";

type Props = {
  message: OrderMessage;
  orderId: string;
  orderNo: string;
  upiId: string | null;
  upiName: string | null;
  onThreadUpdated: () => void;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function Timestamp({ iso, align }: { iso: string; align: "start" | "end" }) {
  return (
    <span className={`mt-1 px-1 text-[11px] text-gray-400 ${align === "end" ? "text-right" : "text-left"}`}>
      {formatTime(iso)}
    </span>
  );
}

export function MessageBubble({ message, orderId, orderNo, upiId, upiName, onThreadUpdated }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const isCustomer = message.sender === "customer";
  const align = isCustomer ? "items-end" : "items-start";
  const timeAlign = isCustomer ? "end" : "start";

  if (message.kind === "payment_request") {
    const amountPaise = Number(message.payload.amount_paise ?? 0);
    return (
      <div className={`flex flex-col ${align}`}>
        <PaymentRequestCard
          orderId={orderId}
          orderNo={orderNo}
          amountPaise={amountPaise}
          upiId={upiId}
          upiName={upiName}
          onProofSubmitted={onThreadUpdated}
        />
        <Timestamp iso={message.created_at} align={timeAlign} />
      </div>
    );
  }

  if (message.kind === "form_request") {
    const title = typeof message.payload.title === "string" ? message.payload.title : "Please fill this form";
    const fields = Array.isArray(message.payload.fields) ? (message.payload.fields as TemplateField[]) : [];
    const isAddressForm = fields.some((f) => f.key === "pincode");
    return (
      <div className={`flex flex-col ${align}`}>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className={`flex w-full max-w-[80%] items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 text-left shadow-sm transition-colors hover:bg-gray-50 sm:max-w-xs ${
            isCustomer ? "rounded-br-md" : "rounded-bl-md"
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6M9 8h1M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-900">{title} requested</span>
            <span className="block text-xs text-gray-500">Please fill &middot; tap to open</span>
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="shrink-0 text-gray-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>
        <Timestamp iso={message.created_at} align={timeAlign} />

        <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} className="max-w-sm p-6">
          <FormRequestCard
            orderId={orderId}
            title={title}
            fields={fields}
            isAddressForm={isAddressForm}
            onSubmitted={() => {
              setFormOpen(false);
              onThreadUpdated();
            }}
          />
        </Modal>
      </div>
    );
  }

  if (message.kind === "form_response") {
    const fields = (message.payload.fields ?? {}) as Record<string, string>;
    return (
      <div className={`flex flex-col ${align}`}>
        <div
          className={`max-w-[80%] rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-gray-100 sm:max-w-xs ${
            isCustomer ? "rounded-br-md" : "rounded-bl-md"
          }`}
        >
          {Object.entries(fields).map(([key, value]) => (
            <p key={key}>
              <span className="text-gray-500">{key}:</span> {value}
            </p>
          ))}
        </div>
        <Timestamp iso={message.created_at} align={timeAlign} />
      </div>
    );
  }

  if (message.kind === "payment_proof") {
    return (
      <div className={`flex flex-col ${align}`}>
        <div
          className={`max-w-[80%] rounded-2xl bg-white p-3 text-xs text-gray-600 shadow-sm ring-1 ring-gray-100 sm:max-w-xs ${
            isCustomer ? "rounded-br-md" : "rounded-bl-md"
          }`}
        >
          Payment proof submitted (UTR: {String(message.payload.utr ?? "")})
        </div>
        <Timestamp iso={message.created_at} align={timeAlign} />
      </div>
    );
  }

  if (message.kind === "status_change") {
    const body =
      typeof message.payload.body === "string"
        ? message.payload.body
        : `Status changed to ${String(message.payload.to ?? "")}`;
    return (
      <div className="my-1 flex justify-center">
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm ring-1 ring-gray-100">
          {body}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${align}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-xs ${
          isCustomer ? "rounded-br-md bg-gray-900 text-white" : "rounded-bl-md bg-white text-gray-900 ring-1 ring-gray-100"
        }`}
      >
        {String(message.payload.body ?? "")}
      </div>
      <Timestamp iso={message.created_at} align={timeAlign} />
    </div>
  );
}
