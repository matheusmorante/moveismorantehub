import { formatCurrency, formatToBRDate } from '../../formatters';
import type { ParsedFiscalDetails } from '@/pages/App/FiscalDocuments/types/fiscalDocuments.types';
import { escapeDanfeHtml, formatDanfeMoney } from './danfeHtmlUtils';

export interface DanfeTaxesAndTotalsParams {
  totalOrder: number;
  totalProd: number;
  freight: number;
  discount: number;
  fiscalDetails?: ParsedFiscalDetails;
}

/**
 * Constrói os BLOCOS 4 (FATURA/DUPLICATAS) e 5 (CÁLCULO DO IMPOSTO) do DANFE oficial A4.
 */
export function buildDanfeTaxesAndTotalsOfficialHtml(params: DanfeTaxesAndTotalsParams): string {
  const { totalOrder, totalProd, freight, discount, fiscalDetails } = params;
  const summary = fiscalDetails?.summary;

  const amount = (value: string | undefined, fallback: number) =>
    formatDanfeMoney(value !== undefined ? value : fallback);
  const formattedTotalProd = amount(summary?.products, totalProd);
  const formattedFreight = amount(summary?.freight, freight);
  const formattedInsurance = amount(summary?.insurance, 0);
  const formattedDiscount = amount(summary?.discount, discount);
  const formattedOtherExpenses = amount(summary?.otherExpenses, 0);
  const formattedIcmsBase = amount(summary?.icmsBase, 0);
  const formattedIcmsValue = amount(summary?.icmsValue, 0);
  const formattedIcmsSubstitutionBase = amount(summary?.icmsSubstitutionBase, 0);
  const formattedIcmsSubstitutionValue = amount(summary?.icmsSubstitutionValue, 0);
  const formattedIpiValue = amount(summary?.ipiValue, 0);
  const billingText = fiscalDetails
    ? [
        fiscalDetails.billing?.number ? `Fatura: ${fiscalDetails.billing.number}` : '',
        fiscalDetails.billing?.originalValue
          ? `Original: R$ ${formatDanfeMoney(fiscalDetails.billing.originalValue)}`
          : '',
        fiscalDetails.billing?.discount
          ? `Desconto: R$ ${formatDanfeMoney(fiscalDetails.billing.discount)}`
          : '',
        fiscalDetails.billing?.netValue
          ? `Líquido: R$ ${formatDanfeMoney(fiscalDetails.billing.netValue)}`
          : '',
        ...(fiscalDetails.installments || []).map(
          (installment) =>
            `${installment.number || 'Parcela'} · Venc. ${formatToBRDate(installment.dueDate)} · R$ ${formatDanfeMoney(installment.value)}`
        ),
      ]
        .filter(Boolean)
        .map(escapeDanfeHtml)
        .join(' &bull; ') || '&nbsp;'
    : `PAGAMENTO À VISTA / CONFORME COMPROVANTE &bull; VALOR: <strong>${formatCurrency(totalOrder)}</strong>`;

  return `
        <!-- BLOCO 4: FATURA / DUPLICATAS -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
            <tr>
                <td style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    FATURA / DUPLICATAS
                </td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 2px 4px; font-size: 7.5px;">
                    ${billingText}
                </td>
            </tr>
        </table>

        <!-- BLOCO 5: CÁLCULO DO IMPOSTO -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
            <tr>
                <td colspan="5" style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    CÁLCULO DO IMPOSTO
                </td>
            </tr>
            <tr>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">BASE DE CÁLCULO DO ICMS</div>
                    <div class="box-value text-right">${formattedIcmsBase}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO ICMS</div>
                    <div class="box-value text-right">${formattedIcmsValue}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">BASE CÁLC. ICMS SUBST.</div>
                    <div class="box-value text-right">${formattedIcmsSubstitutionBase}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO ICMS SUBST.</div>
                    <div class="box-value text-right">${formattedIcmsSubstitutionValue}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR TOTAL DOS PRODUTOS</div>
                    <div class="box-value text-right">${formattedTotalProd}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO FRETE</div>
                    <div class="box-value text-right">${formattedFreight}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO SEGURO</div>
                    <div class="box-value text-right">${formattedInsurance}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">DESCONTO</div>
                    <div class="box-value text-right">${formattedDiscount}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">OUTRAS DESPESAS ACESS.</div>
                    <div class="box-value text-right">${formattedOtherExpenses}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR TOTAL DO IPI</div>
                    <div class="box-value text-right">${formattedIpiValue}</div>
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #000; padding: 1px 3px; background: #fafafa;">
                    &nbsp;
                </td>
                <td style="border: 1px solid #000; padding: 1px 3px; background: #e2e8f0;">
                    <div class="box-title font-black">VALOR TOTAL DA NOTA</div>
                    <div class="box-value text-right font-black" style="font-size:10px;">${formatCurrency(summary?.invoiceTotal !== undefined && summary.invoiceTotal !== '' ? Number(summary.invoiceTotal) : totalOrder)}</div>
                </td>
            </tr>
        </table>
    `;
}
