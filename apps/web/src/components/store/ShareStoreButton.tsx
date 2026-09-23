import { useState } from "react";
import { button } from "../../lib/ui";

type Status = "idle" | "copied" | "failed";

export function ShareStoreButton({ name }: { name: string }) {
  const [status, setStatus] = useState<Status>("idle");

  function flash(next: Status) {
    setStatus(next);
    setTimeout(() => setStatus("idle"), 2000);
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
      } catch {
        // The share sheet was dismissed; nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("copied");
    } catch {
      flash("failed");
    }
  }

  return (
    <button type="button" onClick={handleShare} className={button.secondary} aria-live="polite">
      {status === "copied" ? "Link copied" : status === "failed" ? "Couldn't copy" : "Share"}
    </button>
  );
}
