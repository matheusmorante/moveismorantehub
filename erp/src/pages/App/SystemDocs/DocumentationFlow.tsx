export type FlowStep = { title: string; detail: string };

const DocumentationFlow = ({ steps }: { steps: FlowStep[] }) => (
    <section className="border-t border-slate-100 pt-4 dark:border-slate-800">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
            <i className="bi bi-bezier2" /> Fluxograma do domínio
        </h2>
        <ol className="flex flex-col gap-2 xl:flex-row xl:items-stretch xl:gap-0">
            {steps.map((step, index) => (
                <li key={`${step.title}-${index}`} className="flex min-w-0 flex-1 items-stretch xl:items-center">
                    <article className="min-w-0 flex-1 rounded-2xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
                        <span className="text-[9px] font-black tracking-widest text-violet-500">{String(index + 1).padStart(2, "0")}</span>
                        <h3 className="mt-1 text-xs font-black text-slate-800 dark:text-slate-100">{step.title}</h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{step.detail}</p>
                    </article>
                    {index < steps.length - 1 && <><i className="bi bi-arrow-down mx-2 flex shrink-0 items-center text-violet-400 xl:hidden" /><i className="bi bi-arrow-right mx-2 hidden shrink-0 text-violet-400 xl:block" /></>}
                </li>
            ))}
        </ol>
    </section>
);

export default DocumentationFlow;
