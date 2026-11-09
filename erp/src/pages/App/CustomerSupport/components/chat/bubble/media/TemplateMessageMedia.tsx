import React from 'react';
import type { WhatsAppMessage } from '../../../../types';
import { renderFormattedText } from '../bubbleUtils';

interface TemplateMessageMediaProps {
  message: WhatsAppMessage;
  mediaUrl: string | null;
  onOpenLightbox: () => void;
}

export const TemplateMessageMedia: React.FC<TemplateMessageMediaProps> = ({
  message,
  mediaUrl,
  onOpenLightbox,
}) => {
  const preview =
    message.rawPayload?.template_preview && typeof message.rawPayload.template_preview === 'object'
      ? (message.rawPayload.template_preview as Record<string, unknown>)
      : null;
  const header = preview?.header && typeof preview.header === 'object' ? (preview.header as Record<string, unknown>) : null;
  const buttons = Array.isArray(preview?.buttons) ? preview.buttons : [];

  const safeHttpUrl = (value: unknown): string | null => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
      return null;
    }
  };

  const safePhone = (value: unknown): string | null => {
    if (typeof value !== 'string' || !/^\+?[\d\s().-]{7,24}$/.test(value.trim())) return null;
    return value.trim().replace(/[\s().-]/g, '');
  };

  return (
    <div className="mb-1 space-y-2">
      {header?.type === 'text' && typeof header.text === 'string' && (
        <p className="whitespace-pre-wrap break-words text-[13px] font-semibold">
          {renderFormattedText(header.text)}
        </p>
      )}
      {header?.type === 'image' && (
        <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt={typeof header.text === 'string' ? header.text : 'Imagem do template do WhatsApp'}
              loading="lazy"
              onClick={onOpenLightbox}
              className="max-h-72 w-full cursor-pointer object-cover hover:opacity-95"
            />
          ) : (
            <div className="flex items-center justify-center gap-2 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
              <i className="bi bi-image text-lg" aria-hidden="true" />
              Imagem do template indisponível pela API
            </div>
          )}
        </div>
      )}
      {header?.type === 'video' &&
        (mediaUrl ? (
          <video src={mediaUrl} controls className="max-h-72 w-full rounded-xl" aria-label="Vídeo do template do WhatsApp" />
        ) : (
          <p className="text-[11px] text-slate-500">Vídeo do template indisponível pela API</p>
        ))}
      {header?.type === 'document' &&
        (mediaUrl ? (
          <a
            href={mediaUrl}
            download={typeof header.filename === 'string' ? header.filename : 'documento'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-black/5 px-2.5 py-2 text-[11px] font-medium underline dark:bg-white/10"
          >
            <i className="bi bi-file-earmark" aria-hidden="true" />
            {typeof header.filename === 'string' ? header.filename : 'Documento do template'}
          </a>
        ) : (
          <p className="text-[11px] text-slate-500">Documento do template indisponível pela API</p>
        ))}
      {typeof preview?.body === 'string' && preview.body.trim() && (
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
          {renderFormattedText(preview.body)}
        </p>
      )}
      {typeof preview?.footer === 'string' && preview.footer.trim() && (
        <p className="whitespace-pre-wrap break-words text-[11px] text-slate-500 dark:text-slate-400">
          {renderFormattedText(preview.footer)}
        </p>
      )}
      {buttons.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-700/70">
          {buttons.map((button: any, index: number) => {
            const label = typeof button?.text === 'string' && button.text.trim() ? button.text.trim() : 'Ação do template';
            const href =
              button?.type === 'url'
                ? safeHttpUrl(button.url)
                : button?.type === 'phone_number' && safePhone(button.phoneNumber)
                  ? `tel:${safePhone(button.phoneNumber)}`
                  : null;
            const content = (
              <span className="flex min-h-10 items-center justify-center gap-2 px-3 py-2 text-center text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
                {button?.type === 'url' && <i className="bi bi-box-arrow-up-right" aria-hidden="true" />}
                {button?.type === 'phone_number' && <i className="bi bi-telephone" aria-hidden="true" />}
                {button?.type === 'flow' && <i className="bi bi-ui-checks" aria-hidden="true" />}
                {label}
              </span>
            );
            return href ? (
              <a
                key={`${label}-${index}`}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={index ? 'block border-t border-slate-200/70 dark:border-slate-700/70' : 'block'}
              >
                {content}
              </a>
            ) : (
              <div key={`${label}-${index}`} className={index ? 'border-t border-slate-200/70 dark:border-slate-700/70' : ''}>
                {content}
              </div>
            );
          })}
        </div>
      )}
      {!header && !preview?.body && !preview?.footer && buttons.length === 0 && (
        <p className="whitespace-pre-wrap break-words text-[13px]">
          {renderFormattedText(message.textContent || `Modelo: ${String(preview?.name || 'WhatsApp')}`)}
        </p>
      )}
    </div>
  );
};
