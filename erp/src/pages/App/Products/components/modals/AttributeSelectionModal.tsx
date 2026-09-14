import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import VariationType from '../../../../types/variation.type';
import { subscribeToVariations } from '../../../../utils/variationService';
import { normalizeSearchTerm } from '../../../../utils/textUtils';

export interface AttributeSelectionModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSelect: (attribute: { name: string; value: string }) => void;
    readonly onManageAttributes: () => void;
}

/**
 * Modal de seleção guiada de atributos (ex: Cor, Tamanho, Voltagem) e seus respectivos valores para o produto.
 */
export const AttributeSelectionModal: React.FC<AttributeSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    onManageAttributes,
}) => {
    const [availableVariations, setAvailableVariations] = useState<VariationType[]>([]);
    const [selectedAttribute, setSelectedAttribute] = useState<VariationType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const unsubscribe = subscribeToVariations((data) => {
            setAvailableVariations(data.filter((v) => v.active && !v.deleted));
        });

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedAttribute) {
                    setSelectedAttribute(null);
                } else {
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            unsubscribe();
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, selectedAttribute]);

    if (!isOpen) return null;

    const normSearch = normalizeSearchTerm(searchTerm);
    const filteredAttributes = availableVariations.filter((v) =>
        normalizeSearchTerm(v.name).includes(normSearch)
    );

    return createPortal(
        <div
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attribute-selection-modal-title"
        >
            <button
                type="button"
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm cursor-default"
                onClick={onClose}
                aria-label="Fechar modal"
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h3 id="attribute-selection-modal-title" className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <i className="bi bi-plus-circle-fill text-blue-600" aria-hidden="true" />
                            Adicionar Atributo
                        </h3>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">
                            Selecione um atributo e seu valor
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-800 rounded-xl cursor-pointer"
                        aria-label="Fechar modal"
                    >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar min-h-[400px]">
                    {!selectedAttribute ? (
                        <div className="space-y-6">
                            <div className="relative group">
                                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar atributo (Cor, Tamanho...)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-[1.2rem] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold dark:text-slate-300"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {filteredAttributes.map((attr) => (
                                    <button
                                        type="button"
                                        key={attr.id}
                                        onClick={() => setSelectedAttribute(attr)}
                                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                                <i className="bi bi-tag text-lg" aria-hidden="true" />
                                            </div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                                {attr.name}
                                            </span>
                                        </div>
                                        <i className="bi bi-chevron-right text-slate-300 group-hover:text-blue-500 transition-all" aria-hidden="true" />
                                    </button>
                                ))}
                                {filteredAttributes.length === 0 && (
                                    <div className="text-center py-10 opacity-40">
                                        <i className="bi bi-search text-3xl mb-2 block" aria-hidden="true" />
                                        <p className="text-xs font-bold uppercase tracking-widest">
                                            Nenhum atributo encontrado
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <button
                                type="button"
                                onClick={() => setSelectedAttribute(null)}
                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors mb-2"
                            >
                                <i className="bi bi-arrow-left" aria-hidden="true" /> Voltar para Atributos
                            </button>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 mb-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">
                                    Selecionado:
                                </p>
                                <p className="text-lg font-black text-slate-800 dark:text-slate-100">
                                    {selectedAttribute.name}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Escolha o Valor:
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {selectedAttribute.options.map((opt) => (
                                        <button
                                            type="button"
                                            key={opt.id}
                                            onClick={() => {
                                                onSelect({ name: selectedAttribute.name, value: opt.value });
                                                onClose();
                                            }}
                                            className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-500 hover:bg-blue-600 hover:text-white transition-all font-bold text-sm text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 text-center"
                                        >
                                            {opt.value}
                                        </button>
                                    ))}
                                    {selectedAttribute.options.length === 0 && (
                                        <div className="col-span-2 text-center py-8 opacity-40">
                                            <p className="text-xs font-bold">
                                                Sem valores cadastrados para este atributo
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-4 shrink-0 bg-white dark:bg-slate-900">
                    <button
                        type="button"
                        onClick={onManageAttributes}
                        className="w-full py-4 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <i className="bi bi-gear-fill" aria-hidden="true" />
                        Gerenciar Atributos e Valores
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AttributeSelectionModal;
