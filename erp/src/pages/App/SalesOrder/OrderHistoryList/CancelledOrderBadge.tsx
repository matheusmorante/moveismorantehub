type Props = { tilted?: boolean; large?: boolean };

const CancelledOrderBadge = ({ tilted = false, large = false }: Props) => <>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-slate-950/55" />
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <span className={`max-w-[82%] truncate whitespace-nowrap rounded-md border-white bg-red-600 font-black uppercase tracking-[0.2em] text-white dark:border-white dark:bg-red-700 ${large ? 'border-4 px-5 py-2 text-2xl sm:text-3xl' : 'border-2 px-4 py-1.5 text-xs'} ${tilted ? '-rotate-[15deg]' : ''}`}>
            Cancelado
        </span>
    </div>
</>;

export default CancelledOrderBadge;
