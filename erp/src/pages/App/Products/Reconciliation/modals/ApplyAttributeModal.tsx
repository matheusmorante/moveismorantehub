import React, { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (attrName: string, attrValue: string) => Promise<void>;
    selectedCount: number;
    availableAttributes?: Array<{
        id: string;
        name: string;
        dataType?: 'list' | 'integer' | 'decimal' | 'text' | 'boolean' | 'measure';
        unit?: string;
    }>;
}

export const ApplyAttributeModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onConfirm,
    selectedCount,
    availableAttributes = []
}) => {
    const [attributeName, setAttributeName] = useState('');
    const [attributeValue, setAttributeValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const selectedAttribute = availableAttributes.find(attribute => attribute.name === attributeName);

    const resetAndClose = () => {
        setAttributeName('');
        setAttributeValue('');
        onClose();
    };

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!attributeName.trim() || !attributeValue.trim()) return;
        setIsSubmitting(true);
        try {
            await onConfirm(attributeName.trim(), attributeValue.trim());
            resetAndClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <i className="bi bi-ui-radios text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                Definir Atributo em Lote
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                {selectedCount} {selectedCount === 1 ? 'produto selecionado' : 'produtos selecionados'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={resetAndClose}
                        disabled={isSubmitting}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <i className="bi bi-x-lg text-xs"></i>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Nome do Atributo
                        </label>
                        {availableAttributes.length > 0 ? (
                            <select
                                value={attributeName}
                                onChange={(e) => {
                                    setAttributeName(e.target.value);
                                    setAttributeValue('');
                                }}
                                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20"
                            >
                                <option value="">Selecione um atributo...</option>
                                {availableAttributes.map(a => (
                                    <option key={a.id} value={a.name}>{a.name}</option>
                                ))}
                            </select>
                        ) : (
                            <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                                Os produtos selecionados não possuem atributos obrigatórios pendentes em comum.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Valor a Atribuir
                        </label>
                        {selectedAttribute?.dataType === 'boolean' ? (
                            <select
                                value={attributeValue}
                                onChange={(e) => setAttributeValue(e.target.value)}
                                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20"
                            >
                                <option value="">Selecione...</option>
                                <option value="Sim">Sim</option>
                                <option value="Não">Não</option>
                            </select>
                        ) : (
                            <div className="relative">
                                <input
                                    type={selectedAttribute && ['integer', 'decimal', 'measure'].includes(selectedAttribute.dataType || '') ? 'number' : 'text'}
                                    step={selectedAttribute?.dataType === 'integer' ? '1' : '0.01'}
                                    value={attributeValue}
                                    onChange={(e) => setAttributeValue(e.target.value)}
                                    placeholder="Informe o valor..."
                                    className={`w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/20 ${selectedAttribute?.unit ? 'pr-12' : ''}`}
                                />
                                {selectedAttribute?.unit && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        {selectedAttribute.unit}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end gap-2.5">
                    <button
                        onClick={resetAndClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!attributeName.trim() || !attributeValue.trim() || isSubmitting}
                        className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <><i className="bi bi-arrow-repeat animate-spin"></i> Aplicando...</>
                        ) : (
                            <><i className="bi bi-check2"></i> Aplicar Atributo</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
