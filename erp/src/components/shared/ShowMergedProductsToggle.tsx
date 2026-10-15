type ShowMergedProductsToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  compact?: boolean;
};

export default function ShowMergedProductsToggle({
  checked,
  onChange,
  compact = false,
}: ShowMergedProductsToggleProps) {
  return (
    <label
      title="Mostrar mesclados"
      className={`inline-flex shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 shadow-sm transition-colors hover:border-blue-300 sm:px-3 sm:text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 ${compact ? 'min-h-8 py-1' : 'min-h-10 py-2'}`}
    >
      <input
        type="checkbox"
        aria-label="Mostrar mesclados"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="h-4 w-4 accent-blue-600"
      />
      <span className="flex items-center gap-1.5">
        <i className="bi bi-bezier2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        Mostrar mesclados
      </span>
    </label>
  );
}
