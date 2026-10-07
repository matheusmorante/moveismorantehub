import type { ChangeEventHandler } from 'react';

export interface PurchaseAttachmentsSectionProps {
  readonly attachments: readonly string[];
  readonly isUploading: boolean;
  readonly onUpload: ChangeEventHandler<HTMLInputElement>;
  readonly onRemove: (index: number) => void;
}

export const PurchaseAttachmentsSection = ({
  attachments,
  isUploading,
  onUpload,
  onRemove,
}: PurchaseAttachmentsSectionProps) => (
  <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800/30 pt-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <div className="flex flex-col gap-2 w-full">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Anexar documento do pedido (PDF ou imagem · máx. 5)
        </label>
        <label
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all hover:bg-slate-50/20 dark:hover:bg-slate-950/10 ${
            attachments.length >= 5
              ? 'opacity-50 pointer-events-none border-slate-200'
              : 'border-slate-300 dark:border-slate-800 hover:border-blue-500'
          }`}
        >
          <i
            className={`bi ${
              isUploading ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'
            } text-blue-600 dark:text-blue-400 text-2xl mb-1`}
            aria-hidden="true"
          />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {isUploading
              ? 'Enviando arquivos...'
              : 'Arraste ou clique para anexar documento do pedido'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            Formatos: PDF, PNG, JPG (Enviados: {attachments.length}/5)
          </span>
          <input
            type="file"
            multiple
            accept="application/pdf,image/*"
            onChange={onUpload}
            disabled={isUploading || attachments.length >= 5}
            className="hidden"
          />
        </label>

        {attachments.length > 0 && (
          <div className="grid grid-cols-1 gap-2 mt-2">
            {attachments.map((url, idx) => {
              const fileName =
                url.split('/').pop()?.slice(-25) || `Documento do pedido #${idx + 1}`;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50 rounded-xl gap-3 shadow-sm animate-slide-up"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <i
                      className="bi bi-file-earmark-pdf-fill text-red-500 shrink-0 text-base"
                      aria-hidden="true"
                    />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate hover:underline"
                    >
                      {fileName}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-colors shrink-0"
                    title="Remover anexo"
                    aria-label="Remover anexo"
                  >
                    <i className="bi bi-trash text-xs" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default PurchaseAttachmentsSection;
