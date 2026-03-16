import React from 'react';
import Product from '../../../../types/product.type';

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
    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <i className="bi bi-file-earmark-text text-blue-600"></i> Informações Fiscais para NF-e
                        </h4>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Dados essenciais para emissão de nota fiscal</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleGenerateNCM}
                        disabled={isGeneratingNCM}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isGeneratingNCM ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                    >
                        {isGeneratingNCM ? <i className="bi bi-hourglass-split animate-spin"></i> : <i className="bi bi-search"></i>}
                        Descobrir NCM com IA
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {formData.itemType === 'service' ? (
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Código Municipal / Serviço (LC 116/03) *</label>
                            <input
                                value={formData.fiscal?.codigoServico || ''}
                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, codigoServico: e.target.value.replace(/\D/g, '').slice(0, 8) } })}
                                className="w-full px-4 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold tracking-[0.2em] dark:text-slate-200"
                                placeholder="Ex: 0101"
                            />
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Código NCM (8 Dígitos) *</label>
                                <input
                                    value={formData.fiscal?.ncm || ''}
                                    onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, ncm: e.target.value.replace(/\D/g, '').slice(0, 8) } })}
                                    className="w-full px-4 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold tracking-[0.2em] dark:text-slate-200"
                                    placeholder="Ex: 94034000"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Código CEST (Opcional)</label>
                                <input
                                    value={formData.fiscal?.cest || ''}
                                    onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cest: e.target.value.replace(/\D/g, '') } })}
                                    className="w-full px-4 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold tracking-[0.2em] dark:text-slate-200"
                                    placeholder="Ex: 0100100"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {formData.itemType === 'service' ? 'Descrição Fiscal do Serviço' : 'Descrição do NCM'}
                    </label>
                    <input
                        value={formData.fiscal?.ncmDescription || ''}
                        onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, ncmDescription: e.target.value } })}
                        className="w-full px-4 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                        placeholder={formData.itemType === 'service' ? 'Ex: Serviços de manutenção e reparo...' : 'Ex: Móveis de cozinha, de madeira...'}
                    />
                </div>
            </div>

            {/* Simples Nacional / Tributação */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Configurações de Imposto por Produto</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {formData.itemType !== 'service' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Origem da Mercadoria</label>
                            <select
                                value={formData.fiscal?.origem || '0'}
                                onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, origem: e.target.value } })}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
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
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
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
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
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
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">PIS CST</label>
                        <input
                            value={formData.fiscal?.pisCst || ''}
                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, pisCst: e.target.value } })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            placeholder="Ex: 01, 07, 49..."
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">COFINS CST</label>
                        <input
                            value={formData.fiscal?.cofinsCst || ''}
                            onChange={(e) => setFormData({ ...formData, fiscal: { ...formData.fiscal!, cofinsCst: e.target.value } })}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-slate-200"
                            placeholder="Ex: 01, 07, 49..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductFiscalTab;
