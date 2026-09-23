import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className = "", rows = 4, ...rest }: Props) {
  return (
    <textarea
      rows={rows}
      className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 ${className}`}
      {...rest}
    />
  );
}
