import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/apiClient";
import { getSignedProofUrl } from "../../lib/storage";
import { button } from "../../lib/ui";

type Proof = {
  id: string;
  image_url: string;
  utr: string;
  amount_paise: number;
  review: "pending" | "approved" | "rejected";
};

type Props = {
  proof: Proof;
  onReviewed: () => void;
};

export function ProofReviewPanel({ proof, onReviewed }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSignedProofUrl(proof.id)
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setSignedUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [proof.id]);

  const review = useMutation({
    mutationFn: (decision: "approved" | "rejected") =>
      apiFetch(`/api/seller/proofs/${proof.id}/review`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      }),
    onSuccess: onReviewed,
  });

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-medium text-gray-900">Payment proof pending review</p>
      {signedUrl && <img src={signedUrl} alt="Payment proof" className="my-3 max-h-60 rounded-lg" />}
      <p className="text-xs text-gray-600">UTR: {proof.utr}</p>
      <p className="text-xs text-gray-600">Amount: ₹{(proof.amount_paise / 100).toFixed(2)}</p>

      <label className="mt-3 flex items-center gap-2 text-xs text-gray-700">
        <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        I verified this in my bank app
      </label>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!verified || review.isPending}
          onClick={() => review.mutate("approved")}
          className={`flex-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50`}
        >
          Approve
        </button>
        <button
          type="button"
          disabled={!verified || review.isPending}
          onClick={() => review.mutate("rejected")}
          className={`flex-1 ${button.danger} px-3 py-2 text-xs`}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
