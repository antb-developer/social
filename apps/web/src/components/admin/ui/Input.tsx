import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  hint?: string;
};

export function Input({ className = "", error = false, hint, disabled, ...rest }: Props) {
  const state = disabled
    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
    : error
      ? "border-error-500 focus:border-error-300 focus:ring-error-500/20"
      : "border-gray-300 bg-white text-gray-800 focus:border-brand-300 focus:ring-brand-500/20";

  return (
    <div>
      <input
        disabled={disabled}
        className={`h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 ${state} ${className}`}
        {...rest}
      />
      {hint && <p className={`mt-1.5 text-xs ${error ? "text-error-500" : "text-gray-500"}`}>{hint}</p>}
    </div>
  );
}
