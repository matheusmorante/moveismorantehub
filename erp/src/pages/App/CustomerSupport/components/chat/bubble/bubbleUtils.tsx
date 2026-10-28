import React from 'react';

function renderLinks(text: string, keyPrefix: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={`${keyPrefix}-${index}`}
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

/** Converts Markdown's double-asterisk bold to WhatsApp's single-asterisk syntax. */
export function normalizeWhatsAppText(text: string): string {
  return text.replace(/(https?:\/\/[^\s]+|```[\s\S]*?```|`[^`\n]*`)|\*\*([^*\n]+)\*\*/g, (match, protectedText: string | undefined, bold: string | undefined) =>
    protectedText || !bold ? match : `*${bold}*`);
}

/** Renders WhatsApp text markers without injecting HTML. */
export function renderFormattedText(text: string) {
  const markerRegex = /(https?:\/\/[^\s]+|```[\s\S]+?```|`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  const content: React.ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  for (const match of text.matchAll(markerRegex)) {
    const start = match.index ?? 0;
    const token = match[0];
    if (start > cursor) content.push(...renderLinks(text.slice(cursor, start), `text-${index++}`));

    const key = `format-${index++}`;
    if (/^https?:\/\//i.test(token)) {
      content.push(...renderLinks(token, key));
    } else if (token.startsWith('```')) {
      content.push(<code key={key} className="rounded bg-black/5 px-1 font-mono text-[0.95em] dark:bg-white/10">{token.slice(3, -3)}</code>);
    } else if (token.startsWith('`')) {
      content.push(<code key={key} className="rounded bg-black/5 px-1 font-mono text-[0.95em] dark:bg-white/10">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      content.push(<strong key={key}>{renderLinks(token.slice(2, -2), key)}</strong>);
    } else if (token.startsWith('*')) {
      content.push(<strong key={key}>{renderLinks(token.slice(1, -1), key)}</strong>);
    } else if (token.startsWith('_')) {
      content.push(<em key={key}>{renderLinks(token.slice(1, -1), key)}</em>);
    } else {
      content.push(<del key={key}>{renderLinks(token.slice(1, -1), key)}</del>);
    }
    cursor = start + token.length;
  }

  if (cursor < text.length || content.length === 0) {
    content.push(...renderLinks(text.slice(cursor), `text-${index}`));
  }
  return content;
}
