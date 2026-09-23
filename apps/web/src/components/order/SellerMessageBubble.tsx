import type { OrderMessage } from "../../types/order";

type Props = {
  message: OrderMessage;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function Timestamp({ message }: { message: OrderMessage }) {
  const label = message.sender === "seller" ? `You · ${formatTime(message.created_at)} · Seen` : formatTime(message.created_at);
  const align = message.sender === "seller" ? "text-right" : "text-left";
  return <span className={`mt-1 px-1 text-[11px] text-gray-400 ${align}`}>{label}</span>;
}

export function SellerMessageBubble({ message }: Props) {
  const isSeller = message.sender === "seller";
  const align = isSeller ? "items-end" : "items-start";

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

  if (message.kind === "payment_request") {
    const amountPaise = Number(message.payload.amount_paise ?? 0);
    return (
      <div className={`flex flex-col ${align}`}>
        <div
          className={`max-w-[80%] rounded-2xl border border-gray-100 bg-white p-3 text-xs shadow-sm sm:max-w-xs ${
            isSeller ? "rounded-br-md" : "rounded-bl-md"
          }`}
        >
          <p className="font-medium text-gray-900">Payment request</p>
          <p className="text-gray-600">₹{(amountPaise / 100).toFixed(2)}</p>
        </div>
        <Timestamp message={message} />
      </div>
    );
  }

  if (message.kind === "form_request") {
    return (
      <div className={`flex flex-col ${align}`}>
        <div
          className={`max-w-[80%] rounded-2xl border border-gray-100 bg-white p-3 text-xs shadow-sm sm:max-w-xs ${
            isSeller ? "rounded-br-md" : "rounded-bl-md"
          }`}
        >
          <p className="font-medium text-gray-900">{String(message.payload.title ?? "Form request")}</p>
        </div>
        <Timestamp message={message} />
      </div>
    );
  }

  if (message.kind === "form_response") {
    const fields = (message.payload.fields ?? {}) as Record<string, string>;
    return (
      <div className={`flex flex-col ${align}`}>
        <div
          className={`max-w-[80%] rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-gray-100 sm:max-w-xs ${
            isSeller ? "rounded-br-md" : "rounded-bl-md"
          }`}
        >
          {Object.entries(fields).map(([key, value]) => (
            <p key={key}>
              <span className="text-gray-500">{key}:</span> {value}
            </p>
          ))}
        </div>
        <Timestamp message={message} />
      </div>
    );
  }

  if (message.kind === "payment_proof") {
    return (
      <div className={`flex flex-col ${align}`}>
        <div
          className={`max-w-[80%] rounded-2xl bg-gray-900 p-3 text-xs text-white shadow-sm sm:max-w-xs ${
            isSeller ? "rounded-br-md" : "rounded-bl-md"
          }`}
        >
          <p className="font-medium">Payment proof</p>
          <p className="text-gray-300">UTR {String(message.payload.utr ?? "")}</p>
        </div>
        <Timestamp message={message} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${align}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-xs ${
          isSeller ? "rounded-br-md bg-gray-900 text-white" : "rounded-bl-md bg-white text-gray-900 ring-1 ring-gray-100"
        }`}
      >
        {String(message.payload.body ?? "")}
      </div>
      <Timestamp message={message} />
    </div>
  );
}
