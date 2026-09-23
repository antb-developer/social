import type { OrderStep } from "../../lib/orderSteps";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DOT_CLASS: Record<OrderStep["state"], string> = {
  done: "border-gray-900 bg-gray-900",
  current: "border-brand-500 bg-white",
  upcoming: "border-gray-300 bg-white",
  cancelled: "border-error-600 bg-error-600",
};

const LABEL_CLASS: Record<OrderStep["state"], string> = {
  done: "text-gray-900",
  current: "text-gray-900",
  upcoming: "text-gray-400",
  cancelled: "text-error-600",
};

type Props = {
  steps: OrderStep[];
};

export function StatusTimeline({ steps }: Props) {
  return (
    <ol>
      {steps.map((step, i) => (
        <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
          {i !== steps.length - 1 && (
            <span className="absolute left-[5px] top-3.5 h-[calc(100%-0.875rem)] w-px bg-gray-200" />
          )}
          <span className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${DOT_CLASS[step.state]}`} />
          <div className="min-w-0">
            <p className={`text-sm font-medium ${LABEL_CLASS[step.state]}`}>{step.label}</p>
            {step.time && <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(step.time)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
