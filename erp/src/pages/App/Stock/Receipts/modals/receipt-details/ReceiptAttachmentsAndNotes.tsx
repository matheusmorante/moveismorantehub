import React from 'react';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';

interface Props {
    readonly receipt: GoodsReceipt;
}

export const ReceiptAttachmentsAndNotes: React.FC<Props> = ({ receipt }) => {
    const hasAttachments = Boolean(receipt.attachments && receipt.attachments.length > 0);
    const hasObservations = Boolean(receipt.observation?.trim());

    if (!hasAttachments && !hasObservations) return null;

    return (
        <div className="space-y-4">
            {/* Attachments Section */}
            {hasAttachments && (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Anexos ({receipt.attachments!.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {receipt.attachments!.map((url, idx) => (
                            <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            >
                                <i className="bi bi-paperclip text-emerald-600" aria-hidden="true" />
                                <span>Documento {idx + 1}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Observations Section */}
            {hasObservations && (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Observações do Recebimento
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {receipt.observation!
                            .split('\n')
                            .map((obs) => obs.trim())
                            .filter(Boolean)
                            .map((obs, idx) => (
                                <span
                                    key={`${obs}-${idx}`}
                                    className="inline-flex items-center rounded-lg bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-200"
                                >
                                    {obs}
                                </span>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};
