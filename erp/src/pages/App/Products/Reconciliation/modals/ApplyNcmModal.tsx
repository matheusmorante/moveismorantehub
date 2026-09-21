import React, { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (ncm: string) => Promise<void>;
    selectedCount: number;
}

export const ApplyNcmModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onConfirm,
    selectedCount
}) => {
    const [ncm, setNcm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!ncm.trim()) return;
        setIsSubmitting(true);
        try {
            await onConfirm(ncm.trim());
            onClose();
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
                            <i className="bi bi-file-earmark-text text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                                Definir NCM em Lote
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                {selectedCount} {selectedCount === 1 ? 'produto selecionado' : 'produtos selecionados'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <i className="bi bi-x-lg text-xs"></i>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                        Informe o código NCM fiscal que será atribuído a todos os produtos selecionados:
                    </p>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Código NCM
                        </label>
                        <input
                            type="text"
                            value={ncm}
                            onChange={(e) => setNcm(e.target.value)}
                            placeholder="Ex: 9403.50.00"
                            className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end gap-2.5">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!ncm.trim() || isSubmitting}
                        className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <><i className="bi bi-arrow-repeat animate-spin"></i> Aplicando...</>
                        ) : (
                            <><i className="bi bi-check2"></i> Aplicar NCM</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
