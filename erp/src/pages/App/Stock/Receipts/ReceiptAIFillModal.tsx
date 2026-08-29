import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { parseReceiptWithAI, ReceiptAIResult } from '../../../utils/receiptAiService';

type Props = { isOpen: boolean; onClose: () => void; onApply: (result: ReceiptAIResult) => Promise<void> };

export default function ReceiptAIFillModal({ isOpen, onClose, onApply }: Props) {
    const [text, setText] = useState(''); const [listening, setListening] = useState(false); const [loading, setLoading] = useState(false);
    const recognition = useRef<any>(null);
    useEffect(() => {
        const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!Recognition) return;
        const instance = new Recognition(); instance.lang = 'pt-BR'; instance.continuous = true; instance.interimResults = false;
        instance.onresult = (event: any) => setText((current) => `${current} ${Array.from(event.results).slice(event.resultIndex).map((r: any) => r[0].transcript).join(' ')}`.trim());
        instance.onend = () => setListening(false); instance.onerror = () => setListening(false); recognition.current = instance;
        return () => instance.stop();
    }, []);
    if (!isOpen) return null;
    const toggleVoice = () => {
        if (!recognition.current) return toast.warn('Use o Chrome ou digite o texto: este navegador não oferece transcrição por voz.');
        if (listening) recognition.current.stop(); else { recognition.current.start(); setListening(true); }
    };
    const analyze = async () => {
        if (!text.trim()) return toast.warn('Descreva os itens ou use o microfone. Informe sempre o fornecedor/fábrica.');
        setLoading(true);
        try { await onApply(await parseReceiptWithAI(text)); onClose(); } catch (error: any) { toast.error(error.message || 'Falha ao preencher com IA.'); } finally { setLoading(false); }
    };
    return <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><section className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-start justify-between gap-4"><div><h3 className="text-lg font-black text-slate-800 dark:text-slate-100"><i className="bi bi-stars mr-2 text-violet-600" />Preencher com IA</h3><p className="mt-1 text-xs text-slate-500">Diga fornecedor/fábrica, produto, modelo, cor/variação, quantidade e custo base. IPI e frete aceitam % ou R$.</p></div><button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500"><i className="bi bi-x-lg" /></button></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800"><i className="bi bi-exclamation-triangle-fill mr-2" />O fornecedor/fábrica é obrigatório para evitar produtos iguais de fabricantes diferentes.</div><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Ex.: Recebi da Fábrica Alfa 4 cadeiras Roma cor preta, custo base 120 reais cada; IPI 5% e frete R$ 80." className="mt-4 min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800" /><div className="mt-4 flex justify-between gap-3"><button type="button" onClick={toggleVoice} className={`rounded-xl px-4 py-3 text-xs font-black uppercase ${listening ? 'bg-rose-600 text-white' : 'bg-violet-100 text-violet-700'}`}><i className={`bi ${listening ? 'bi-stop-fill' : 'bi-mic-fill'} mr-2`} />{listening ? 'Parar áudio' : 'Falar'}</button><button type="button" disabled={loading} onClick={analyze} className="rounded-xl bg-violet-600 px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50">{loading ? 'Interpretando...' : 'Interpretar e preencher'}</button></div></section></div>;
}
