import React from 'react';
import { WhatsAppMessage } from '../../../types';
import { MessageAudioPlayer } from './MessageAudioPlayer';

interface MessageBubbleMediaProps {
  message: WhatsAppMessage;
  mediaUrl: string | null;
  onOpenLightbox: () => void;
}

export const MessageBubbleMedia: React.FC<MessageBubbleMediaProps> = ({
  message,
  mediaUrl,
  onOpenLightbox,
}) => {
  if (message.messageType === 'template') {
    const preview = message.rawPayload?.template_preview && typeof message.rawPayload.template_preview === 'object'
      ? message.rawPayload.template_preview
      : null;
    const header = preview?.header && typeof preview.header === 'object' ? preview.header : null;
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
          <p className="whitespace-pre-wrap break-words text-[13px] font-semibold">{header.text}</p>
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
        {header?.type === 'video' && (
          mediaUrl
            ? <video src={mediaUrl} controls className="max-h-72 w-full rounded-xl" aria-label="Vídeo do template do WhatsApp" />
            : <p className="text-[11px] text-slate-500">Vídeo do template indisponível pela API</p>
        )}
        {header?.type === 'document' && (
          mediaUrl
            ? <a href={mediaUrl} download={typeof header.filename === 'string' ? header.filename : 'documento'} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-black/5 px-2.5 py-2 text-[11px] font-medium underline dark:bg-white/10">
                <i className="bi bi-file-earmark" aria-hidden="true" />
                {typeof header.filename === 'string' ? header.filename : 'Documento do template'}
              </a>
            : <p className="text-[11px] text-slate-500">Documento do template indisponível pela API</p>
        )}
        {typeof preview?.body === 'string' && preview.body.trim() && (
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{preview.body}</p>
        )}
        {typeof preview?.footer === 'string' && preview.footer.trim() && (
          <p className="whitespace-pre-wrap break-words text-[11px] text-slate-500 dark:text-slate-400">{preview.footer}</p>
        )}
        {buttons.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            {buttons.map((button: any, index: number) => {
              const label = typeof button?.text === 'string' && button.text.trim() ? button.text.trim() : 'Ação do template';
              const href = button?.type === 'url' ? safeHttpUrl(button.url)
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
                <a key={`${label}-${index}`} href={href} target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className={index ? 'block border-t border-slate-200/70 dark:border-slate-700/70' : 'block'}>
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
          <p className="whitespace-pre-wrap break-words text-[13px]">{message.textContent || `Modelo: ${preview?.name || 'WhatsApp'}`}</p>
        )}
      </div>
    );
  }

  // 1. Imagem
  if (message.messageType === 'image' || message.messageType === 'sticker') {
    return (
      <div className="mb-2 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt={message.mediaCaption || (message.messageType === 'sticker' ? 'Figurinha recebida no WhatsApp' : 'Foto compartilhada no WhatsApp')}
            loading="lazy"
            onClick={onOpenLightbox}
            className="w-full max-h-72 object-cover cursor-pointer hover:opacity-95 transition-opacity"
          />
        ) : (
          <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <i className="bi bi-image text-lg"></i>
            {message.messageType === 'sticker' ? 'Figurinha recebida' : 'Foto recebida'}
          </div>
        )}
        {message.mediaCaption && (
          <p className="p-2 text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
            {message.mediaCaption}
          </p>
        )}
      </div>
    );
  }

  // 2. Documento / PDF
  if (message.messageType === 'document') {
    const isPdf = message.mediaMimeType?.toLowerCase() === 'application/pdf';
    const fileType = message.mediaMimeType && message.mediaMimeType !== 'application/octet-stream'
      ? message.mediaMimeType.split('/')[1]?.toUpperCase() || 'ARQUIVO'
      : 'ARQUIVO';
    return (
      <div className="mb-2 flex items-center gap-3 p-2.5 rounded-xl bg-black/5 dark:bg-black/20 border border-slate-200/60 dark:border-slate-700">
        <div className={'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' +
          (isPdf ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300')}>
          <i className={'bi ' + (isPdf ? 'bi-file-earmark-pdf-fill' : 'bi-file-earmark') + ' text-xl'}></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {message.mediaFilename || 'Documento'}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-mono">
            {fileType}
          </span>
        </div>
        {mediaUrl && (
          <a
            href={mediaUrl}
            download={message.mediaFilename || 'documento'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors shrink-0 shadow-xs"
            title="Baixar arquivo"
          >
            <i className="bi bi-download text-xs"></i>
          </a>
        )}
      </div>
    );
  }

  // 3. Mensagem de Voz / Áudio
  if (message.messageType === 'audio') {
    return (
      <div className="mb-2 rounded-xl bg-black/5 p-2 dark:bg-black/20">
        {mediaUrl ? <MessageAudioPlayer src={mediaUrl} /> : (
          <div className="p-2 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2">
            <i className="bi bi-mic-fill text-emerald-500 text-base"></i>
            Mensagem de voz
          </div>
        )}
      </div>
    );
  }

  // 4. Vídeo
  if (message.messageType === 'video') {
    return (
      <div className="mb-2 overflow-hidden rounded-xl bg-black/10 dark:bg-black/30">
        {mediaUrl ? (
          <video controls src={mediaUrl} className="w-full max-h-72 rounded-xl" />
        ) : (
          <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <i className="bi bi-camera-video text-lg"></i>
            Vídeo recebido
          </div>
        )}
        {message.mediaCaption && (
          <p className="p-2 text-xs text-slate-800 dark:text-slate-200 font-medium">
            {message.mediaCaption}
          </p>
        )}
      </div>
    );
  }

  // 5. Mensagem Interativa / Botões
  if (message.messageType === 'interactive') {
    const reactionEmoji = typeof message.rawPayload?.reaction?.emoji === 'string'
      ? message.rawPayload.reaction.emoji
      : message.textContent?.match(/^Reação (.+) a uma mensagem$/u)?.[1] || '';
    const isReaction = message.rawPayload?.provider_message_type === 'reaction'
      || Boolean(reactionEmoji)
      || message.textContent === 'Reação removida de uma mensagem';
    if (isReaction) {
      return (
        <p className="mb-1 flex items-center gap-2 rounded-full bg-black/5 px-2 py-1 text-[12px] dark:bg-white/10">
          <span className="text-lg" aria-hidden="true">{reactionEmoji || '↩️'}</span>
          <span>{reactionEmoji ? 'Reação à mensagem citada' : 'Reação removida da mensagem'}</span>
        </p>
      );
    }
    return (
      <div className="mb-1 whitespace-pre-wrap break-words p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 font-medium">
        {message.textContent}
      </div>
    );
  }

  if (message.messageType === 'location' || message.messageType === 'contacts') {
    let safeLocationUrl = '';
    if (message.messageType === 'location' && typeof message.rawPayload?.location?.url === 'string') {
      try {
        const parsedUrl = new URL(message.rawPayload.location.url);
        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') safeLocationUrl = parsedUrl.href;
      } catch {
        // A URL do provedor é conteúdo externo; só mostramos links HTTP(S) válidos.
      }
    }
    return (
      <div className="space-y-1">
        <p className="whitespace-pre-wrap break-words text-[13px]">
          {message.textContent || (message.messageType === 'location' ? 'Localização compartilhada' : 'Contato compartilhado')}
        </p>
        {safeLocationUrl && (
          <a href={safeLocationUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 underline dark:text-emerald-300">
            <i className="bi bi-geo-alt" aria-hidden="true" />
            Abrir localização
          </a>
        )}
      </div>
    );
  }

  if (message.messageType === 'deleted') {
    return (
      <p className="mb-1 flex items-center gap-1.5 text-[13px] italic text-slate-500 dark:text-slate-300">
        <i className="bi bi-slash-circle" aria-hidden="true"></i>
        <span>{message.textContent || 'Esta mensagem foi apagada'}</span>
      </p>
    );
  }

  // 6. Formato não suportado
  if (message.messageType === 'unsupported') {
    const displayText = message.errorCode
      ? 'Mensagem não suportada pela API do WhatsApp.'
      : message.textContent || 'Mensagem não suportada pela API do WhatsApp.';
    const hasTechnicalDetails = Boolean(message.errorCode || message.failureReason || message.apiMessageId);

    return (
      <div className="mb-1 rounded-xl bg-amber-50 p-2 text-[11px] text-amber-800 dark:border dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="flex items-start gap-2">
          <i className="bi bi-info-circle-fill mt-0.5 text-amber-500" aria-hidden="true"></i>
          <span>{displayText}</span>
        </p>
        {hasTechnicalDetails && (
          <details className="ml-5 mt-1">
            <summary className="cursor-pointer select-none text-[10px] text-amber-700 dark:text-amber-300">
              Detalhes técnicos
            </summary>
            <div className="mt-1 space-y-1 break-words text-[10px] text-amber-800 dark:text-amber-200">
              {message.errorCode && <p><strong>Código:</strong> {message.errorCode}</p>}
              {message.failureReason && <p><strong>Erro original:</strong> {message.failureReason}</p>}
              {message.apiMessageId && (
                <p><strong>ID da mensagem:</strong> <span className="font-mono">{message.apiMessageId}</span></p>
              )}
            </div>
          </details>
        )}
      </div>
    );
  }

  return null;
};
