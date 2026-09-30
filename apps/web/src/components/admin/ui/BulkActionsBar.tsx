import { TrashIcon } from "../icons";
import { Button } from "./Button";

type Props = {
  count: number;
  itemLabel: string;
  onDelete: () => void;
};

export function BulkActionsBar({ count, itemLabel, onDelete }: Props) {
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-brand-25 px-4 py-3 sm:px-5">
      <p className="text-sm text-gray-700">
        <span className="font-medium">{count}</span> {itemLabel}
        {count === 1 ? "" : "s"} selected
      </p>
      <Button variant="danger" size="sm" startIcon={<TrashIcon className="h-4 w-4" />} onClick={onDelete}>
        Delete selected
      </Button>
    </div>
  );
}
