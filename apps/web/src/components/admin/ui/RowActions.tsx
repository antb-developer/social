import { EyeIcon, TrashIcon } from "../icons";

type Props = {
  onView?: () => void;
  onDelete: () => void;
};

export function RowActions({ onView, onDelete }: Props) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="View"
          title="View"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md p-1.5 text-error-500 hover:bg-error-50 hover:text-error-600"
        aria-label="Delete"
        title="Delete"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
