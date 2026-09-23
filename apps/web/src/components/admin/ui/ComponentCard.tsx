import type { ReactNode } from "react";

type Props = {
  title?: string;
  desc?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function ComponentCard({ title, desc, headerAction, children, className = "", bodyClassName = "" }: Props) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            {title && <h3 className="text-base font-medium text-gray-800">{title}</h3>}
            {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className={bodyClassName || "p-5 sm:p-6"}>{children}</div>
    </div>
  );
}
