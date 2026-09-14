import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface InboundAccessKeyModalProps {
    readonly isOpen: boolean;
    readonly isLoading: boolean;
    readonly onClose: () => void;
    readonly onSubmit: (accessKey: string) => Promise<void>;
}

export function InboundAccessKeyModal({ isOpen, isLoading, onClose, onSubmit }: InboundAccessKeyModalProps) {
    const [accessKey, setAccessKey] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            setAccessKey('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        const normalizedKey = accessKey.replace(/\D/g, '');
        if (normalizedKey.length !== 44) {
            toast.error('Informe uma chave de acesso NF-e com exatamente 44 dígitos.');
            return;
        }
        try {
            await onSubmit(normalizedKey);
            setAccessKey('');
        } catch (error: unknown) {
            console.error('Erro ao consultar chave de acesso:', error);
            toast.error('Não foi possível consultar a chave informada.');
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void handleSubmit();
    };

    return (
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="access-key-modal-title"
        >
            <button
                type="button"
                aria-label="Fechar"
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default"
                onClick={onClose}
            />
            <form
                onSubmit={handleFormSubmit}
                className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
            >
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="access-key-modal-title" className="text-base font-black text-slate-800 dark:text-slate-100">
                            Adicionar NF-e por chave
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            A chave será procurada na próxima consulta de distribuição DF-e/NSU.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </header>
                <label className="mt-6 flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Chave de acesso NF-e ({accessKey.length}/44)
                    <input
                        autoFocus
                        inputMode="numeric"
                        maxLength={44}
                        value={accessKey}
                        onChange={(event) => setAccessKey(event.target.value.replace(/\D/g, ''))}
                        placeholder="44 dígitos numéricos"
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm font-bold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 transition-colors"
                    />
                </label>
                <footer className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || accessKey.length !== 44}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
                    >
                        {isLoading ? 'Consultando...' : 'Consultar distribuição'}
                    </button>
                </footer>
            </form>
        </div>
    );
}

export default InboundAccessKeyModal;
