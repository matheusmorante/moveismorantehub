import type { EngineeringImpact } from "./engineeringImpactMaps";

const EngineeringImpactMap = ({ impacts }: { impacts?: EngineeringImpact[] }) => {
    if (!impacts?.length) return null;
    return <section className="border-t border-slate-100 pt-4 dark:border-slate-800">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600"><i className="bi bi-share-fill" /> Mapa de impactos entre módulos</h2>
        <div className="space-y-3">{impacts.map((impact) => <article key={impact.action} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20"><h3 className="text-xs font-black text-slate-800 dark:text-slate-100">{impact.action}</h3><div className="mt-2 flex flex-wrap gap-2">{impact.effects.map((effect) => <span key={effect} className="rounded-xl bg-white px-2.5 py-1.5 text-[10px] font-bold leading-relaxed text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"><i className="bi bi-arrow-right-short text-emerald-600" />{effect}</span>)}</div></article>)}</div>
    </section>;
};

export default EngineeringImpactMap;
