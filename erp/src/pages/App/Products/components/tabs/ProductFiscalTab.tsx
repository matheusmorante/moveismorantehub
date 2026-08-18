import React, { useState, useEffect, useRef, useMemo } from 'react';
import Product from '../../../../types/product.type';

interface ProductFiscalTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    handleGenerateNCM: () => void;
    isGeneratingNCM: boolean;
}

const COMMON_NCMS = [
    { code: "94035000", description: "Móveis de madeira para dormitórios (Guarda-roupa, Cama, Cômoda, Cabeceira)" },
    { code: "94036000", description: "Outros móveis de madeira (Rack, Painel, Aparador, Mesa de Centro, Estante)" },
    { code: "94016100", description: "Assentos com armação de madeira, estofados (Sofá, Poltrona, Cadeira Estofada)" },
    { code: "94034000", description: "Móveis de madeira para cozinhas (Armário, Balcão, Paneleiro)" },
    { code: "94033000", description: "Móveis de madeira para escritórios (Escrivaninha, Mesa de Reunião)" },
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

const ProductFiscalTab: React.FC<ProductFiscalTabProps> = ({
    formData,
    setFormData
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    const selectedNcmObj = useMemo(() => {
        const currentNcm = formData.fiscal?.ncm || '';
        return COMMON_NCMS.find(item => item.code === currentNcm);
    }, [formData.fiscal?.ncm]);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-6">
                <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-file-earmark-text text-blue-600"></i> Informações Fiscais para NF-e
                    </h4>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Dados essenciais para emissão de nota fiscal</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">NCM *</label>
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
                                                <div className="text-[9px] text-slate-550 dark:text-slate-400 font-medium mt-0.5 leading-tight">{item.description}</div>
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

                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Código CEST (Opcional)</label>
                                <input
                                    value={formData.fiscal?.cest || ''}
                                    onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cest: e.target.value.replace(/\D/g, '') } })}
                                    className="w-full px-4 py-4 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold tracking-[0.2em] dark:text-slate-200"
                                    placeholder="Ex: 0100100"
                                />
                            </div>
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
                                className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            >
                                <option value="0">0 - Nacional</option>
                                <option value="1">1 - Estrangeira - Importação Direta</option>
                                <option value="2">2 - Estrangeira - Adquirida no Mercado Interno</option>
                                <option value="3">3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40%</option>
                                <option value="4">4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos</option>
                                <option value="5">5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%</option>
                            </select>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {formData.itemType === 'service' ? 'CST / CSOSN ISSQN' : 'CST / CSOSN ICMS'}
                        </label>
                        <input
                            value={formData.fiscal?.cst || ''}
                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cst: e.target.value } })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            placeholder="Ex: 102, 500, 00..."
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {formData.itemType === 'service' ? 'CFOP Padrão (Municipal)' : 'CFOP Padrão (Estadual)'}
                        </label>
                        <input
                            value={formData.fiscal?.cfop || (formData.itemType === 'service' ? '5933' : '5102')}
                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cfop: e.target.value } })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            placeholder={formData.itemType === 'service' ? 'Ex: 5933' : 'Ex: 5102'}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {formData.itemType === 'service' ? 'Aliquota ISS (%)' : 'Aliquota ICMS (%)'}
                        </label>
                        <input
                            type="number"
                            value={formData.itemType === 'service' ? formData.fiscal?.issPercent : formData.fiscal?.icmsPercent}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setFormData({ 
                                    ...formData, 
                                    fiscal: { 
                                        ...formData.fiscal!, 
                                        ...(formData.itemType === 'service' ? { issPercent: isNaN(val) ? 0 : val } : { icmsPercent: isNaN(val) ? 0 : val }) 
                                    } 
                                });
                            }}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">PIS CST</label>
                        <input
                            value={formData.fiscal?.pisCst || ''}
                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, pisCst: e.target.value } })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            placeholder="Ex: 01, 07, 49..."
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">COFINS CST</label>
                        <input
                            value={formData.fiscal?.cofinsCst || ''}
                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cofinsCst: e.target.value } })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            placeholder="Ex: 01, 07, 49..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductFiscalTab;
