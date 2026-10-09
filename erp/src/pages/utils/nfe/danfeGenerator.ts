import { formatToBRDate } from '../formatters';
import { formatAccessKey } from './nfeAccessKey';
import bwipjs from 'bwip-js';
import { escapeDanfeHtml } from './danfe/danfeHtmlUtils';
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
  if (data.model === '65') return generateDanfeNfceHtml(data);
  const {
    order,
    settings,
    accessKey,
    nfeNumber,
    series,
    protocolNumber,
    protocolDate,
    environment,
  } = data;
  const isHomologacao = environment === 2;
  const fiscalDetails = data.fiscalDetails;
  const formattedKey = formatAccessKey(accessKey);
  const docTitle = 'DANFE NF-e';

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

function generateDanfeNfceHtml(data: DanfeData): string {
  const { fiscalDetails, accessKey, nfeNumber, series, protocolNumber, protocolDate } = data;
  const issuerName = fiscalDetails?.issuer.name || data.settings.companyName || '';
  const recipientName = fiscalDetails?.recipient.name || 'Consumidor não identificado';
  const qrCode = fiscalDetails?.general.qrCode || '';
  let qrSvg = '';
  if (qrCode) {
    try {
      const toSVG = (bwipjs as unknown as { toSVG: (options: Record<string, unknown>) => string }).toSVG;
      qrSvg = toSVG({ bcid: 'qrcode', text: qrCode, scale: 5, padding: 1 });
    } catch {
      qrSvg = '';
    }
  }
  const formatCurrency = (raw: string) => {
    const value = Number(String(raw || '').replace(',', '.'));
    return Number.isFinite(value)
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
      : escapeDanfeHtml(raw);
  };
  const homologationDescription =
    'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';
  const items = (fiscalDetails?.items || []).map((item) => {
    const displayDescription =
      item.description === homologationDescription && item.additionalInfo
        ? item.additionalInfo
        : item.description;
    return `
    <div class="item">
      <div class="item-name">${escapeDanfeHtml(displayDescription)}</div>
      <div class="item-code">Código: ${escapeDanfeHtml(item.code)}</div>
      <div class="item-values"><span>${escapeDanfeHtml(item.quantity)} ${escapeDanfeHtml(item.unit)} × ${formatCurrency(item.unitValue)}</span><strong>${formatCurrency(item.total)}</strong></div>
    </div>`;
  }).join('');
  const key = accessKey.replace(/\D/g, '');
  const formattedKey = key.replace(/(.{4})/g, '$1 ').trim();
  const total = fiscalDetails?.general.total || fiscalDetails?.summary.invoiceTotal || '';
  const issueDate = formatToBRDate(fiscalDetails?.general.issueDate || '');
  const payments = (fiscalDetails?.payments || [])
    .map((payment) => `<div class="payment"><span>${escapeDanfeHtml(payment.method)}</span><span>${formatCurrency(payment.value)}</span></div>`)
    .join('');
  const change = fiscalDetails?.changeValue
    ? `<div class="payment"><span>Troco</span><span>${formatCurrency(fiscalDetails.changeValue)}</span></div>`
    : '';
  const estimatedTaxes = fiscalDetails?.totals
    .filter((entry) => entry.isTaxDetail)
    .map((entry) => `${escapeDanfeHtml(entry.label)}: ${formatCurrency(entry.value)}`)
    .join(' · ');
  const protocol = protocolNumber
    ? `<div class="protocol">Protocolo de autorização: ${escapeDanfeHtml(protocolNumber)}${protocolDate ? ` · ${escapeDanfeHtml(protocolDate)}` : ''}</div>`
    : '';
  const css = `
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; font: 12px Arial, sans-serif; }
    .no-print { width: 72mm; margin: 0 auto 8px; display:flex; justify-content:space-between; align-items:center; }
    .danfe-nfce { width: 72mm; margin: 0 auto; padding: 2mm; }
    .center { text-align:center; }
    .issuer { font-size:15px; font-weight:bold; text-transform:uppercase; }
    .heading { margin: 10px 0 4px; font-weight:bold; font-size:14px; }
    .subheading { margin-bottom:8px; font-size:11px; }
    .rule { border-top:1px dashed #333; margin:7px 0; }
    .item { padding:5px 0; border-bottom:1px dashed #999; }
    .item-name { font-weight:bold; }
    .item-code { font-size:10px; color:#444; margin-top:2px; }
    .item-extra { margin-top:2px; color:#333; }
    .item-values { display:flex; justify-content:space-between; margin-top:3px; }
    .total { display:flex; justify-content:space-between; font-size:15px; font-weight:bold; margin:8px 0; }
    .payment { display:flex; justify-content:space-between; margin:3px 0; }
    .taxes { font-size:10px; margin-top:6px; }
    .key { overflow-wrap:anywhere; font-size:10px; }
    .qr { width:48mm; height:48mm; margin:8px auto; display:block; }
    .protocol { font-size:10px; margin-top:5px; }
    .homologation { border:1px dashed #b91c1c; color:#b91c1c; padding:5px; margin-bottom:8px; text-align:center; font-weight:bold; }
    @media print { .no-print { display:none; } .danfe-nfce { width:72mm; } }
  `;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>DANFE NFC-e - Nº ${nfeNumber}</title><style>${css}</style></head><body>
    <div class="no-print"><button onclick="window.print()">Imprimir NFC-e</button><strong>${data.environment === 2 ? 'HOMOLOGAÇÃO' : 'PRODUÇÃO'}</strong></div>
    <main class="danfe-nfce">
      ${data.environment === 2 ? '<div class="homologation">NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL</div>' : ''}
      <header class="center"><div class="issuer">${escapeDanfeHtml(issuerName)}</div><div>${escapeDanfeHtml(fiscalDetails?.issuer.street || '')}${fiscalDetails?.issuer.number ? `, ${escapeDanfeHtml(fiscalDetails.issuer.number)}` : ''}</div><div>${escapeDanfeHtml(fiscalDetails?.issuer.municipality || '')}${fiscalDetails?.issuer.state ? ` - ${escapeDanfeHtml(fiscalDetails.issuer.state)}` : ''}</div><div>CNPJ: ${escapeDanfeHtml(fiscalDetails?.issuer.taxId || data.settings.companyCnpj || '')}</div></header>
      <div class="rule"></div><div class="center heading">DANFE NFC-e · Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</div>
      <div class="center subheading">Nº ${nfeNumber} · Série ${escapeDanfeHtml(series)} · ${escapeDanfeHtml(issueDate)}</div>
      <div>CONSUMIDOR: ${escapeDanfeHtml(recipientName)}</div>
      ${items}<div class="total"><span>VALOR TOTAL</span><span>${formatCurrency(total)}</span></div>
      <div class="rule"></div><strong>FORMA DE PAGAMENTO</strong>${payments}${change}
      ${estimatedTaxes ? `<div class="taxes">${estimatedTaxes}</div>` : ''}
      <div>Consulte pela chave de acesso:</div><div class="key">${escapeDanfeHtml(formattedKey)}</div>
      ${qrSvg ? `<div class="center">Consulta via QR Code</div>${qrSvg.replace('<svg ', '<svg class="qr" ')}` : '<div class="center">QR Code da consulta indisponível no XML armazenado.</div>'}
      ${protocol}<div class="center" style="margin-top:8px">Obrigado pela preferência</div>
    </main></body></html>`;
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
