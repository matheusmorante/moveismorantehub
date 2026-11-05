import type { ParsedFiscalItem } from '@/pages/App/FiscalDocuments/types/fiscalDocuments.types';
import { escapeDanfeHtml } from './danfeHtmlUtils';

const HOMOLOGATION_DESCRIPTION = 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';

/** Formata valores para exibição em moeda brasileira (R$ 0,00). */
export function formatDanfeNfceA4Currency(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null || raw === '') return 'R$ 0,00';
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(num)) return escapeDanfeHtml(String(raw));
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export function buildDanfeNfceA4ItemTable(items: ParsedFiscalItem[]) {
  const hasNcm = items.some((item) => Boolean(item.ncm?.trim()));
  const hasCfop = items.some((item) => Boolean(item.cfop?.trim()));
  const itemColumnWidths = hasNcm && hasCfop
    ? ['4%', '11%', '34%', '8%', '7%', '7%', '5%', '12%', '12%']
    : hasNcm || hasCfop
      ? ['4%', '12%', '39%', '9%', '8%', '6%', '11%', '11%']
      : ['4%', '13%', '48%', '8%', '6%', '11%', '10%'];
  const itemsColumnCount = 7 + Number(hasNcm) + Number(hasCfop);
  const itemsHtml = items
    .map((item, index) => {
      const displayDescription =
        item.description === HOMOLOGATION_DESCRIPTION && item.additionalInfo
          ? item.additionalInfo
          : item.description;

      const quantity = item.quantity || '1';
      const unit = item.unit || 'UN';
      const unitVal = formatDanfeNfceA4Currency(item.unitValue);
      const totalVal = formatDanfeNfceA4Currency(item.total);

      return `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td class="text-mono">${escapeDanfeHtml(item.code || '-')}</td>
          <td>
            <div class="item-name">${escapeDanfeHtml(displayDescription)}</div>
            ${item.additionalInfo && item.description !== HOMOLOGATION_DESCRIPTION ? `<div class="item-extra">${escapeDanfeHtml(item.additionalInfo)}</div>` : ''}
          </td>
          ${hasNcm ? `<td class="text-center text-mono">${escapeDanfeHtml(item.ncm || '-')}</td>` : ''}
          ${hasCfop ? `<td class="text-center text-mono">${escapeDanfeHtml(item.cfop || '-')}</td>` : ''}
          <td class="text-center">${escapeDanfeHtml(quantity)}</td>
          <td class="text-center">${escapeDanfeHtml(unit)}</td>
          <td class="text-right">${unitVal}</td>
          <td class="text-right font-bold">${totalVal}</td>
        </tr>
      `;
    })
    .join('');

  return { hasNcm, hasCfop, itemColumnWidths, itemsColumnCount, itemsHtml };
}
