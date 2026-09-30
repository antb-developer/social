import { useCallback, useMemo, useState } from "react";

export function useRowSelection(ids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = ids.some((id) => selected.has(id));
  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return {
    selected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    isIndeterminate: someSelected && !allSelected,
    selectedIds,
    count: selectedIds.length,
  };
}
