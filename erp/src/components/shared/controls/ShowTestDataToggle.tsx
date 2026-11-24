type ShowTestDataToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  compact?: boolean;
};

export default function ShowTestDataToggle({
  checked,
  onChange,
  compact = false,
}: ShowTestDataToggleProps) {
  return (
    <label
      title="Mostrar testes"
      className={`inline-flex shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap px-2 font-bold transition-colors sm:px-3 ${compact ? 'min-h-8 py-1 text-sm' : 'min-h-10 py-2 text-[10px]'} ${checked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:accent-blue-500"
      />
      <span>Mostrar testes</span>
    </label>
  );
}
