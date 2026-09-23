import { useState } from "react";
import { subscribeToPush } from "../lib/pushSubscription";
import { button } from "../lib/ui";

export function EnableNotificationsButton() {
  const [status, setStatus] = useState<"idle" | "subscribing" | "done" | "failed">("idle");

  async function handleClick() {
    setStatus("subscribing");
    const ok = await subscribeToPush();
    setStatus(ok ? "done" : "failed");
  }

  if (status === "done") {
    return <p className="text-xs text-gray-500">Notifications enabled</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "subscribing"}
        className={`${button.secondary} px-3 py-1.5 text-xs`}
      >
        {status === "subscribing" ? "Enabling..." : "Enable notifications"}
      </button>
      {status === "failed" && (
        <p className="mt-1 text-xs text-red-600">Could not enable notifications on this device.</p>
      )}
    </div>
  );
}
