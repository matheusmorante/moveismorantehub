import React, { useState } from 'react';
import SectionCard from '../../../components/SectionCard';
import { systemDocumentation } from './systemDocumentation';
import DocumentationFlow from './DocumentationFlow';
import EngineeringImpactMap from './EngineeringImpactMap';
import { engineeringImpactMaps } from './engineeringImpactMaps';

type EffectMatrixRow = {
    action: string;
    stockEffect: string;
    financialEffect: string;
    operationEffect: string;
    reversibility: 'Reversível' | 'Irreversível' | 'Condicional';
    badgeColor: string;
};

const effectMatrix: EffectMatrixRow[] = [
    {
        action: 'Venda: Rascunho → Agendado',
        stockEffect: 'Gera baixa de estoque para itens reais (se configurado)',
        financialEffect: 'Registra previsão de receita (Contas a Receber)',
        operationEffect: 'Entra na agenda de entregas/montagens',
        reversibility: 'Reversível',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    },
    {
        action: 'Venda: Agendado → Atendido',
        stockEffect: 'Confirma baixa de estoque pendente (sem duplicar)',
        financialEffect: 'Efetiva o recebimento dos pagamentos',
        operationEffect: 'Remove o pedido da agenda ativa de entregas',
        reversibility: 'Reversível',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    },
    {
        action: 'Venda: Cancelamento',
        stockEffect: 'Estorna todas as saídas e recompõe o saldo físico',
        financialEffect: 'Cancela contas a receber e lança estorno',
        operationEffect: 'Remove da agenda e notifica App Mobile',
        reversibility: 'Irreversível',
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
    },
    {
        action: 'Devolução: Agendado → Atendido',
        stockEffect: 'Gera entrada no estoque usando CMV histórico da venda',
        financialEffect: 'Gera crédito ao cliente ou saldo a reembolsar',
        operationEffect: 'Remove da lista de devoluções pendentes',
        reversibility: 'Irreversível',
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
    },
    {
        action: 'Recebimento de Mercadoria',
        stockEffect: 'Gera entrada e recalcula CMPM: (saldo×custo_antigo + rec_qtd×rec_custo) ÷ novo_saldo',
        financialEffect: 'Lança Contas a Pagar ao fornecedor',
        operationEffect: 'Disponibiliza novo saldo imediato para vendas',
        reversibility: 'Condicional',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
    },
    {
        action: 'Inventário: Finalizar Contagem',
        stockEffect: 'Lança ajuste de divergência (positivo/negativo) sobre o saldo',
        financialEffect: 'Ajusta valor patrimonial do estoque em balanço',
        operationEffect: 'Grava responsável, data e histórico imutável',
        reversibility: 'Irreversível',
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
    }
];

const decisionTableData = [
    { status: 'Rascunho / Orçamento', edit: 'Sim', stock: 'Não', reverse: 'Não (Pode Excluir)', rule: 'Sem movimentação nem reserva' },
    { status: 'Agendado', edit: 'Sim (com confirmação)', stock: 'Reserva / Baixa na data', reverse: 'Sim (Estorna saídas)', rule: 'Entra na agenda e gera saídas reais' },
    { status: 'Atendido', edit: 'Não', stock: 'Saída Definitiva', reverse: 'Condicional (via Devolução)', rule: 'Venda concluída; gera devolução se retornar' },
    { status: 'Cancelado', edit: 'Não', stock: 'Saídas Estornadas', reverse: 'Não (Definitivo)', rule: 'Status final imutável; para refazer, usa Duplicar' }
];

const adrs = [
    {
        code: 'ADR-001',
        title: 'Fatos Históricos e Snapshots Imutáveis',
        summary: 'Transações concluídas (vendas atendidas, recebimentos e movimentos) não alteram registros passados. Correções são feitas via estornos e novos lançamentos.',
        impact: 'Garante auditabilidade total, rastreabilidade fiscal e impede corrupção de relatórios passados.'
    },
    {
        code: 'ADR-002',
        title: 'CMPM e CMV Ponderado Materializado',
        summary: 'O Custo Médio Ponderado Móvel (CMPM) é atualizado nas entradas e gravado no momento de cada saída para compor o CMV exato.',
        impact: 'Permite consultas ultrarrápidas de margem e lucro sem necessidade de reprocessar o histórico inteiro.'
    },
    {
        code: 'ADR-003',
        title: 'Identidade Única (UUID) por Variação Física',
        summary: 'O Produto Pai é conceitual. Variações físicas possuem UUID próprio e recebem o saldo e o estoque real.',
        impact: 'Evita ambiguidade de estoque entre variações de cor, tamanho ou acabamento.'
    },
    {
        code: 'ADR-004',
        title: 'Offline-First com Ciclo de 4 Estados no Mobile',
        summary: 'Operações em campo iniciam como PENDING no SQLite local e migram por SYNCING → CONFIRMED / REJECTED.',
        impact: 'Garante operação sem sinal de internet em entregas, montagens e vistorias de estoque.'
    },
    {
        code: 'ADR-005',
        title: 'Emissão Direta SEFAZ-PR sem Intermediários',
        summary: 'Comunicação direta SOAP com SEFAZ-PR usando certificado A1 em memória, sem apis pagas de terceiros.',
        impact: 'Custo zero de transmissão fiscal e velocidade máxima de emissão de NF-e/NFC-e.'
    }
];

export const ArchitectureDocsSection: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState<'diagrams' | 'matrix' | 'c4' | 'adrs'>('diagrams');

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header da Seção Técnica */}
            <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 p-6 shadow-sm dark:border-indigo-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm">
                            <i className="bi bi-cpu-fill" /> Arquitetura & Modelagem de Negócio
                        </span>
                        <h2 className="mt-2 text-xl font-black text-slate-800 dark:text-slate-100">
                            Modelagem do Sistema & Engenharia de Software
                        </h2>
                        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                            Especificação técnica para desenvolvedores, orquestradores e agentes de IA. Contém C4 Model, máquinas de estado, matrizes de efeito de ações, tabelas de decisão, fórmulas de custo (CMPM/CMV) e Decisões de Arquitetura (ADRs).
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-2xl border border-indigo-100 bg-white/80 p-1.5 backdrop-blur-sm dark:border-indigo-900/50 dark:bg-slate-900">
                        <button
                            type="button"
                            onClick={() => setSelectedTab('diagrams')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                                selectedTab === 'diagrams'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            <i className="bi bi-diagram-3-fill mr-1" /> Módulos & Estados
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTab('c4')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                                selectedTab === 'c4'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            <i className="bi bi-boxes mr-1" /> Arquitetura C4
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTab('matrix')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                                selectedTab === 'matrix'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            <i className="bi bi-table mr-1" /> Efeitos & Decisões
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTab('adrs')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all ${
                                selectedTab === 'adrs'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                        >
                            <i className="bi bi-journal-code mr-1" /> ADRs
                        </button>
                    </div>
                </div>
            </div>

            {/* Conteúdo da Aba Selecionada */}
            {selectedTab === 'diagrams' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {systemDocumentation.map((section) => (
                            <SectionCard key={section.title} title={section.title} icon={`bi ${section.icon}`} iconBg="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                                <div className="space-y-4">
                                    <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">{section.summary}</p>
                                    <div className="space-y-2">
                                        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                            <i className="bi bi-shield-check" /> Regras de Orquestração
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {section.rules.map((rule) => (
                                                <li key={rule} className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                                    <i className="bi bi-caret-right-fill text-indigo-500 shrink-0 text-[10px] mt-1" />
                                                    <span>{rule}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    {engineeringImpactMaps[section.title] && <EngineeringImpactMap impacts={engineeringImpactMaps[section.title]} />}
                                    <DocumentationFlow steps={section.flow} />
                                </div>
                            </SectionCard>
                        ))}
                    </div>
                </div>
            )}

            {selectedTab === 'c4' && (
                <div className="space-y-6">
                    {/* C4 Nível 1 & 2 */}
                    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-5">
                        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
                            <span className="rounded-full bg-indigo-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                C4 Model — Nível 1 (System Context) & Nível 2 (Containers)
                            </span>
                            <h3 className="mt-2 text-base font-black text-slate-800 dark:text-slate-100">
                                Ecossistema e Infraestrutura Morante Hub
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Visão geral dos atores, clientes, backend serverless Supabase e serviços externos integrados.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                    <i className="bi bi-laptop" /> Frontend Web (SPA)
                                </h4>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                    React 18 + TypeScript + Vite. Interface rica para gestão, vendas, compras, financeiro e expedição.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                    <i className="bi bi-phone" /> Mobile App (Offline-First)
                                </h4>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                    React Native + Expo + SQLite local. Executa rotas de entregas, montagens e vistorias sem sinal.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 dark:border-purple-900/40 dark:bg-purple-950/20 space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-2">
                                    <i className="bi bi-database" /> Backend Supabase (BaaS)
                                </h4>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                    PostgreSQL com RLS, Triggers PL/pgSQL, Storage de Mídias e WebSockets Realtime.
                                </p>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Integrações de Infraestrutura</h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                                <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-955/30">
                                    <i className="bi bi-shield-check text-emerald-600 text-lg" />
                                    <span>SEFAZ-PR (SOAP A1 Direto)</span>
                                </div>
                                <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-955/30">
                                    <i className="bi bi-robot text-purple-600 text-lg" />
                                    <span>Google Gemini IA (Native OCR)</span>
                                </div>
                                <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-955/30">
                                    <i className="bi bi-geo-alt text-red-600 text-lg" />
                                    <span>Google Maps Directions API</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedTab === 'matrix' && (
                <div className="space-y-6">
                    {/* Tabela de Decisão */}
                    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <i className="bi bi-[#grid] bi-grid-3x3-gap-fill text-indigo-600" />
                                    Decision Table — Regras Condicionais por Estado de Venda
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Tabela de decisão para combinações de estado, permissões de edição e movimentação de estoque.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800">
                                    <tr>
                                        <th className="p-3.5">Estado da Entidade</th>
                                        <th className="p-3.5 text-center">Pode Editar?</th>
                                        <th className="p-3.5">Comportamento de Estoque</th>
                                        <th className="p-3.5 text-center">Permite Reversão?</th>
                                        <th className="p-3.5">Regra Canônica</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                    {decisionTableData.map((row) => (
                                        <tr key={row.status} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="p-3.5 font-black text-slate-800 dark:text-slate-200">{row.status}</td>
                                            <td className="p-3.5 text-center font-bold">{row.edit}</td>
                                            <td className="p-3.5 text-slate-600 dark:text-slate-300">{row.stock}</td>
                                            <td className="p-3.5 text-center font-bold">{row.reverse}</td>
                                            <td className="p-3.5 text-slate-600 dark:text-slate-300">{row.rule}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Matriz Global de Efeitos */}
                    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <i className="bi bi-grid-3x3-gap-fill text-indigo-600" />
                                    Matriz Global de Efeitos Cruzados
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Mapeamento de ações do usuário x impacto em estoque x impacto financeiro x operação x reversibilidade.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-slate-800">
                                    <tr>
                                        <th className="p-3.5">Ação do Sistema</th>
                                        <th className="p-3.5">Impacto em Estoque</th>
                                        <th className="p-3.5">Impacto Financeiro</th>
                                        <th className="p-3.5">Impacto Operacional</th>
                                        <th className="p-3.5 text-center">Reversibilidade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                    {effectMatrix.map((row) => (
                                        <tr key={row.action} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="p-3.5 font-black text-slate-800 dark:text-slate-200">{row.action}</td>
                                            <td className="p-3.5 text-slate-600 dark:text-slate-300">{row.stockEffect}</td>
                                            <td className="p-3.5 text-slate-600 dark:text-slate-300">{row.financialEffect}</td>
                                            <td className="p-3.5 text-slate-600 dark:text-slate-300">{row.operationEffect}</td>
                                            <td className="p-3.5 text-center">
                                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${row.badgeColor}`}>
                                                    {row.reversibility}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {selectedTab === 'adrs' && (
                <div className="space-y-4">
                    <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                        <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                            <i className="bi bi-bookmark-star-fill text-indigo-600" /> Decisões Arquiteturais Registradas (ADRs)
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            Decisões permanentes de engenharia que moldam a estrutura e garantem a integridade dos dados no Morante Hub.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {adrs.map((adr) => (
                            <div key={adr.code} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-md dark:border-slate-800 dark:bg-slate-900 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                        {adr.code}
                                    </span>
                                    <i className="bi bi-shield-lock-fill text-slate-400" />
                                </div>
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{adr.title}</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{adr.summary}</p>
                                <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                                    <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        <i className="bi bi-check-circle-fill text-[10px]" /> {adr.impact}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArchitectureDocsSection;
