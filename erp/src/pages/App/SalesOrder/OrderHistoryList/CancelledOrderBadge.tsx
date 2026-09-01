type Props = { tilted?: boolean; large?: boolean; highContrast?: boolean };

const CancelledOrderBadge = ({ tilted = false, large = false, highContrast = false }: Props) => <>
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-10 rounded-[inherit] ${highContrast ? 'bg-slate-950/75' : 'bg-slate-950/55'}`} />
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <span className={`max-w-[82%] truncate whitespace-nowrap rounded-md border-red-500 font-black uppercase tracking-[0.2em] text-red-500 dark:border-red-400 dark:text-red-300 ${highContrast ? 'drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]' : ''} ${large ? 'border-4 px-5 py-2 text-2xl sm:text-3xl' : 'border-2 px-4 py-1.5 text-xs'} ${tilted ? '-rotate-[15deg]' : ''}`}>
            Cancelado
        </span>
    </div>
</>;

export default CancelledOrderBadge;
