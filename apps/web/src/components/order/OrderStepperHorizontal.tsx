import type { OrderStep } from "../../lib/orderSteps";

const DOT_CLASS: Record<OrderStep["state"], string> = {
  done: "border-gray-900 bg-gray-900 text-white",
  current: "border-brand-500 bg-white text-brand-500",
  upcoming: "border-gray-300 bg-white text-gray-300",
  cancelled: "border-error-600 bg-error-600 text-white",
};

const LABEL_CLASS: Record<OrderStep["state"], string> = {
  done: "text-gray-900",
  current: "text-gray-900",
  upcoming: "text-gray-400",
  cancelled: "text-error-600",
};

const LINE_CLASS: Record<OrderStep["state"], string> = {
  done: "bg-gray-900",
  current: "bg-gray-200",
  upcoming: "bg-gray-200",
  cancelled: "bg-error-600",
};

type Props = {
  steps: OrderStep[];
};

export function OrderStepperHorizontal({ steps }: Props) {
  return (
    <div className="flex items-center overflow-x-auto rounded-2xl border border-gray-200 bg-white px-5 py-4">
      {steps.map((step, i) => (
        <div key={step.key} className={`flex items-center ${i !== steps.length - 1 ? "flex-1" : ""}`}>
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${DOT_CLASS[step.state]}`}
            >
              {step.state === "done" && (
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4 10 4 4 8-8" />
                </svg>
              )}
              {(step.state === "current" || step.state === "cancelled") && (
                <span className="h-2 w-2 rounded-full bg-current" />
              )}
            </span>
            <span className={`text-sm font-medium ${LABEL_CLASS[step.state]}`}>{step.label}</span>
          </div>
          {i !== steps.length - 1 && <span className={`mx-3 h-0.5 flex-1 rounded-full ${LINE_CLASS[step.state]}`} />}
        </div>
      ))}
    </div>
  );
}
