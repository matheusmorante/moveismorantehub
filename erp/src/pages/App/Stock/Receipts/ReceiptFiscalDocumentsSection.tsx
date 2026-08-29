import { ChangeEvent, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';

type Props = {
    attachments: string[];
    fiscalKey: string;
    onAttachmentsChange: (attachments: string[]) => void;
    onFiscalKeyChange: (value: string) => void;
};

const MAX_FILES = 5;

async function prepareFile(file: File) {
    if (!file.type.startsWith('image/') || file.size <= 2 * 1024 * 1024) return file;
    return imageCompression(file, { maxSizeMB: 2, useWebWorker: true });
}

export default function ReceiptFiscalDocumentsSection({ attachments, fiscalKey, onAttachmentsChange, onFiscalKeyChange }: Props) {
    const [isUploading, setIsUploading] = useState(false);

    const upload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) return;
        if (attachments.length + files.length > MAX_FILES) {
            toast.error('Você pode anexar no máximo 5 arquivos de nota fiscal.');
            event.target.value = '';
            return;
        }
        setIsUploading(true);
        try {
            const uploaded = [...attachments];
            for (const originalFile of Array.from(files)) {
                const file = await prepareFile(originalFile);
                const extension = file.name.split('.').pop() || 'file';
                const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
                const { error } = await supabase.storage.from('purchase-attachments').upload(path, file);
                if (error) throw error;
                const { data } = supabase.storage.from('purchase-attachments').getPublicUrl(path);
                if (data.publicUrl) uploaded.push(data.publicUrl);
            }
            onAttachmentsChange(uploaded);
            toast.success('Nota(s) fiscal(is) anexada(s) com sucesso!');
        } catch (error) {
            console.error('Erro ao anexar nota fiscal:', error);
            toast.error('Não foi possível anexar a nota fiscal.');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    return <section className="grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 dark:border-slate-800 md:grid-cols-2">
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Anexos da nota fiscal (PDF ou imagem · máx. 5)</label>
            <label className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${attachments.length >= MAX_FILES ? 'pointer-events-none border-slate-200 opacity-50' : 'border-slate-300 hover:border-emerald-500 dark:border-slate-800'}`}>
                <i className={`bi ${isUploading ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'} mb-1 text-2xl text-emerald-600`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{isUploading ? 'Enviando arquivos...' : 'Clique para anexar nota fiscal'}</span>
                <span className="mt-0.5 text-[10px] text-slate-400">PDF, PNG ou JPG ({attachments.length}/{MAX_FILES})</span>
                <input type="file" multiple accept="application/pdf,image/*" disabled={isUploading || attachments.length >= MAX_FILES} onChange={upload} className="hidden" />
            </label>
            {attachments.map((url, index) => <div key={url} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                <a href={url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-xs font-bold text-slate-700 hover:text-emerald-600 hover:underline dark:text-slate-300"><i className="bi bi-file-earmark-pdf-fill mr-2 text-red-500" />NF {index + 1}</a>
                <button type="button" onClick={() => onAttachmentsChange(attachments.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-1 text-red-500 hover:bg-red-50" title="Remover anexo"><i className="bi bi-trash text-xs" /></button>
            </div>)}
        </div>
        <label className="flex flex-col gap-2 self-start text-[10px] font-black uppercase tracking-widest text-slate-400">Chave de acesso (NF-e · 44 dígitos)
            <input type="text" value={fiscalKey} maxLength={44} onChange={(event) => onFiscalKeyChange(event.target.value.replace(/\D/g, ''))} placeholder="Digite a chave da nota fiscal..." className="border-b-2 border-slate-200 bg-transparent p-2 text-sm font-bold tracking-widest text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:text-slate-200" />
        </label>
    </section>;
}
