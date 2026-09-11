import { useMemo, useState } from "react";
import SectionCard from "../../../components/SectionCard";
import { systemDocumentation, DocumentationSection } from "./systemDocumentation";
import { userDocumentation } from "./userDocumentation";
import DocumentationFlow from "./DocumentationFlow";
import EngineeringImpactMap from "./EngineeringImpactMap";
import { engineeringImpactMaps } from "./engineeringImpactMaps";
import ArchitectureDocsSection from "./ArchitectureDocsSection";

type DocTab = "manual" | "architecture" | "all";

const DocumentationList = ({ title, icon, color, items }: { title: string; icon: string; color: string; items: string[] }) => (
    <section>
        <h2 className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${color}`}><i className={`bi ${icon}`} /> {title}</h2>
        <ul className="space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400"><i className="bi bi-dot text-lg leading-3 text-slate-400" />{item}</li>)}</ul>
    </section>
);

const SystemDocs = () => {
    const [activeTab, setActiveTab] = useState<DocTab>("manual");
    const [searchTerm, setSearchTerm] = useState("");

    const activeDocumentation = useMemo<DocumentationSection[]>(() => {
        if (activeTab === "manual") return userDocumentation;
        if (activeTab === "architecture") return systemDocumentation;
        return [...userDocumentation, ...systemDocumentation];
    }, [activeTab]);

    const sections = useMemo(() => {
        const search = searchTerm.trim().toLocaleLowerCase("pt-BR");
        if (!search) return activeDocumentation;
        return activeDocumentation.filter((section) =>
            [section.title, section.summary, ...section.rules].join(" ").toLocaleLowerCase("pt-BR").includes(search)
        );
    }, [activeDocumentation, searchTerm]);

    return (
        <main className="mx-auto flex max-w-6xl flex-col gap-6 pb-20">
            <header className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Base Conhecimento & Regras Oficiais</p>
                    <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        Morante Hub ERP
                    </span>
                </div>
                <h1 className="mt-2 flex items-center gap-3 text-2xl font-black text-slate-800 dark:text-slate-100">
                    <i className="bi bi-book-half text-blue-600" /> Documentação do Sistema
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    Guia completo de regras de negócio, operação por cargo, movimentações de estoque, automações e arquitetura do ERP.
                </p>
            </header>

            {/* Abas Principais de Navegação */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab("manual")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                            activeTab === "manual"
                                ? "bg-blue-600 text-white shadow-md"
                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                    >
                        <i className="bi bi-person-workspace text-sm" />
                        Manual Operacional
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("architecture")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                            activeTab === "architecture"
                                ? "bg-indigo-600 text-white shadow-md"
                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                    >
                        <i className="bi bi-cpu-fill text-sm text-indigo-400" />
                        Modelagem & Arquitetura (Devs / IA)
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab("all")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                            activeTab === "all"
                                ? "bg-slate-800 text-white shadow-md dark:bg-slate-700"
                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                    >
                        <i className="bi bi-layers-half text-sm" />
                        Visão Geral Completa
                    </button>
                </div>

                <div className="relative min-w-[16rem]">
                    <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Pesquisar regras ou termos..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-blue-600 focus:bg-white dark:border-slate-800 dark:bg-slate-955/50 dark:text-slate-100"
                    />
                </div>
            </div>

            {/* Conteúdo da Aba Selecionada */}
            {activeTab === "architecture" ? (
                <ArchitectureDocsSection />
            ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {sections.map((section) => (
                        <SectionCard key={section.title} title={section.title} icon={`bi ${section.icon}`} iconBg="bg-slate-100 dark:bg-slate-800">
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{section.summary}</p>
                                <DocumentationList title="Regras e Funcionamento" icon="bi-diagram-3-fill" color="text-blue-600" items={section.rules} />
                                {engineeringImpactMaps[section.title] && <EngineeringImpactMap impacts={engineeringImpactMaps[section.title]} />}
                                <DocumentationFlow steps={section.flow} />
                            </div>
                        </SectionCard>
                    ))}
                </div>
            )}

            {activeTab !== "architecture" && sections.length === 0 && (
                <p className="py-16 text-center text-sm font-bold text-slate-400">Nenhum tópico de documentação encontrado.</p>
            )}
        </main>
    );
};

export default SystemDocs;
