import { useState } from 'react';
import { toast } from 'react-toastify';

type Props = {
    isOpen: boolean;
    isLoading: boolean;
    onClose: () => void;
    onSubmit: (accessKey: string) => Promise<void>;
};

export function InboundAccessKeyModal({ isOpen, isLoading, onClose, onSubmit }: Props) {
    const [accessKey, setAccessKey] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async () => {
        const normalizedKey = accessKey.replace(/\D/g, '');
        if (normalizedKey.length !== 44) {
            toast.error('Informe uma chave de acesso NF-e com exatamente 44 dígitos.');
            return;
        }
        await onSubmit(normalizedKey);
        setAccessKey('');
    };

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <button aria-label="Fechar" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <section className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-black text-slate-800 dark:text-slate-100">Adicionar NF-e por chave</h2>
                        <p className="mt-1 text-xs text-slate-500">A chave será procurada na próxima consulta de distribuição DF-e/NSU.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><i className="bi bi-x-lg" /></button>
                </header>
                <label className="mt-6 flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Chave de acesso NF-e
                    <input
                        autoFocus
                        inputMode="numeric"
                        maxLength={44}
                        value={accessKey}
                        onChange={(event) => setAccessKey(event.target.value.replace(/\D/g, ''))}
                        placeholder="44 dígitos"
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm font-bold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                </label>
                <footer className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-black uppercase text-slate-500">Cancelar</button>
                    <button type="button" disabled={isLoading} onClick={() => void handleSubmit()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black uppercase text-white disabled:opacity-50">
                        {isLoading ? 'Consultando...' : 'Consultar distribuição'}
                    </button>
                </footer>
            </section>
        </div>
    );
}
