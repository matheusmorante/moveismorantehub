import React from 'react';
import type { z } from 'zod';
import type { supportChatComposerDraftSchema } from '../../../../../../../shared-utils/customerSupportFormSchemas';

type Attachment = z.input<typeof supportChatComposerDraftSchema>['attachments'][number];
type AttachmentKind = Attachment['kind'];

const attachmentIcon = (kind: AttachmentKind) => ({
  catalog: 'bi-box-seam',
  media: 'bi-image',
  document: 'bi-file-earmark-text',
  contact: 'bi-person-vcard',
  order: 'bi-receipt',
  quote: 'bi-file-earmark-richtext',
  audio: 'bi-mic',
}[kind]);

interface ChatComposerAttachmentListProps {
  attachments: Attachment[];
  onRemove: (attachmentId: string) => void;
}

export const ChatComposerAttachmentList: React.FC<ChatComposerAttachmentListProps> = ({ attachments, onRemove }) => (
  <div className="mb-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto border-b border-slate-100 pb-2 dark:border-slate-800">
    {attachments.map((attachment) => (
      <article key={attachment.id} className="relative flex min-w-44 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 pr-8 dark:border-slate-700 dark:bg-slate-800/70">
        {attachment.kind === 'media' && attachment.mimeType?.startsWith('image/') && attachment.previewUrl
          ? <img src={attachment.previewUrl} alt="Prévia do anexo" className="h-10 w-10 rounded-lg object-cover" />
          : attachment.kind === 'media' && attachment.mimeType?.startsWith('video/') && attachment.previewUrl
            ? <video src={attachment.previewUrl} aria-label="Prévia do vídeo" className="h-10 w-10 rounded-lg object-cover" />
            : attachment.kind === 'audio' && attachment.previewUrl
              ? <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-300"><i className="bi bi-soundwave text-lg" /></span>
              : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 dark:bg-slate-900 dark:text-emerald-300"><i className={`bi ${attachmentIcon(attachment.kind)} text-lg`} /></span>}
        <div className="min-w-0">
          {attachment.kind === 'catalog' ? (
            <>
              <p className="truncate text-xs font-bold">{attachment.selection.deliveryMode === 'native' ? 'WhatsApp · ' : 'Catálogo · '}{attachment.selection.bulkScope?.total ? `${attachment.selection.bulkScope.total} produtos` : `${attachment.selection.items.length} produto${attachment.selection.items.length === 1 ? '' : 's'}`}</p>
              <p className="truncate text-[10px] text-slate-500">{attachment.selection.bulkScope?.categoryName || attachment.selection.items.slice(0, 2).map((item) => item.name).join(', ')}</p>
              {attachment.selection.deliveryMode === 'native' ? <p className="max-w-52 truncate text-[10px] text-emerald-700">Card nativo pronto</p> : attachment.catalogUrl && <p className="max-w-52 truncate text-[10px] text-blue-600">Link pronto</p>}
            </>
          ) : (
            <>
              <p className="max-w-48 truncate text-xs font-semibold">{attachment.label}</p>
              <p className="max-w-48 truncate text-[10px] text-slate-500">{attachment.detail || attachment.mimeType || 'Anexo pendente'}</p>
            </>
          )}
        </div>
        <button type="button" aria-label={`Remover ${attachment.kind === 'catalog' ? 'catálogo' : attachment.label}`} onClick={() => onRemove(attachment.id)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-red-600 dark:hover:bg-slate-700"><i className="bi bi-x-lg text-[10px]" /></button>
      </article>
    ))}
  </div>
);
