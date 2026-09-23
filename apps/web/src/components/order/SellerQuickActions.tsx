import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { apiFetch } from "../../lib/apiClient";
import type { TemplateField } from "../../types/order";

type Template = {
  id: string;
  kind: "text" | "payment_request" | "form_request";
  title: string;
  body: string | null;
  fields: TemplateField[];
};

type Props = {
  orderId: string;
  totalPaise: number;
  addressSent: boolean;
  paymentSent: boolean;
  onSent: () => void;
};

const chip =
  "whitespace-nowrap rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50";

export function SellerQuickActions({ orderId, totalPaise, addressSent, paymentSent, onSent }: Props) {
  const templatesQuery = useQuery({
    queryKey: ["seller-templates"],
    queryFn: () => apiFetch<Template[]>("/api/seller/templates"),
  });
  const [showMore, setShowMore] = useState(false);
  const moreRef = useClickOutside<HTMLDivElement>(() => setShowMore(false), showMore);

  const send = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/api/seller/orders/${orderId}/messages`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: onSent,
  });

  const templates = templatesQuery.data ?? [];
  const addressTemplate = templates.find(
    (t) => t.kind === "form_request" && t.fields.some((f) => f.key === "pincode")
  );
  const paymentTemplate = templates.find((t) => t.kind === "payment_request");
  const otherTemplates = templates.filter((t) => t.id !== addressTemplate?.id && t.id !== paymentTemplate?.id);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-white px-3 pb-1 pt-3">
      {addressTemplate && (
        <button
          type="button"
          disabled={send.isPending}
          onClick={() =>
            send.mutate({ kind: "form_request", title: addressTemplate.title, fields: addressTemplate.fields })
          }
          className={chip}
        >
          Address form{addressSent && " · sent"}
        </button>
      )}
      <button
        type="button"
        disabled={send.isPending}
        onClick={() =>
          send.mutate({
            kind: "payment_request",
            title: paymentTemplate?.title ?? "Payment request",
            amount_paise: totalPaise,
          })
        }
        className={chip}
      >
        Payment request{paymentSent && " · sent"}
      </button>

      {otherTemplates.length > 0 && (
        <div ref={moreRef} className="relative">
          <button type="button" onClick={() => setShowMore((v) => !v)} className={chip}>
            Templates
          </button>
          {showMore && (
            <div className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg">
              {otherTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  disabled={send.isPending}
                  onClick={() => {
                    const body =
                      template.kind === "text"
                        ? { kind: "text", body: template.body ?? template.title }
                        : template.kind === "payment_request"
                          ? { kind: "payment_request", title: template.title, amount_paise: totalPaise }
                          : { kind: "form_request", title: template.title, fields: template.fields };
                    send.mutate(body);
                    setShowMore(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {template.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
