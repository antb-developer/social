import type { LabelHTMLAttributes, ReactNode } from "react";

type Props = LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode };

export function Label({ children, className = "", ...rest }: Props) {
  return (
    <label className={`mb-1.5 block text-sm font-medium text-gray-700 ${className}`} {...rest}>
      {children}
    </label>
  );
}
