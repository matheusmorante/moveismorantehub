import React, { ChangeEvent, useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-toastify';
import { supabase } from '@/pages/utils/supabaseConfig';

export interface ReceiptFiscalDocumentsSectionProps {
    readonly attachments: readonly string[];
    readonly fiscalKey?: string;
    readonly onAttachmentsChange: (attachments: string[]) => void;
    readonly onFiscalKeyChange?: (value: string) => void;
}

const MAX_FILES = 5;

async function prepareFile(file: File): Promise<File> {
    if (!file.type.startsWith('image/') || file.size <= 2 * 1024 * 1024) return file;
    return imageCompression(file, { maxSizeMB: 2, useWebWorker: true });
}

interface AttachmentInfo {
    readonly name: string;
    readonly isPdf: boolean;
    readonly isImage: boolean;
    readonly extension: string;
}

function getAttachmentInfo(url: string, index: number): AttachmentInfo {
    try {
        const decoded = decodeURIComponent(url);
        const urlWithoutQuery = decoded.split('?')[0].split('#')[0];
        const rawFilename = urlWithoutQuery.split('/').pop() || '';
        
        const cleanName = rawFilename.replace(/^\d+-/, '');
        const extension = cleanName.split('.').pop()?.toLowerCase() || '';

        const isPdf = extension === 'pdf';
        const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(extension) || url.startsWith('data:image/');

        return {
            name: cleanName || `Documento ${index + 1}`,
            isPdf,
            isImage,
            extension
        };
    } catch {
        return { name: `Documento ${index + 1}`, isPdf: false, isImage: false, extension: '' };
    }
}

/**
 * Seção para upload e visualização de documentos fiscais e anexos de recebimento de estoque.
 */
export const ReceiptFiscalDocumentsSection: React.FC<ReceiptFiscalDocumentsSectionProps> = ({
    attachments,
    onAttachmentsChange
}) => {
    const [isUploading, setIsUploading] = useState(false);

    const upload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files?.length) return;

        if (attachments.length + files.length > MAX_FILES) {
            toast.error(`Você pode anexar no máximo ${MAX_FILES} arquivos.`);
            event.target.value = '';
            return;
        }

        setIsUploading(true);
        try {
            const uploaded = [...attachments];
            for (const originalFile of Array.from(files)) {
                const file = await prepareFile(originalFile);
                const sanitizedName = originalFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const path = `receipts/${Date.now()}-${sanitizedName}`;
                const { error } = await supabase.storage.from('purchase-attachments').upload(path, file);
                if (error) throw error;
                const { data } = supabase.storage.from('purchase-attachments').getPublicUrl(path);
                if (data.publicUrl) uploaded.push(data.publicUrl);
            }
            onAttachmentsChange(uploaded);
            toast.success('Arquivo(s) anexado(s) com sucesso!');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Não foi possível anexar o arquivo.';
            toast.error(`Erro ao anexar arquivo: ${message}`);
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    }, [attachments, onAttachmentsChange]);

    const handleRemove = useCallback((indexToRemove: number) => {
        onAttachmentsChange(attachments.filter((_, idx) => idx !== indexToRemove));
    }, [attachments, onAttachmentsChange]);

    return (
        <section className="border-t border-slate-100 pt-6 dark:border-slate-800">
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Anexos (PDF ou imagens, máximo {MAX_FILES})
                </label>
                <label
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                        attachments.length >= MAX_FILES
                            ? 'pointer-events-none border-slate-200 opacity-50 dark:border-slate-800'
                            : 'border-slate-300 hover:border-emerald-500 dark:border-slate-800 dark:hover:border-emerald-500'
                    }`}
                >
                    <i className={`bi ${isUploading ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'} mb-1 text-2xl text-emerald-600`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isUploading ? 'Enviando arquivos...' : 'Clique para anexar documento (ex: comprovante, pedido)'}
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-400">
                        PDF, PNG ou JPG ({attachments.length}/{MAX_FILES})
                    </span>
                    <input
                        type="file"
                        multiple
                        accept="application/pdf,image/*"
                        disabled={isUploading || attachments.length >= MAX_FILES}
                        onChange={upload}
                        className="hidden"
                    />
                </label>

                {attachments.map((url, index) => {
                    const info = getAttachmentInfo(url, index);
                    return (
                        <div
                            key={url}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-955/30"
                        >
                            <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700 hover:text-emerald-600 hover:underline dark:text-slate-300 flex items-center gap-2"
                            >
                                {info.isPdf ? (
                                    <i className="bi bi-file-earmark-pdf-fill text-red-500 text-sm shrink-0" />
                                ) : info.isImage ? (
                                    <i className="bi bi-file-earmark-image-fill text-blue-500 text-sm shrink-0" />
                                ) : (
                                    <i className="bi bi-file-earmark-text-fill text-slate-500 text-sm shrink-0" />
                                )}
                                <span className="truncate">{info.name}</span>
                            </a>
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Remover anexo"
                                aria-label={`Remover anexo ${info.name}`}
                            >
                                <i className="bi bi-trash text-xs" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default ReceiptFiscalDocumentsSection;
