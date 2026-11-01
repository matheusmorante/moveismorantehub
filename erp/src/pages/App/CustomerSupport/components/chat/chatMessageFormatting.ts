export const WHATSAPP_FORMATS = [
  { label: 'B', name: 'Negrito', prefix: '*', suffix: '*', title: 'Negrito · *texto*', className: 'font-extrabold' },
  { label: 'I', name: 'Itálico', prefix: '_', suffix: '_', title: 'Itálico · _texto_', className: 'italic' },
  { label: 'S', name: 'Tachado', prefix: '~', suffix: '~', title: 'Tachado · ~texto~', className: 'line-through' },
  { label: '`', name: 'Código inline', prefix: '`', suffix: '`', title: 'Código inline · `texto`', className: 'font-mono' },
  { label: '</>', name: 'Monoespaçado', prefix: '```', suffix: '```', title: 'Monoespaçado · ```texto```', className: 'font-mono text-[10px]' },
];

export const WHATSAPP_LINE_FORMATS = [
  { label: '•', name: 'Lista com marcadores', kind: 'bullet' as const, title: 'Lista com marcadores · * texto' },
  { label: '1.', name: 'Lista numerada', kind: 'numbered' as const, title: 'Lista numerada · 1. texto' },
  { label: '❞', name: 'Citação', kind: 'quote' as const, title: 'Citação · > texto' },
];

export type WhatsAppLineFormatKind = (typeof WHATSAPP_LINE_FORMATS)[number]['kind'];

interface FormattedMessage {
  message: string;
  selectionStart: number;
  selectionEnd: number;
}

export function formatSelectedMessage(
  message: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
): FormattedMessage {
  const selected = message.slice(start, end);
  const isWrapped = Boolean(selected)
    && message.slice(Math.max(0, start - prefix.length), start) === prefix
    && message.slice(end, end + suffix.length) === suffix;
  const nextMessage = isWrapped
    ? `${message.slice(0, start - prefix.length)}${selected}${message.slice(end + suffix.length)}`
    : `${message.slice(0, start)}${prefix}${selected}${suffix}${message.slice(end)}`;
  const selectionStart = isWrapped ? start - prefix.length : start + prefix.length;

  return {
    message: nextMessage,
    selectionStart,
    selectionEnd: selectionStart + selected.length,
  };
}

export function formatSelectedMessageLines(
  message: string,
  start: number,
  end: number,
  kind: WhatsAppLineFormatKind,
): FormattedMessage {
  const hasSelection = start !== end;
  const lineStart = message.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const selectedEnd = hasSelection ? Math.max(start, end - 1) : start;
  const nextBreak = hasSelection && message[end - 1] === '\n'
    ? end - 1
    : message.indexOf('\n', selectedEnd);
  const lineEnd = nextBreak < 0 ? message.length : nextBreak;
  const selectedLines = message.slice(lineStart, lineEnd).split('\n');
  const markerAt = (index: number) => kind === 'numbered' ? `${index + 1}. ` : kind === 'quote' ? '> ' : '* ';
  const linePattern = kind === 'numbered' ? /^\d+\. /u : kind === 'quote' ? /^> /u : /^\* /u;
  const remove = selectedLines.every((line) => linePattern.test(line));
  const formattedLines = selectedLines.map((line, index) => remove ? line.replace(linePattern, '') : `${markerAt(index)}${line}`);
  const replacement = formattedLines.join('\n');
  const nextMessage = `${message.slice(0, lineStart)}${replacement}${message.slice(lineEnd)}`;
  const existingMarkerLength = selectedLines[0].match(linePattern)?.[0].length || 0;
  const cursorOffset = Math.max(0, start - lineStart + (remove ? -existingMarkerLength : markerAt(0).length));
  const cursor = lineStart + Math.min(replacement.length, cursorOffset);

  return {
    message: nextMessage,
    selectionStart: hasSelection ? lineStart : cursor,
    selectionEnd: hasSelection ? lineStart + replacement.length : cursor,
  };
}
