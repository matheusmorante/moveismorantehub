import React, { useState, useEffect, useRef, useMemo } from 'react';
import Product from '../../../../types/product.type';
import { getSettings } from '@/pages/utils/settingsService';

interface ProductFiscalTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    handleGenerateNCM: () => void;
    isGeneratingNCM: boolean;
}

const COMMON_NCMS = [
    { code: "94035000", description: "Móveis de madeira para dormitórios (Guarda-roupa, Cama, Cômoda, Cabeceira, Criado-Mudo)" },
    { code: "94036000", description: "Outros móveis de madeira (Rack, Painel, Aparador, Mesa de Centro, Estante, Buffet)" },
    { code: "94016100", description: "Assentos com armação de madeira, estofados (Sofá, Poltrona, Cadeira Estofada, Banqueta)" },
    { code: "94033000", description: "Móveis de madeira para escritórios (Escrivaninha, Mesa de Reunião, Gaveteiro)" },
    { code: "94034000", description: "Móveis de madeira para cozinhas (Armário, Balcão, Paneleiro, Kit Cozinha)" },
    { code: "94016900", description: "Assentos com armação de madeira, não estofados (Cadeira de Madeira)" },
    { code: "94042100", description: "Colchões de espuma (borracha ou plástico alveolar)" },
    { code: "94042900", description: "Colchões de molas ou outros materiais" },
    { code: "94032000", description: "Outros móveis de metal (Mesa com base de aço, Escrivaninha Industrial)" },
    { code: "94017100", description: "Assentos com armação de metal, estofados (Banqueta Estofada, Cadeira de Metal)" },
    { code: "94017900", description: "Assentos com armação de metal, não estofados" },
    { code: "94039090", description: "Partes de móveis (Peças sobressalentes, portas, tampos)" },
    { code: "94038900", description: "Móveis de outras matérias (Plástico, Vime, Junco, etc.)" },
    { code: "39249000", description: "Utensílios de plástico para decoração ou uso doméstico" },
    { code: "70139900", description: "Objetos de vidro para decoração (Vasos, Pratos Decorativos)" },
    { code: "94051090", description: "Aparelhos de iluminação (Lustres, Luminárias de teto/parede)" }
];

const CSOSN_OPTIONS = [
    { value: '102', label: '102 - Simples Nacional - Sem permissão de crédito (Venda padrão)' },
    { value: '500', label: '500 - Simples Nacional - ICMS Cobrado Anteriormente por ST (Substituído)' },
    { value: '101', label: '101 - Simples Nacional - Com permissão de crédito' },
    { value: '201', label: '201 - Simples Nacional - Com permissão de crédito e ST' },
    { value: '202', label: '202 - Simples Nacional - Sem permissão de crédito e ST' },
    { value: '300', label: '300 - Simples Nacional - Imune' },
    { value: '400', label: '400 - Simples Nacional - Não tributada' },
    { value: '900', label: '900 - Simples Nacional - Outros' }
];

const CFOP_OPTIONS = [
    { value: '5102', label: '5102 - Venda de mercadoria adquirida/recebida de terceiros' },
    { value: '5405', label: '5405 - Venda de mercadoria sujeita a ST (Substituído)' },
    { value: '5101', label: '5101 - Venda de produção do estabelecimento' },
    { value: '5403', label: '5403 - Venda de produção do estabelecimento sujeita a ST' }
];

const PIS_COFINS_OPTIONS = [
    { value: '49', label: '49 - Outras Operações de Saída' },
    { value: '07', label: '07 - Operação Isenta da Contribuição' },
    { value: '08', label: '08 - Operação Sem Incidência da Contribuição' },
    { value: '04', label: '04 - Operação Tributável Monofásica (Alíquota Zero)' },
    { value: '06', label: '06 - Operação Tributável com Alíquota Zero' },
    { value: '01', label: '01 - Operação Tributável com Alíquota Básica' },
    { value: '99', label: '99 - Outras Operações' }
];

const CEST_OPTIONS = [
    { value: '', label: 'Sem Substituição Tributária (Nenhum / Nulo)' },
    { value: '2806100', label: '28.061.00 - Colchões e box-springs (ST)' },
    { value: '2806200', label: '28.062.00 - Suportes para camas (Estrados)' }
];

const ORIGEM_OPTIONS = [
    { value: '0', label: '0 - Nacional' },
    { value: '1', label: '1 - Estrangeira - Importação Direta' },
    { value: '2', label: '2 - Estrangeira - Adquirida no Mercado Interno' },
    { value: '3', label: '3 - Nacional, conteúdo de importação > 40%' },
    { value: '4', label: '4 - Nacional, PPB' },
    { value: '5', label: '5 - Nacional, conteúdo de importação <= 40%' },
    { value: '6', label: '6 - Estrangeira - Importação Direta (CAMEX)' },
    { value: '7', label: '7 - Estrangeira - Adquirida no Mercado Interno (CAMEX)' },
    { value: '8', label: '8 - Nacional, conteúdo de importação > 70%' }
];

const ProductFiscalTab: React.FC<ProductFiscalTabProps> = ({
    formData,
    setFormData,
    handleGenerateNCM,
    isGeneratingNCM
}) => {
    const [searchQuery, setSearchQuery] = useState(formData.fiscal?.ncm || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => setSearchQuery(formData.fiscal?.ncm || ''), [formData.fiscal?.ncm]);

    // Carrega os dados padrões fiscais das configurações apenas se a estrutura fiscal ainda não foi inicializada
    useEffect(() => {
        if (!formData.fiscal || Object.keys(formData.fiscal).length === 0) {
            const settings = getSettings();
            if (settings.fiscalDefaults) {
                setFormData(prev => {
                    if (prev.fiscal && Object.keys(prev.fiscal).length > 0) return prev;
                    return {
                        ...prev,
                        fiscal: {
                            ncm: settings.fiscalDefaults?.ncm || '',
                            cest: settings.fiscalDefaults?.cest || '',
                            cst: settings.fiscalDefaults?.cst || '102',
                            cfop: (prev.itemType === 'service' ? '5933' : settings.fiscalDefaults?.cfop || '5102'),
                            origem: settings.fiscalDefaults?.origem || '0',
                            icmsPercent: settings.fiscalDefaults?.icmsPercent || 0,
                            pisCst: settings.fiscalDefaults?.pisCst || '49',
                            cofinsCst: settings.fiscalDefaults?.cofinsCst || '49',
                            codigoServico: ''
                        }
                    };
                });
            }
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredNcms = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return COMMON_NCMS;
        return COMMON_NCMS.filter(item => 
            item.code.includes(q) || 
            item.description.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <i className="bi bi-file-earmark-text text-blue-600"></i> Informações Fiscais para NF-e
                        </h4>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Dados essenciais para emissão de nota fiscal e conformidade tributária</p>
                    </div>
                </div>

                <div className={`grid grid-cols-1 ${['201', '202', '500'].includes(formData.fiscal?.cst || '') ? 'md:grid-cols-2' : ''} gap-8`}>
                    {formData.itemType === 'service' ? (
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Código Municipal / Serviço (LC 116/03) *</label>
                            <input
                                value={formData.fiscal?.codigoServico || ''}
                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, codigoServico: e.target.value.replace(/\D/g, '').slice(0, 8) } })}
                                className="w-full px-4 py-4 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold tracking-[0.2em] dark:text-slate-200"
                                placeholder="Ex: 0101"
                            />
                        </div>
                    ) : (
                        <>
                            {/* NCM input pesquisável */}
                            <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">NCM *</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={isGeneratingNCM}
                                            onClick={handleGenerateNCM}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100/80 hover:bg-purple-200/80 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/70 text-amber-600 dark:text-amber-400 font-black uppercase text-[9px] tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                                            title="Usar IA para auto-preencher o NCM"
                                        >
                                            {isGeneratingNCM ? <i className="bi bi-arrow-repeat animate-spin text-amber-500" /> : <i className="bi bi-stars text-amber-500 text-xs font-bold" />}
                                            Auto-preencher com IA
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setIsInfoModalOpen(true)}
                                            className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                            title="Como funciona a IA do NCM?"
                                        >
                                            <i className="bi bi-info-circle text-xs" />
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSearchQuery(val);
                                            setFormData(prev => ({
                                                ...prev,
                                                fiscal: {
                                                    ...prev.fiscal!,
                                                    ncm: val
                                                }
                                            }));
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        placeholder="Digite ou pesquise o NCM..."
                                        className="w-full pl-4 pr-10 py-4 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200 tracking-wider font-mono"
                                    />
                                    <i className={`bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform pointer-events-none ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                                        {filteredNcms.map(item => (
                                            <div
                                                key={item.code}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        fiscal: {
                                                            ...prev.fiscal!,
                                                            ncm: item.code,
                                                            ncmDescription: item.description
                                                        }
                                                    }));
                                                    setSearchQuery(item.code);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-left rounded-xl"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-wider font-mono">{item.code}</span>
                                                    {formData.fiscal?.ncm === item.code && (
                                                        <i className="bi bi-check text-xs text-emerald-500 font-bold" />
                                                    )}
                                                </div>
                                                <div className="text-[9px] text-slate-555 dark:text-slate-400 font-medium mt-0.5 leading-tight">{item.description}</div>
                                            </div>
                                        ))}
                                        {filteredNcms.length === 0 && (
                                            <div className="px-3 py-4 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                Nenhum NCM encontrado
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* CEST - Exibido apenas se a operação for sujeita à Substituição Tributária (CSOSN 201, 202, 500) */}
                            {['201', '202', '500'].includes(formData.fiscal?.cst || '') && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Código CEST (Substituição Tributária)</label>
                                    <div className="flex flex-col gap-2">
                                        <select
                                            value={formData.fiscal?.cest || ''}
                                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cest: e.target.value } })}
                                            className="w-full px-4 py-4 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                                        >
                                            {CEST_OPTIONS.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            maxLength={7}
                                            value={formData.fiscal?.cest || ''}
                                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cest: e.target.value.replace(/\D/g, '') } })}
                                            placeholder="Ou digite outro CEST (7 dígitos)..."
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl outline-none text-[10px] font-mono font-bold dark:text-slate-300"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Configurações de Imposto por Produto</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {formData.itemType !== 'service' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Origem da Mercadoria</label>
                            <select
                                value={formData.fiscal?.origem || '0'}
                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, origem: e.target.value } })}
                                className="w-full px-4 py-3.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            >
                                {ORIGEM_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* CST/CSOSN como Select */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {formData.itemType === 'service' ? 'CST / CSOSN ISSQN' : 'CST / CSOSN ICMS (Simples Nacional)'}
                        </label>
                        <select
                            value={formData.fiscal?.cst || '102'}
                            onChange={(e) => {
                                const val = e.target.value;
                                const isSt = ['201', '202', '500'].includes(val);
                                setFormData(prev => ({
                                    ...prev,
                                    fiscal: {
                                        ...prev.fiscal!,
                                        cst: val,
                                        cest: isSt ? (prev.fiscal?.cest || '') : ''
                                    }
                                }));
                            }}
                            className="w-full px-4 py-3.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                        >
                            {CSOSN_OPTIONS.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* CFOP como Select */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {formData.itemType === 'service' ? 'CFOP Padrão (Municipal)' : 'CFOP Padrão (Estadual)'}
                        </label>
                        {formData.itemType === 'service' ? (
                            <select
                                value={formData.fiscal?.cfop || '5933'}
                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cfop: e.target.value } })}
                                className="w-full px-4 py-3.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            >
                                <option value="5933">5933 - Prestação de serviço dentro do Estado</option>
                                <option value="6933">6933 - Prestação de serviço para fora do Estado</option>
                            </select>
                        ) : (
                            <select
                                value={formData.fiscal?.cfop || '5102'}
                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cfop: e.target.value } })}
                                className="w-full px-4 py-3.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            >
                                {CFOP_OPTIONS.map(cf => (
                                    <option key={cf.value} value={cf.value}>{cf.label}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {formData.itemType === 'service' ? 'Alíquota ISS (%)' : 'Alíquota ICMS (%)'}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.itemType === 'service' ? (formData.fiscal?.issPercent ?? 0) : (formData.fiscal?.icmsPercent ?? 0)}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setFormData(prev => ({ 
                                    ...prev, 
                                    fiscal: { 
                                        ...prev.fiscal!, 
                                        ...(prev.itemType === 'service' ? { issPercent: isNaN(val) ? 0 : val } : { icmsPercent: isNaN(val) ? 0 : val }) 
                                    } 
                                }));
                            }}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                        />
                    </div>

                    {/* PIS CST como Select */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">PIS CST</label>
                        <select
                            value={formData.fiscal?.pisCst || '49'}
                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, pisCst: e.target.value } })}
                            className="w-full px-4 py-3.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                        >
                            {PIS_COFINS_OPTIONS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* COFINS CST como Select */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">COFINS CST</label>
                        <select
                            value={formData.fiscal?.cofinsCst || '49'}
                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cofinsCst: e.target.value } })}
                            className="w-full px-4 py-3.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                        >
                            {PIS_COFINS_OPTIONS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Modal de Informação sobre NCM por IA */}
            {isInfoModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsInfoModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-xl">
                                    <i className="bi bi-stars text-base" />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                                    Classificação Fiscal por IA
                                </h3>
                            </div>
                            <button type="button" onClick={() => setIsInfoModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <i className="bi bi-x-lg text-sm" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            O NCM é classificado automaticamente por Inteligência Artificial (Gemini) à medida que você preenche o <strong className="text-slate-800 dark:text-slate-100">título</strong>, a <strong className="text-slate-800 dark:text-slate-100">descrição</strong> e a <strong className="text-slate-800 dark:text-slate-100">categoria</strong> do produto.
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            Você também pode clicar no botão <strong className="text-amber-600 dark:text-amber-400">"Auto-preencher com IA"</strong> a qualquer momento para recalcular e atualizar a classificação fiscal.
                        </p>
                        <div className="pt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsInfoModalOpen(false)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductFiscalTab;
