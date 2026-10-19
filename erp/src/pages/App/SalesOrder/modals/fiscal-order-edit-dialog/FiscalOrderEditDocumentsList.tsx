import React from 'react';
import type { FiscalOrderEditDocumentsListProps } from './types';

export const FiscalOrderEditDocumentsList: React.FC<FiscalOrderEditDocumentsListProps> = ({
  documents,
  generalError,
}) => {
  if (documents.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
        Documentos fiscais envolvidos
      </h4>
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-xs text-slate-900 dark:text-white">
              {doc.model === '65' ? 'NFC-e (Modelo 65)' : 'NF-e (Modelo 55)'} ·{' '}
              {doc.environment === 2 ? 'Homologação' : 'Produção'}
            </span>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                doc.action === 'cancel'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                  : doc.action === 'estorno'
                  ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
              }`}
            >
              {doc.action === 'cancel'
                ? 'Cancelamento Fiscal'
                : doc.action === 'estorno'
                ? 'Estorno Fiscal (Fin. 3)'
                : 'Bloqueado'}
            </span>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {doc.action === 'cancel' && (
              <>
                <strong>Procedimento legal:</strong> Cancelamento fiscal da nota original e emissão de nova NF-e com os dados corrigidos. Sem circulação e dentro do prazo legal da SEFAZ-PR (168h mod. 55 / 30min mod. 65).
              </>
            )}
            {doc.action === 'estorno' && (
              <>
                <strong>Procedimento legal:</strong> Emissão de NF-e modelo 55 de estorno (finalidade 3 - NF-e de Ajuste) referenciando a nota original, exclusivamente porque a operação não ocorreu e o prazo legal expirou.
              </>
            )}
            {doc.action !== 'cancel' && doc.action !== 'estorno' && (
              <>
                <strong>Situação fiscal:</strong> {doc.reason || generalError}
              </>
            )}
          </p>

          {doc.action === 'estorno' && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-2.5 text-[11px] text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-200">
              <strong>Aviso de conformidade:</strong> O estorno fiscal por finalidade 3 não deve ser tratado como substituto universal da CC-e. Ele se aplica estritamente quando a operação comprovadamente não ocorreu.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
