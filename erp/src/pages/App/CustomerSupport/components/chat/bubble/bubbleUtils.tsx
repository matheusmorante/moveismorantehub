import React from 'react';

/**
 * Renderiza links clicáveis em mensagens de texto
 */
export function renderFormattedText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline break-all font-medium"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
