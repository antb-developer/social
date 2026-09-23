import type { ReactNode } from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";

type Props = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: ReactNode;
  children: ReactNode;
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "text-theme-xs",
  md: "text-sm",
};

const VARIANT_STYLES: Record<BadgeVariant, Record<BadgeColor, string>> = {
  light: {
    primary: "bg-brand-50 text-brand-500",
    success: "bg-success-50 text-success-600",
    error: "bg-error-50 text-error-600",
    warning: "bg-warning-50 text-warning-600",
    info: "bg-blue-50 text-blue-600",
    light: "bg-gray-100 text-gray-700",
    dark: "bg-gray-500 text-white",
  },
  solid: {
    primary: "bg-brand-500 text-white",
    success: "bg-success-500 text-white",
    error: "bg-error-500 text-white",
    warning: "bg-warning-500 text-white",
    info: "bg-blue-500 text-white",
    light: "bg-gray-400 text-white",
    dark: "bg-gray-700 text-white",
  },
};

export function Badge({ variant = "light", color = "primary", size = "md", startIcon, children }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${SIZE_STYLES[size]} ${VARIANT_STYLES[variant][color]}`}
    >
      {startIcon}
      {children}
    </span>
  );
}
