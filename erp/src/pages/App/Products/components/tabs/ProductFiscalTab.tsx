import React, { useState, useEffect, useRef, useMemo } from 'react';
import Product from '../../../../types/product.type';
import { getSettings } from '@/pages/utils/settingsService';
import { COMMON_NCMS, CEST_OPTIONS, CFOP_OPTIONS, CSOSN_OPTIONS, ORIGEM_OPTIONS, PIS_COFINS_OPTIONS } from './productFiscalOptions';
import { createInitialProductFiscalInfo } from './productFiscalDefaults';
import { ProductNcmSelector } from './fiscal/ProductNcmSelector';

interface ProductFiscalTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    handleGenerateNCM: () => void;
    isGeneratingNCM: boolean;
}

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
                        fiscal: createInitialProductFiscalInfo(prev.itemType, settings.fiscalDefaults),
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
                                className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold tracking-[0.2em] focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-200"
                                placeholder="Ex: 0101"
                            />
                        </div>
                    ) : (
                        <>
                            <ProductNcmSelector
                                formData={formData}
                                setFormData={setFormData}
                                handleGenerateNCM={handleGenerateNCM}
                                isGeneratingNCM={isGeneratingNCM}
                            />

                            {/* CEST - Exibido apenas se a operação for sujeita à Substituição Tributária (CSOSN 201, 202, 500) */}
                            {['201', '202', '500'].includes(formData.fiscal?.cst || '') && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Código CEST (Substituição Tributária)</label>
                                    <div className="flex flex-col gap-2">
                                        <select
                                            value={formData.fiscal?.cest || ''}
                                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cest: e.target.value } })}
                                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-200"
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
                                            className="w-full px-1 py-2 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-mono font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-300"
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
                                className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-200"
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
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-200"
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
                                className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-200"
                            >
                                <option value="5933">5933 - Prestação de serviço dentro do Estado</option>
                                <option value="6933">6933 - Prestação de serviço para fora do Estado</option>
                            </select>
                        ) : (
                            <select
                                value={formData.fiscal?.cfop || '5102'}
                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cfop: e.target.value } })}
                                className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-200"
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
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-200"
                        />
                    </div>

                    {/* PIS CST como Select */}
                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">PIS CST</label>
                        <select
                            value={formData.fiscal?.pisCst || '49'}
                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, pisCst: e.target.value } })}
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-200"
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
                            className="w-full px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-200"
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
