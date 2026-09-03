import React from 'react';
import { CompanyFiscalDataSection } from './CompanyFiscalDataSection';

interface FiscalSettingsSectionProps {
    settings: any;
    onChange: (path: string, value: any) => void;
}

export default function FiscalSettingsSection({ settings, onChange }: FiscalSettingsSectionProps) {
    const fiscal = settings.fiscalDefaults || {
        ncm: '94036000',
        cest: '',
        cfop: '5102',
        cst: '102',
        icmsPercent: 0,
        origem: '0',
        pisCst: '49',
        cofinsCst: '49'
    };

    const updateFiscal = (field: string, value: any) => {
        onChange('fiscalDefaults', {
            ...fiscal,
            [field]: value
        });
    };

    // Origens da Mercadoria (Padrão nacional)
    const origens = [
        { value: '0', label: '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8' },
        { value: '1', label: '1 - Estrangeira - Importação direta, exceto a indicada no código 6' },
        { value: '2', label: '2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7' },
        { value: '3', label: '3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40%' },
        { value: '4', label: '4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos' },
        { value: '5', label: '5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%' },
        { value: '6', label: '6 - Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX' },
        { value: '7', label: '7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX' },
        { value: '8', label: '8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%' }
    ];

    // CSOSN (Situação da Operação no Simples Nacional)
    const csosns = [
        { value: '101', label: '101 - Tributada pelo Simples Nacional com permissão de crédito' },
        { value: '102', label: '102 - Tributada pelo Simples Nacional sem permissão de crédito' },
        { value: '103', label: '103 - Isenção do ICMS no Simples Nacional para faixa de receita bruta' },
        { value: '201', label: '201 - Tributada pelo Simples Nacional com permissão de crédito e ST' },
        { value: '202', label: '202 - Tributada pelo Simples Nacional sem permissão de crédito e ST' },
        { value: '300', label: '300 - Imune' },
        { value: '400', label: '400 - Não tributada pelo Simples Nacional' },
        { value: '500', label: '500 - ICMS cobrado anteriormente por substituição tributária (Substituído)' },
        { value: '900', label: '900 - Outros' }
    ];

    // CFOPs comuns para Simples Nacional
    const cfops = [
        { value: '5102', label: '5102 - Venda de mercadoria adquirida/recebida de terceiros' },
        { value: '5405', label: '5405 - Venda de mercadoria sujeita ao regime de substituição tributária (Substituído)' },
        { value: '5101', label: '5101 - Venda de produção do estabelecimento' },
        { value: '5403', label: '5403 - Venda de produção do estabelecimento sujeita a ST' }
    ];

    // CST PIS/COFINS comuns
    const pisCofinsCsts = [
        { value: '49', label: '49 - Outras Operações de Saída' },
        { value: '07', label: '07 - Operação Isenta da Contribuição' },
        { value: '08', label: '08 - Operação Sem Incidência da Contribuição' },
        { value: '09', label: '09 - Operação com Suspensão da Contribuição' },
        { value: '01', label: '01 - Operação Tributável com Alíquota Básica' },
        { value: '02', label: '02 - Operação Tributável com Alíquota Diferenciada' },
        { value: '03', label: '03 - Operação Tributável com Alíquota por Unidade de Medida de Produto' },
        { value: '04', label: '04 - Operação Tributável Monofásica (Alíquota Zero)' },
        { value: '06', label: '06 - Operação Tributável com Alíquota Zero' },
        { value: '99', label: '99 - Outras Operações' }
    ];

    // NCMs mais comuns no setor de móveis do PR
    const ncmsComuns = [
        { value: '94036000', label: '9403.60.00 - Outros móveis de madeira (Aparadores, Mesas, Armários)' },
        { value: '94016100', label: '9401.61.00 - Assentos com armação de madeira, estofados (Cadeiras, Sofás)' },
        { value: '94035000', label: '9403.50.00 - Móveis de madeira do tipo utilizado em quartos (Camas, Guarda-roupas)' },
        { value: '94033000', label: '9403.30.00 - Móveis de madeira do tipo utilizado em escritórios (Mesas de escritório, Balcões)' },
        { value: '94034000', label: '9403.40.00 - Móveis de madeira do tipo utilizado em cozinhas (Armários de Cozinha)' },
        { value: '94042100', label: '9404.21.00 - Colchões de matérias celulares (Espuma, Látex)' },
        { value: '94042900', label: '9404.29.00 - Colchões de outras matérias (Molas)' },
        { value: '94038900', label: '9403.89.00 - Móveis de outras matérias (Rattan, Vime, Plástico)' }
    ];

    // CESTs comuns relacionados a móveis/colchões (ST no PR se aplicável)
    const cestsComuns = [
        { value: '', label: 'Sem Substituição Tributária (Nenhum / Nulo)' },
        { value: '2806100', label: '28.061.00 - Colchões e box-springs (Sujeitos a ST)' },
        { value: '2806200', label: '28.062.00 - Suportes para camas (Estrados)' }
    ];

    return (
        <div className="space-y-6">
            <CompanyFiscalDataSection settings={settings} onChange={onChange} />
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 mb-2">
                    <i className="bi bi-shield-fill-check"></i> Regime Tributário: Simples Nacional
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Configure os parâmetros fiscais padrões utilizados na emissão de NF-e e NFC-e no Paraná. Estes valores serão sugeridos automaticamente ao cadastrar novos produtos ou variações, agilizando a emissão fiscal.
                </p>
            </div>

            {/* Origem Padrão */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Origem da Mercadoria Padrão</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Indica a procedência do produto (nacional ou importado).</p>
                    </div>
                    <select
                        value={fiscal.origem || '0'}
                        onChange={(e) => updateFiscal('origem', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-96 transition-all font-bold"
                    >
                        {origens.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* CSOSN Padrão */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">CSOSN Padrão</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Código de Situação da Operação do ICMS no Simples Nacional.</p>
                    </div>
                    <select
                        value={fiscal.cst || '102'}
                        onChange={(e) => updateFiscal('cst', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-96 transition-all font-bold"
                    >
                        {csosns.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* CFOP Padrão */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">CFOP Padrão</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Código Fiscal de Operações e Prestações nas vendas internas.</p>
                    </div>
                    <select
                        value={fiscal.cfop || '5102'}
                        onChange={(e) => updateFiscal('cfop', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-96 transition-all font-bold"
                    >
                        {cfops.map(cf => (
                            <option key={cf.value} value={cf.value}>{cf.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* NCM Padrão */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">NCM Padrão</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Nomenclatura Comum do Mercosul sugerida para móveis.</p>
                    </div>
                    <div className="w-full md:w-96 flex flex-col gap-2">
                        <select
                            value={fiscal.ncm || '94036000'}
                            onChange={(e) => updateFiscal('ncm', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-bold"
                        >
                            {ncmsComuns.map(n => (
                                <option key={n.value} value={n.value}>{n.label}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={8}
                                placeholder="Ou digite outro NCM (8 dígitos)..."
                                value={fiscal.ncm || ''}
                                onChange={(e) => updateFiscal('ncm', e.target.value.replace(/\D/g, ''))}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-mono font-bold"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* CEST Padrão */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">CEST Padrão</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Código Especificador da Substituição Tributária.</p>
                    </div>
                    <div className="w-full md:w-96 flex flex-col gap-2">
                        <select
                            value={fiscal.cest || ''}
                            onChange={(e) => updateFiscal('cest', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-bold"
                        >
                            {cestsComuns.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={7}
                                placeholder="Ou digite outro CEST (7 dígitos)..."
                                value={fiscal.cest || ''}
                                onChange={(e) => updateFiscal('cest', e.target.value.replace(/\D/g, ''))}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-mono font-bold"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Alíquota ICMS */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Alíquota ICMS Padrão (%)</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Alíquota padrão para destacar ICMS próprio quando aplicável.</p>
                    </div>
                    <div className="w-full md:w-96 relative">
                        <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            value={fiscal.icmsPercent || 0}
                            onChange={(e) => updateFiscal('icmsPercent', parseFloat(e.target.value) || 0)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-5 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full transition-all font-bold"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">%</span>
                    </div>
                </div>
            </div>

            {/* PIS/COFINS CST */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">CST de PIS/COFINS Padrão</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Código de Situação Tributária padrão para PIS e COFINS.</p>
                    </div>
                    <select
                        value={fiscal.pisCst || '49'}
                        onChange={(e) => {
                            const val = e.target.value;
                            onChange('fiscalDefaults', {
                                ...fiscal,
                                pisCst: val,
                                cofinsCst: val
                            });
                        }}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:text-slate-200 w-full md:w-96 transition-all font-bold"
                    >
                        {pisCofinsCsts.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
