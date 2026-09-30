import { useEffect, useRef } from "react";

type Props = {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
};

export function SelectionCheckbox({ checked, indeterminate = false, onChange, ariaLabel }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/30"
    />
  );
}
