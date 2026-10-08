import Order from '@/pages/types/order.type';
import { AppSettings } from '../../settingsService';
import { formatCurrency } from '../../formatters';
import type { ParsedFiscalDetails } from '@/pages/App/FiscalDocuments/types/fiscalDocuments.types';
import { escapeDanfeHtml, formatDanfeDecimal, formatDanfeMoney } from './danfeHtmlUtils';

export function buildDanfeItemsOfficialHtml(
  order: Order,
  settings: AppSettings,
  fiscalDetails?: ParsedFiscalDetails
): string {
  const itemsRows = fiscalDetails
    ? fiscalDetails.items
        .map(
          (item) => `
            <tr>
                <td style="text-align:center;">${escapeDanfeHtml(item.code) || '&nbsp;'}</td>
                <td style="text-align:left;">${escapeDanfeHtml(item.description)}</td>
                <td style="text-align:center;">${escapeDanfeHtml(item.ncm) || '&nbsp;'}</td>
                <td style="text-align:center;">${escapeDanfeHtml(item.cst) || '&nbsp;'}</td>
                <td style="text-align:center;">${escapeDanfeHtml(item.cfop) || '&nbsp;'}</td>
                <td style="text-align:center;">${escapeDanfeHtml(item.unit) || '&nbsp;'}</td>
                <td style="text-align:right;">${formatDanfeDecimal(item.quantity)}</td>
                <td style="text-align:right;">${formatDanfeDecimal(item.unitValue)}</td>
                <td style="text-align:right;">${formatDanfeMoney(item.total)}</td>
                <td style="text-align:right;">${formatDanfeMoney(item.icmsBase)}</td>
                <td style="text-align:right;">${formatDanfeMoney(item.icmsValue)}</td>
                <td style="text-align:right;">${formatDanfeMoney(item.ipiValue)}</td>
                <td style="text-align:right;">${formatDanfeDecimal(item.icmsRate)}</td>
                <td style="text-align:right;">${formatDanfeDecimal(item.ipiRate)}</td>
            </tr>
        `
        )
        .join('')
    : (order.items || [])
    .map((item, idx) => {
      const itemIndex = idx + 1;
      const cProd = escapeDanfeHtml(item.code || item.productId || String(itemIndex).padStart(4, '0'));
      const qCom = item.quantity || 1;
      const vUnCom = Number(item.unitPrice || 0);
      const itemDiscount = Number(item.unitDiscount || 0) * qCom;
      const vProd = qCom * vUnCom - itemDiscount;
      const fiscal = (item as any).fiscal || (settings as any).fiscalDefaults || {};
      const ncm = (item as any).fiscal?.ncm || '—';
      const cst = fiscal.cst || '—';
      const cfop = fiscal.cfop || '5102';

      return `
            <tr>
                <td style="text-align:center;">${cProd}</td>
                <td style="text-align:left;">${escapeDanfeHtml(item.description)}</td>
                <td style="text-align:center;">${escapeDanfeHtml(ncm)}</td>
                <td style="text-align:center;">${escapeDanfeHtml(cst)}</td>
                <td style="text-align:center;">${escapeDanfeHtml(cfop)}</td>
                <td style="text-align:center;">UN</td>
                <td style="text-align:right;">${qCom.toFixed(2)}</td>
                <td style="text-align:right;">${formatCurrency(vUnCom).replace('R$', '').trim()}</td>
                <td style="text-align:right;">${formatCurrency(vProd).replace('R$', '').trim()}</td>
                <td style="text-align:right;">0,00</td>
                <td style="text-align:right;">0,00</td>
                <td style="text-align:right;">0,00</td>
                <td style="text-align:right;">0,00</td>
                <td style="text-align:right;">0,00</td>
            </tr>
        `;
    })
    .join('');

  return `
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 7%;">CÓDIGO</th>
                    <th style="width: 29%;">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                    <th style="width: 7%;">NCM/SH</th>
                    <th style="width: 4%;">CST</th>
                    <th style="width: 4%;">CFOP</th>
                    <th style="width: 4%;">UNID</th>
                    <th style="width: 5%;">QTD.</th>
                    <th style="width: 7%;">V. UNIT.</th>
                    <th style="width: 7%;">V. TOTAL</th>
                    <th style="width: 6%;">BC ICMS</th>
                    <th style="width: 6%;">V. ICMS</th>
                    <th style="width: 5%;">V. IPI</th>
                    <th style="width: 4.5%;">% ICMS</th>
                    <th style="width: 4.5%;">% IPI</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows}
            </tbody>
        </table>
    `;
}
