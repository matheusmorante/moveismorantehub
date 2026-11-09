import React from 'react';
import type { WhatsAppMessage } from '../../../../types';

interface LocationAndContactsMediaProps {
  message: WhatsAppMessage;
}

export const LocationAndContactsMedia: React.FC<LocationAndContactsMediaProps> = ({ message }) => {
  let safeLocationUrl = '';
  if (message.messageType === 'location' && typeof message.rawPayload?.location?.url === 'string') {
    try {
      const parsedUrl = new URL(message.rawPayload.location.url);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        safeLocationUrl = parsedUrl.href;
      }
    } catch {
      // A URL do provedor é conteúdo externo; só mostramos links HTTP(S) válidos.
    }
  }

  return (
    <div className="space-y-1">
      <p className="whitespace-pre-wrap break-words text-[13px]">
        {message.textContent ||
          (message.messageType === 'location'
            ? 'Localização compartilhada'
            : 'Contato compartilhado')}
      </p>
      {safeLocationUrl && (
        <a
          href={safeLocationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 underline dark:text-emerald-300"
        >
          <i className="bi bi-geo-alt" aria-hidden="true" />
          Abrir localização
        </a>
      )}
    </div>
  );
};
