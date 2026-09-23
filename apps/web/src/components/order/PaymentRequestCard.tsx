import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useQrDataUrl } from "../../hooks/useQrDataUrl";
import { submitPaymentProof } from "../../lib/storage";
import { button, input } from "../../lib/ui";
import { buildUpiUri } from "../../lib/upi";

type Props = {
  orderId: string;
  orderNo: string;
  amountPaise: number;
  upiId: string | null;
  upiName: string | null;
  onProofSubmitted: () => void;
};

export function PaymentRequestCard({ orderId, orderNo, amountPaise, upiId, upiName, onProofSubmitted }: Props) {
  const upiUri = upiId
    ? buildUpiUri({ payeeVpa: upiId, payeeName: upiName ?? "Seller", amountPaise, note: orderNo })
    : null;
  const qrDataUrl = useQrDataUrl(upiUri ?? "");
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [utr, setUtr] = useState("");

  const submitProof = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Please select the payment screenshot");
      }
      await submitPaymentProof(orderId, file, utr);
    },
    onSuccess: () => {
      setShowUpload(false);
      onProofSubmitted();
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submitProof.mutate();
  }

  return (
    <div className="max-w-xs rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">Payment request</p>
      <p className="text-sm text-gray-600">₹{(amountPaise / 100).toFixed(2)}</p>

      {upiUri && (
        <>
          {qrDataUrl && <img src={qrDataUrl} alt="UPI QR code" className="my-3 h-40 w-40 rounded-lg" />}
          <a href={upiUri} className="block text-sm font-medium text-blue-600 underline">
            Pay with UPI app
          </a>
        </>
      )}

      {!showUpload ? (
        <button type="button" onClick={() => setShowUpload(true)} className={`mt-3 w-full ${button.secondary}`}>
          Upload payment proof
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs"
            required
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="12-digit UTR"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            className={input}
            required
          />
          {submitProof.isError && (
            <p className="text-xs text-red-600">
              {submitProof.error instanceof Error ? submitProof.error.message : "Upload failed"}
            </p>
          )}
          <button type="submit" disabled={submitProof.isPending} className={`w-full ${button.primary}`}>
            {submitProof.isPending ? "Submitting..." : "Submit proof"}
          </button>
        </form>
      )}
    </div>
  );
}
