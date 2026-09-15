type Props = { tilted?: boolean; large?: boolean; withOverlay?: boolean; text?: string };

const CancelledOrderBadge = ({ tilted = false, large = false, withOverlay = true, text = "Cancelado" }: Props) => <>
    {withOverlay && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-slate-950/35" />
    )}
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <span className={`inline-flex max-w-[88%] items-center gap-2 truncate whitespace-nowrap rounded-lg border-white bg-red-600 font-black uppercase tracking-[0.2em] text-white opacity-100 shadow-2xl drop-shadow-md dark:border-white dark:bg-red-600 ${large ? 'border-4 px-5 py-2.5 text-xl sm:text-2xl' : 'border-2 px-3 py-1.5 text-xs'} ${tilted ? '-rotate-[12deg]' : ''}`}>
            <span className="truncate">{text}</span>
        </span>
    </div>
</>;

export default CancelledOrderBadge;
