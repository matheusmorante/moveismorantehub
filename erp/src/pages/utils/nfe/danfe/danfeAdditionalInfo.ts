import Order from '@/pages/types/order.type';
import type { ParsedFiscalDetails } from '@/pages/App/FiscalDocuments/types/fiscalDocuments.types';
import { escapeDanfeHtml } from './danfeHtmlUtils';

/**
 * Constrói o BLOCO 8: DADOS ADICIONAIS / RESERVADO AO FISCO do DANFE oficial A4.
 */
export function buildDanfeAdditionalInfoOfficialHtml(
  order: Order,
  fiscalDetails?: ParsedFiscalDetails
): string {
  const orderIdentifier = order.orderIndex || order.id;
  const observationText = order.observation ? `Observações do Pedido: ${order.observation}` : '';
  const complementaryInfo = fiscalDetails
    ? escapeDanfeHtml(fiscalDetails.general.additionalInfo).replace(/\r?\n/g, '<br>') || '&nbsp;'
    : `<strong>DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL.</strong><br>
                    NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI / ICMS.<br>
                    Referente ao Pedido de Venda #${escapeDanfeHtml(orderIdentifier)}.<br>
                    ${escapeDanfeHtml(observationText)}`;
  const reservedForTaxAuthority = fiscalDetails
    ? escapeDanfeHtml(fiscalDetails.general.taxAuthorityInfo).replace(/\r?\n/g, '<br>') || '&nbsp;'
    : '&nbsp;';

  return `
        <!-- BLOCO 8: DADOS ADICIONAIS / RESERVADO AO FISCO -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 3px;">
            <tr>
                <td colspan="2" class="danfe-section-heading">
                    DADOS ADICIONAIS
                </td>
            </tr>
            <tr>
                <td style="width: 70%; border: 1px solid #000; padding: 4px; font-size: 7.5px; vertical-align: top; line-height: 1.25;">
                    <div class="box-title">INFORMAÇÕES COMPLEMENTARES</div>
                    ${complementaryInfo}
                </td>
                <td style="width: 30%; border: 1px solid #000; padding: 4px; font-size: 7.5px; vertical-align: top;">
                    <div class="box-title">RESERVADO AO FISCO</div>
                    ${reservedForTaxAuthority}
                </td>
            </tr>
        </table>
    `;
}
