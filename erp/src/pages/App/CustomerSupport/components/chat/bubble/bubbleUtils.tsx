import React from 'react';

type InlineMarker = '*' | '_' | '~';

function renderLink(url: string, key: string): React.ReactNode {
  return (
    <a
      key={key}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 dark:text-blue-400 hover:underline break-all font-medium"
    >
      {url}
    </a>
  );
}

function findClosingMarker(text: string, marker: InlineMarker, from: number): number {
  let index = from;
  while (index < text.length) {
    const url = /^https?:\/\/[^\s]+/i.exec(text.slice(index));
    if (url) {
      index += url[0].length;
      continue;
    }
    if (text[index] === marker) {
      let runLength = 1;
      while (text[index + runLength] === marker) runLength += 1;
      if (runLength === 1 && index > from && !/\s/u.test(text[index - 1])) return index;
      index += runLength;
      continue;
    }
    index += 1;
  }
  return -1;
}

function renderInlineText(text: string, keyPrefix: string): React.ReactNode[] {
  const content: React.ReactNode[] = [];
  let plain = '';
  let cursor = 0;
  let index = 0;

  const flushPlain = () => {
    if (!plain) return;
    content.push(plain);
    plain = '';
  };

  while (cursor < text.length) {
    const url = /^https?:\/\/[^\s]+/i.exec(text.slice(cursor));
    if (url) {
      flushPlain();
      content.push(renderLink(url[0], `${keyPrefix}-link-${index++}`));
      cursor += url[0].length;
      continue;
    }

    if (text.startsWith('```', cursor)) {
      const close = text.indexOf('```', cursor + 3);
      if (close >= 0) {
        flushPlain();
        content.push(
          <code key={`${keyPrefix}-code-${index++}`} className="rounded bg-black/5 px-1 font-mono text-[0.95em] dark:bg-white/10">
            {text.slice(cursor + 3, close)}
          </code>
        );
        cursor = close + 3;
        continue;
      }
      plain += '```';
      cursor += 3;
      continue;
    }

    if (text[cursor] === '`') {
      let close = text.indexOf('`', cursor + 1);
      while (close >= 0 && text.startsWith('```', close)) close = text.indexOf('`', close + 3);
      if (close > cursor + 1) {
        flushPlain();
        content.push(
          <code key={`${keyPrefix}-inline-code-${index++}`} className="rounded bg-black/5 px-1 font-mono text-[0.95em] dark:bg-white/10">
            {text.slice(cursor + 1, close)}
          </code>
        );
        cursor = close + 1;
        continue;
      }
      plain += '`';
      cursor += 1;
      continue;
    }

    const marker = text[cursor] as InlineMarker;
    if (marker === '*' || marker === '_' || marker === '~') {
      let runLength = 1;
      while (text[cursor + runLength] === marker) runLength += 1;
      if (runLength > 1) {
        // WhatsApp defines one marker per side; repeated stars are not bold aliases.
        plain += marker.repeat(runLength);
        cursor += runLength;
        continue;
      }

      const firstInnerCharacter = text[cursor + 1];
      const close = firstInnerCharacter && !/\s/u.test(firstInnerCharacter)
        ? findClosingMarker(text, marker, cursor + 2)
        : -1;
      if (close > cursor + 1) {
        flushPlain();
        const inner = renderInlineText(text.slice(cursor + 1, close), `${keyPrefix}-nested-${index++}`);
        content.push(marker === '*'
          ? <strong key={`${keyPrefix}-bold-${index}`}>{inner}</strong>
          : marker === '_'
            ? <em key={`${keyPrefix}-italic-${index}`}>{inner}</em>
            : <del key={`${keyPrefix}-strike-${index}`}>{inner}</del>);
        cursor = close + 1;
        continue;
      }
    }

    plain += text[cursor];
    cursor += 1;
  }

  flushPlain();
  return content;
}

function renderCodeBlock(lines: string[], openLine: number, openAt: number): { node: React.ReactNode; endLine: number; before: string; after: string } | null {
  const firstLine = lines[openLine];
  const sameLineClose = firstLine.indexOf('```', openAt + 3);
  if (sameLineClose >= 0) {
    return {
      node: <code className="inline-block whitespace-pre rounded bg-black/5 px-1 font-mono text-[0.95em] dark:bg-white/10">{firstLine.slice(openAt + 3, sameLineClose)}</code>,
      endLine: openLine,
      before: firstLine.slice(0, openAt),
      after: firstLine.slice(sameLineClose + 3),
    };
  }

  const codeLines = [firstLine.slice(openAt + 3)];
  for (let line = openLine + 1; line < lines.length; line += 1) {
    const closeAt = lines[line].indexOf('```');
    if (closeAt >= 0) {
      codeLines.push(lines[line].slice(0, closeAt));
      return {
        node: <code className="inline-block whitespace-pre rounded bg-black/5 px-1 font-mono text-[0.95em] dark:bg-white/10">{codeLines.join('\n')}</code>,
        endLine: line,
        before: firstLine.slice(0, openAt),
        after: lines[line].slice(closeAt + 3),
      };
    }
    codeLines.push(lines[line]);
  }
  return null;
}

/** Renders WhatsApp text markers without injecting HTML. */
export function renderFormattedText(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const content: React.ReactNode[] = [];
  let lineIndex = 0;
  let keyIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const fenceAt = line.indexOf('```');
    const isCodeFenceLine = fenceAt >= 0 && /^\s*```/u.test(line);
    const codeBlock = isCodeFenceLine ? renderCodeBlock(lines, lineIndex, fenceAt) : null;

    if (codeBlock) {
      if (codeBlock.before) content.push(...renderInlineText(codeBlock.before, `before-code-${keyIndex++}`));
      content.push(React.cloneElement(codeBlock.node as React.ReactElement, { key: `code-block-${keyIndex++}` }));
      if (codeBlock.after) content.push(...renderInlineText(codeBlock.after, `after-code-${keyIndex++}`));
      lineIndex = codeBlock.endLine;
    } else {
      const bullet = line.match(/^(?:\*|-) (.*)$/u);
      const numbered = line.match(/^(\d+)\. (.*)$/u);
      const quote = line.match(/^> (.*)$/u);
      if (bullet) {
        content.push(<span key={`bullet-${keyIndex++}`} className="inline-flex items-baseline gap-1"><span aria-hidden="true">•</span><span>{renderInlineText(bullet[1], `bullet-text-${keyIndex}`)}</span></span>);
      } else if (numbered) {
        content.push(<span key={`numbered-${keyIndex++}`} className="inline-flex items-baseline gap-1"><span>{numbered[1]}.</span><span>{renderInlineText(numbered[2], `numbered-text-${keyIndex}`)}</span></span>);
      } else if (quote) {
        content.push(<span key={`quote-${keyIndex++}`} className="border-l-2 border-slate-400 pl-2 italic">{renderInlineText(quote[1], `quote-text-${keyIndex}`)}</span>);
      } else {
        content.push(...renderInlineText(line, `line-${keyIndex++}`));
      }
    }

    if (lineIndex < lines.length - 1) content.push('\n');
    lineIndex += 1;
  }

  return content;
}
