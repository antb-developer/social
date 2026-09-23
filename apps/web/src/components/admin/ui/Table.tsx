import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

type TableProps = { children: ReactNode; className?: string };
type TableSectionProps = { children: ReactNode; className?: string };
type TableRowProps = HTMLAttributes<HTMLTableRowElement> & { children: ReactNode };
type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> &
  ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode; isHeader?: boolean };

export function Table({ children, className = "" }: TableProps) {
  return <table className={`min-w-full ${className}`}>{children}</table>;
}

export function TableHeader({ children, className = "" }: TableSectionProps) {
  return <thead className={className}>{children}</thead>;
}

export function TableBody({ children, className = "" }: TableSectionProps) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({ children, className = "", ...rest }: TableRowProps) {
  return (
    <tr className={className} {...rest}>
      {children}
    </tr>
  );
}

export function TableCell({ children, isHeader = false, className = "", ...rest }: TableCellProps) {
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag className={className} {...rest}>
      {children}
    </CellTag>
  );
}
