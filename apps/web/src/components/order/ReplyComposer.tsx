import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { apiFetch } from "../../lib/apiClient";
import { button, input } from "../../lib/ui";

type Props = {
  orderId: string;
  onSent: () => void;
};

export function ReplyComposer({ orderId, onSent }: Props) {
  const [text, setText] = useState("");

  const send = useMutation({
    mutationFn: () =>
      apiFetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        body: JSON.stringify({ kind: "text", body: text }),
      }),
    onSuccess: () => {
      setText("");
      onSent();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    send.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-200 bg-white p-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className={`flex-1 ${input}`}
      />
      <button type="submit" disabled={send.isPending} className={button.primary}>
        Send
      </button>
    </form>
  );
}
