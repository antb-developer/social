import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: ReactNode };

export function Checkbox({ label, className = "", id, ...rest }: Props) {
  return (
    <label htmlFor={id} className={`flex items-center gap-2.5 text-sm text-gray-700 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/30"
        {...rest}
      />
      {label}
    </label>
  );
}
