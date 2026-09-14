import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Variations from '../../../Variations/Index';

export interface AttributeManagementModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
}

/**
 * Modal para gerenciamento completo de atributos e variações globais dentro do cadastro/edição de produtos.
 */
export const AttributeManagementModal: React.FC<AttributeManagementModalProps> = ({ isOpen, onClose }) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Gerenciamento de Atributos e Variações"
        >
            <button
                type="button"
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md cursor-default"
                onClick={onClose}
                aria-label="Fechar modal"
            />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 border border-slate-100 dark:border-slate-800">
                <div className="absolute top-6 right-8 z-[10003]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 cursor-pointer"
                        title="Fechar modal de atributos (Esc)"
                        aria-label="Fechar modal"
                    >
                        <i className="bi bi-x-lg text-xl" aria-hidden="true" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden">
                    <Variations />
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AttributeManagementModal;
