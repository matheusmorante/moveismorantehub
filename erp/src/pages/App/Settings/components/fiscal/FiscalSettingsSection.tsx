import React from 'react';
import { CompanyFiscalDataSection } from '../CompanyFiscalDataSection';
import { NcmSelect } from '../../../SalesOrder/OrderActions/nfe-modal/NcmSelect';
import { NcmManagementPanel } from './NcmManagementPanel';
import { CFOP_OPTIONS } from '../../../../utils/nfe/fiscalConstants';
import { normalizeCfop } from '../../../../utils/nfe/fiscalCfopResolution';

interface FiscalSettingsSectionProps {
    settings: any;
    onChange: (path: string, value: any) => void;
}

export default function FiscalSettingsSection({ settings, onChange }: FiscalSettingsSectionProps) {
    const [mappingSource, setMappingSource] = React.useState('');
    const [mappingTarget, setMappingTarget] = React.useState('');
    const [mappingError, setMappingError] = React.useState('');
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

    const cfops = CFOP_OPTIONS.filter((option) => option.value.startsWith('5'));

    const addInverseMapping = () => {
        const source = normalizeCfop(mappingSource);
        const target = normalizeCfop(mappingTarget);
        if (!source || !/^[56]\d{3}$/.test(source) || !target ||
            target[0] !== (source[0] === '5' ? '1' : '2')) {
            setMappingError('Informe um CFOP de saída e seu CFOP de entrada validado (5→1 ou 6→2).');
            return;
        }
        updateFiscal('inverseCfopMappings', { ...(fiscal.inverseCfopMappings || {}), [source]: target });
        setMappingError('');
        setMappingSource('');
        setMappingTarget('');
    };

    const removeInverseMapping = (source: string) => {
        const next = { ...(fiscal.inverseCfopMappings || {}) };
        delete next[source];
        updateFiscal('inverseCfopMappings', next);
    };

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

    // NCMs agora são pesquisados dinamicamente

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
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">CFOP padrão de devolução</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Pré-seleção para NF-e de devolução interna. Confira por item antes de transmitir.</p>
                    </div>
                    <div className="w-full md:w-96">
                        <input aria-label="CFOP padrão de devolução" list="return-cfop-options" inputMode="numeric"
                            value={fiscal.returnCfop ?? '1202'}
                            onChange={(event) => updateFiscal('returnCfop', event.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm outline-none focus:border-blue-500 dark:text-slate-200 w-full font-bold" />
                        <datalist id="return-cfop-options">
                            {CFOP_OPTIONS.filter((option) => option.value.startsWith('1')).map((option) =>
                                <option key={option.value} value={option.value} label={option.label} />)}
                        </datalist>
                        <p className="mt-1 text-xs text-slate-500">{CFOP_OPTIONS.find((option) => option.value === (fiscal.returnCfop ?? '1202'))?.label || 'CFOP informado manualmente: confirme a descrição e a aplicação fiscal.'}</p>
                    </div>
                </div>
            </div>

            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800/50">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Mapeamento de CFOPs inversos para estorno</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4 leading-relaxed">Associe explicitamente cada CFOP de saída ao CFOP de entrada fiscalmente conferido. Nenhum mapeamento é criado automaticamente.</p>
                <div className="flex flex-wrap gap-3 items-center">
                    <input aria-label="CFOP original de saída" list="sale-cfop-options" inputMode="numeric" placeholder="CFOP original (ex.: 5102)"
                        value={mappingSource} onChange={(event) => setMappingSource(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm dark:text-slate-200" />
                    <datalist id="sale-cfop-options">{cfops.map((option) => <option key={option.value} value={option.value} label={option.label} />)}</datalist>
                    <span aria-hidden="true" className="text-slate-500">→</span>
                    <input aria-label="CFOP inverso de entrada" list="return-cfop-options" inputMode="numeric" placeholder="CFOP inverso"
                        value={mappingTarget} onChange={(event) => setMappingTarget(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm dark:text-slate-200" />
                    <button type="button" onClick={addInverseMapping} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">Adicionar mapeamento</button>
                </div>
                {mappingError && <p role="alert" className="mt-2 text-sm text-red-600">{mappingError}</p>}
                <ul className="mt-4 space-y-2">
                    {Object.entries(fiscal.inverseCfopMappings || {}).map(([source, target]) => (
                        <li key={source} className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300">
                            <span>{source} → {String(target)} · {CFOP_OPTIONS.find((option) => option.value === target)?.label || 'Descrição não cadastrada; confira fiscalmente'}</span>
                            <button type="button" onClick={() => removeInverseMapping(source)} aria-label={`Remover mapeamento ${source}`} className="text-red-600 hover:underline">Remover</button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* NCM Padrão */}
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 max-w-lg">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">NCM Padrão</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Nomenclatura Comum do Mercosul sugerida para móveis.</p>
                    </div>
                    <div className="w-full md:w-96 flex flex-col gap-2">
                        <NcmSelect 
                            value={fiscal.ncm || '94036000'}
                            onChange={(ncmCode) => updateFiscal('ncm', ncmCode)}
                            placeholder="Busque por código ou nome do NCM..."
                        />
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
            <div className="p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50">
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

            {/* Painel de Gestão NCM */}
            <NcmManagementPanel />
        </div>
    );
}
