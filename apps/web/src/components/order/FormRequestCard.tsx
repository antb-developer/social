import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { apiFetch } from "../../lib/apiClient";
import { button, input } from "../../lib/ui";
import type { TemplateField } from "../../types/order";

type Props = {
  orderId: string;
  title: string;
  fields: TemplateField[];
  isAddressForm: boolean;
  onSubmitted: () => void;
};

export function FormRequestCard({ orderId, title, fields, isAddressForm, onSubmitted }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});

  const submit = useMutation({
    mutationFn: () =>
      apiFetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ kind: "form_response", fields: values, is_address_form: isAddressForm }),
      }),
    onSuccess: onSubmitted,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit.mutate();
  }

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-xs rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-gray-600">{field.label}</label>
            {field.type === "textarea" ? (
              <textarea
                required={field.required}
                value={values[field.key] ?? ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                className={input}
              />
            ) : field.type === "select" ? (
              <select
                required={field.required}
                value={values[field.key] ?? ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                className={input}
              >
                <option value="" disabled>
                  Select...
                </option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === "phone" ? "tel" : "text"}
                inputMode={field.type === "pincode" || field.type === "phone" ? "numeric" : undefined}
                required={field.required}
                value={values[field.key] ?? ""}
                onChange={(e) => setValue(field.key, e.target.value)}
                className={input}
              />
            )}
          </div>
        ))}
        {submit.isError && <p className="text-xs text-red-600">Could not submit. Please try again.</p>}
        <button type="submit" disabled={submit.isPending} className={`w-full ${button.primary}`}>
          {submit.isPending ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
