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
    <button
      type="button"
      title="Mostrar testes"
      aria-label="Mostrar testes"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-xl px-2 font-bold transition-colors sm:px-3 ${compact ? 'min-h-8 py-1 text-sm' : 'min-h-10 border border-slate-200 bg-white py-2 text-[10px] shadow-sm hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800'} ${checked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}
    >
      {checked && <i className="bi bi-check2" aria-hidden="true" />}
      <span>Mostrar testes</span>
    </button>
  );
}
