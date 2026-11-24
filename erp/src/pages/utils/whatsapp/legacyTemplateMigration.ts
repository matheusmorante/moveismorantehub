export const removeOptionalRouteUrlSection = (template: string): string => {
  const lines = template.split(/\r?\n/);
  const visibleLines: string[] = [];

  for (const line of lines) {
    if (!line.includes('{{routeUrl}}')) {
      visibleLines.push(line);
      continue;
    }

    if (line.trim() === '{{routeUrl}}') {
      let headingIndex = visibleLines.length - 1;
      while (headingIndex >= 0 && !visibleLines[headingIndex].trim()) headingIndex -= 1;
      const heading = visibleLines[headingIndex] || '';
      if (/(?:rota|route|google\s*maps|maps?|mapa|localiza|url)/i.test(heading)) {
        visibleLines.splice(headingIndex);
      }
    }
  }

  return visibleLines.join('\n').replace(/\n{3,}/g, '\n\n');
};

export const removeLegacyOperationSections = (template: string): string => {
  const lines = template.split(/\r?\n/);
  const visibleLines: string[] = [];

  for (const line of lines) {
    const hasSchedulePlaceholder = /{{deliveryDate}}|{{deliveryTime}}/.test(line);
    const hasAddressPlaceholder = line.includes('{{address}}');
    if (!hasSchedulePlaceholder && !hasAddressPlaceholder) {
      visibleLines.push(line);
      continue;
    }

    let headingIndex = visibleLines.length - 1;
    while (headingIndex >= 0 && !visibleLines[headingIndex].trim()) headingIndex -= 1;
    const heading = visibleLines[headingIndex] || '';
    const isScheduleHeading = hasSchedulePlaceholder &&
      /(agendamento|programação|horário|data|período|agendad[oa]|entrega|retirada)/i.test(heading);
    const isAddressHeading = hasAddressPlaceholder && /(endereço|local|destino)/i.test(heading);
    if (isScheduleHeading || isAddressHeading) visibleLines.splice(headingIndex, 1);
  }

  return visibleLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

export const removeLegacyLogisticsHeadings = (template: string): string =>
  template
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*(?:📦\s*)?\*{0,2}(?:operações(?: do pedido)?|logística)\*{0,2}:?\*{0,2}\s*$/i.test(line)
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

export const removeLegacyGlobalItemsSection = (template: string): string => {
  const lines = template.split(/\r?\n/);
  const visibleLines: string[] = [];

  for (const line of lines) {
    if (!line.includes('{{items}}')) {
      visibleLines.push(line);
      continue;
    }

    let headingIndex = visibleLines.length - 1;
    while (headingIndex >= 0 && !visibleLines[headingIndex].trim()) headingIndex -= 1;
    if (headingIndex >= 0 && /itens/i.test(visibleLines[headingIndex])) {
      visibleLines.splice(headingIndex, 1);
    }
  }

  return visibleLines.join('\n').replace(/\n{3,}/g, '\n\n');
};

export const moveLegacyNoticesIntoOperations = (template: string): string => {
  const lines = template.split(/\r?\n/);
  const hasOperationsPlaceholder = lines.some((line) => line.includes('{{operations}}'));
  const visibleLines: string[] = [];
  let insertedOperationsPlaceholder = hasOperationsPlaceholder;

  for (const line of lines) {
    if (!line.includes('{{observation}}')) {
      visibleLines.push(line);
      continue;
    }

    let headingIndex = visibleLines.length - 1;
    while (headingIndex >= 0 && !visibleLines[headingIndex].trim()) headingIndex -= 1;
    if (
      headingIndex >= 0 &&
      /avisos? importantes?|importante|𝐈𝐌𝐏𝐎𝐑𝐓𝐀𝐍𝐓𝐄/i.test(visibleLines[headingIndex])
    ) {
      visibleLines.splice(headingIndex, 1);
    }
    if (!insertedOperationsPlaceholder) {
      visibleLines.push('{{operations}}');
      insertedOperationsPlaceholder = true;
    }
  }

  return visibleLines.join('\n').replace(/\n{3,}/g, '\n\n');
};

export const prepareCustomerOrderTemplate = (template: string): string => {
  const normalizedLines = removeLegacyOperationSections(template)
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*\*{0,2}etapas do pedido:?\*{0,2}\s*$/i.test(line)) return '';
      if (/^\s*\*{0,2}vendedor:?\*{0,2}\s*$/i.test(line)) return '*Vendedor:*';
      if (/^\s*\*{0,2}itens:?\*{0,2}\s*$/i.test(line)) return '*Itens:*';
      const totalValueLine = line.match(
        /^(\s*)\*{0,2}valor total(?: da compra| do pedido)?:?\*{0,2}(.*)$/i
      );
      if (totalValueLine) return `${totalValueLine[1]}*Valor total da compra:*${totalValueLine[2]}`;
      if (/^\s*\*{0,2}pagamento:?\*{0,2}\s*$/i.test(line)) return '*Pagamento:*';
      return line;
    });

  if (!normalizedLines.some((line) => line.includes('{{operations}}'))) {
    const itemsPlaceholderIndex = normalizedLines.findIndex((line) => line.includes('{{items}}'));
    if (itemsPlaceholderIndex >= 0) {
      let insertIndex = itemsPlaceholderIndex;
      while (insertIndex > 0 && !normalizedLines[insertIndex - 1].trim()) insertIndex -= 1;
      if (insertIndex > 0 && /\*Itens:?\*/i.test(normalizedLines[insertIndex - 1])) insertIndex -= 1;
      normalizedLines.splice(insertIndex, 0, '{{operations}}');
    } else {
      normalizedLines.push('{{operations}}');
    }
  }

  return normalizedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};
