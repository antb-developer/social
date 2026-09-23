import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline" | "danger";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
};

const SIZE_STYLES: Record<NonNullable<Props["size"]>, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
};

const VARIANT_STYLES: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
  outline: "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50",
  danger: "bg-error-500 text-white shadow-theme-xs hover:bg-error-600 disabled:bg-error-300",
};

export function Button({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  fullWidth = false,
  className = "",
  disabled = false,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]} ${
        fullWidth ? "w-full" : ""
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
      {...rest}
    >
      {startIcon}
      {children}
      {endIcon}
    </button>
  );
}
