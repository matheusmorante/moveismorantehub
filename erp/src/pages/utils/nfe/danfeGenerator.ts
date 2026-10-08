import { formatToBRDate } from '../formatters';
import { formatAccessKey } from './nfeAccessKey';
import {
  DanfeData,
  getDanfeOfficialStyles,
  buildDanfeHeaderOfficialHtml,
  buildDanfeRecipientOfficialHtml,
  buildDanfeTaxesAndTotalsOfficialHtml,
  buildDanfeTransportOfficialHtml,
  buildDanfeItemsOfficialHtml,
  buildDanfeAdditionalInfoOfficialHtml,
} from './danfe';

export type { DanfeData };

/**
 * Gera o documento HTML do DANFE oficial A4 Retrato 100% conforme MOC 7.0 (Anexo II)
 */
export function generateDanfeHtml(data: DanfeData): string {
  const {
    order,
    settings,
    accessKey,
    nfeNumber,
    series,
    protocolNumber,
    protocolDate,
    model,
    environment,
  } = data;
  const isHomologacao = environment === 2;
  const fiscalDetails = data.fiscalDetails;
  const formattedKey = formatAccessKey(accessKey);
  const docTitle = model === '65' ? 'DANFE NFC-e' : 'DANFE NF-e';

  const amount = (value: string | undefined, fallback: number) =>
    value !== undefined && value !== '' ? Number(value) || 0 : fallback;
  const totalOrder = amount(
    fiscalDetails?.summary.invoiceTotal,
    Number(order.paymentsSummary?.totalOrderValue || 0)
  );
  const freight = amount(fiscalDetails?.summary.freight, Number(order.shipping?.value || 0));
  const discount = amount(
    fiscalDetails?.summary.discount,
    Number(order.itemsSummary?.totalFixedDiscount || 0)
  );
  const totalProd = amount(
    fiscalDetails?.summary.products,
    Math.max(0, totalOrder - freight + discount)
  );

  const dtEmi = formatToBRDate(fiscalDetails?.general.issueDate || new Date().toISOString());
  const dtSaida = formatToBRDate(fiscalDetails?.general.exitDate);
  const hrSaida =
    fiscalDetails?.general.exitDate?.match(/T(\d{2}:\d{2}(?::\d{2})?)/)?.[1] || '-';

  const styles = getDanfeOfficialStyles(isHomologacao);
  const headerHtml = buildDanfeHeaderOfficialHtml({
    settings,
    nfeNumber,
    series,
    formattedKey,
    protocolNumber,
    protocolDate,
    natOp:
      data.natOp ||
      fiscalDetails?.general.natureOperation ||
      'VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS',
    fiscalDetails,
  });
  const recipientHtml = buildDanfeRecipientOfficialHtml({
    order,
    isHomologacao,
    dtEmi,
    dtSaida,
    hrSaida,
    fiscalDetails,
  });
  const taxesAndTotalsHtml = buildDanfeTaxesAndTotalsOfficialHtml({
    totalOrder,
    totalProd,
    freight,
    discount,
    fiscalDetails,
  });
  const transportHtml = buildDanfeTransportOfficialHtml(order, fiscalDetails);
  const itemsTableHtml = buildDanfeItemsOfficialHtml(order, settings, fiscalDetails);
  const additionalInfoHtml = buildDanfeAdditionalInfoOfficialHtml(order, fiscalDetails);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${docTitle} - Nº ${nfeNumber}</title>
    <style>${styles}</style>
</head>
<body>
    <div class="no-print" style="width: 210mm; margin: 0 auto 8px; display: flex; justify-content: space-between; align-items: center;">
        <button onclick="window.print()" style="background: #1e293b; color: #fff; border: 1px solid #000; padding: 6px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">
            🖨️ Imprimir DANFE A4
        </button>
        <span style="font-size: 11px; font-weight: bold; color: #475569;">
            ${isHomologacao ? '⚠️ AMBIENTE DE HOMOLOGAÇÃO (TESTES)' : 'PRODUÇÃO'}
        </span>
    </div>

    <div class="danfe-a4">
        <div class="watermark-homologacao">
            ⚠️ NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL ⚠️
        </div>

        ${headerHtml}
        ${recipientHtml}
        ${taxesAndTotalsHtml}
        ${transportHtml}

        <!-- BLOCO 7: DADOS DO PRODUTO / SERVIÇOS -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
            <tr>
                <td style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    DADOS DOS PRODUTOS / SERVIÇOS
                </td>
            </tr>
        </table>
        ${itemsTableHtml}

        ${additionalInfoHtml}
    </div>
</body>
</html>`;
}

/**
 * Imprime o DANFE diretamente via agente local ou abre em uma nova janela para impressão/visualização.
 */
export function openDanfePrintWindow(data: DanfeData): void {
  import('../printing/printService')
    .then(({ printDanfe }) => {
      printDanfe(data).catch(() => {
        fallbackDanfeWindow(data);
      });
    })
    .catch(() => {
      fallbackDanfeWindow(data);
    });
}

function fallbackDanfeWindow(data: DanfeData): void {
  const html = generateDanfeHtml(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export * from './danfe';
