import { useMemo, useState } from "react";
import SectionCard from "../../../components/SectionCard";
import { systemDocumentation } from "./systemDocumentation";
import { userDocumentation } from "./userDocumentation";
import DocumentationFlow from "./DocumentationFlow";
import EngineeringImpactMap from "./EngineeringImpactMap";
import { engineeringImpactMaps } from "./engineeringImpactMaps";

const DocumentationList = ({ title, icon, color, items }: { title: string; icon: string; color: string; items: string[] }) => (
    <section>
        <h2 className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${color}`}><i className={`bi ${icon}`} /> {title}</h2>
        <ul className="space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400"><i className="bi bi-dot text-lg leading-3 text-slate-400" />{item}</li>)}</ul>
    </section>
);

const SystemDocs = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [audience, setAudience] = useState<"engineering" | "users">("users");
    const documentation = audience === "engineering" ? systemDocumentation : userDocumentation;
    const sections = useMemo(() => {
        const search = searchTerm.trim().toLocaleLowerCase("pt-BR");
        if (!search) return documentation;
        return documentation.filter((section) =>
            [section.title, section.summary, ...section.rules].join(" ").toLocaleLowerCase("pt-BR").includes(search)
        );
    }, [documentation, searchTerm]);

    return (
        <main className="mx-auto flex max-w-6xl flex-col gap-6 pb-20">
            <header className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6 dark:border-blue-900/40 dark:bg-blue-950/20">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Base operacional do ERP</p>
                <h1 className="mt-2 flex items-center gap-3 text-2xl font-black text-slate-800 dark:text-slate-100"><i className="bi bi-book-half text-blue-600" /> {audience === "engineering" ? "Documentação de Engenharia" : "Documentação para Usuários"}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{audience === "engineering" ? "Modelo técnico: regras, dados, efeitos e fluxos que orientam o desenvolvimento do ERP." : "Orientações práticas por cargo para executar os processos do ERP com segurança."}</p>
            </header>
            <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setAudience("users")} className={`rounded-2xl px-4 py-3 text-sm font-black transition ${audience === "users" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"}`}><i className="bi bi-people-fill mr-2" />Para usuários</button>
                <button type="button" onClick={() => setAudience("engineering")} className={`rounded-2xl px-4 py-3 text-sm font-black transition ${audience === "engineering" ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"}`}><i className="bi bi-code-slash mr-2" />Para engenharia</button>
            </div>
            <div className="relative max-w-xl">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={audience === "engineering" ? "Buscar domínio, regra ou fluxo..." : "Buscar cargo, processo ou orientação..."} className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900" />
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {sections.map((section) => (
                    <SectionCard key={section.title} title={section.title} icon={`bi ${section.icon}`} iconBg="bg-slate-100 dark:bg-slate-800">
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">{section.summary}</p>
                            <DocumentationList title={audience === "engineering" ? "Regras e comportamentos" : "Como trabalhar"} icon="bi-diagram-3-fill" color="text-blue-600" items={section.rules} />
                            {audience === "engineering" && <EngineeringImpactMap impacts={engineeringImpactMaps[section.title]} />}
                            <DocumentationFlow steps={section.flow} />
                        </div>
                    </SectionCard>
                ))}
            </div>
            {sections.length === 0 && <p className="py-16 text-center text-sm font-bold text-slate-400">Nenhum tópico encontrado.</p>}
        </main>
    );
};

export default SystemDocs;
