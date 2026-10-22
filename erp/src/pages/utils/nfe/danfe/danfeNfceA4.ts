import bwipjs from 'bwip-js';
import { formatToBRDate } from '../../formatters';
import { formatAccessKey } from '../nfeAccessKey';
import { escapeDanfeHtml } from './danfeHtmlUtils';
import type { DanfeData } from './danfe.types';

const SEFAZ_PR_NFCE_CONSULTA_URL = 'http://www.fazenda.pr.gov.br/nfce/consulta';

/**
 * Formata um valor numérico ou string como moeda brasileira (R$ 0,00).
 */
function formatCurrency(raw: string | number | undefined | null): string {
  if (raw === undefined || raw === null || raw === '') return 'R$ 0,00';
  const num = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(num)) return escapeDanfeHtml(String(raw));
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

/**
 * Formata CPF ou CNPJ para exibição visual.
 */
function formatDocumentId(doc: string | undefined): string {
  if (!doc) return 'Consumidor não identificado';
  const clean = doc.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return escapeDanfeHtml(doc);
}

/**
 * Formata CEP (00000-000).
 */
function formatPostalCode(cep: string | undefined): string {
  if (!cep) return '';
  const clean = cep.replace(/\D/g, '');
  if (clean.length === 8) {
    return clean.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return escapeDanfeHtml(cep);
}

/**
 * Gera o SVG do QR Code em alta definição usando bwip-js.
 */
function generateQrCodeSvg(qrCodeText: string): string {
  if (!qrCodeText) return '';
  try {
    const toSVG = (bwipjs as unknown as { toSVG: (options: Record<string, unknown>) => string }).toSVG;
    return toSVG({
      bcid: 'qrcode',
      text: qrCodeText,
      scale: 4,
      padding: 0,
    });
  } catch {
    return '';
  }
}

/**
 * Gera o documento HTML do DANFE NFC-e (modelo 65) em formato A4 Retrato,
 * estritamente em conformidade com o Manual de Especificações Técnicas do DANFE NFC-e e QR Code v6.0.
 */
export function generateDanfeNfceA4Html(data: DanfeData): string {
  const { fiscalDetails, accessKey, nfeNumber, series, protocolNumber, protocolDate, environment, settings } = data;
  const isHomologacao = environment === 2;

  // Emitente
  const issuerName = fiscalDetails?.issuer.name || settings.companyName || 'MÓVEIS MORANTE LTDA';
  const issuerCnpj = fiscalDetails?.issuer.taxId || settings.companyCnpj || '';
  const issuerIe = fiscalDetails?.issuer.stateRegistration || settings.companyIe || '';
  const issuerStreet = fiscalDetails?.issuer.street || '';
  const issuerNumber = fiscalDetails?.issuer.number || '';
  const issuerComplement = fiscalDetails?.issuer.complement || '';
  const issuerDistrict = fiscalDetails?.issuer.district || '';
  const issuerCity = fiscalDetails?.issuer.municipality || 'Colombo';
  const issuerState = fiscalDetails?.issuer.state || 'PR';
  const issuerCep = fiscalDetails?.issuer.postalCode || '';
  const issuerPhone = fiscalDetails?.issuer.phone || '';

  // Endereço completo formatado
  const addressParts: string[] = [];
  if (issuerStreet) {
    addressParts.push(`${issuerStreet}${issuerNumber ? `, ${issuerNumber}` : ''}${issuerComplement ? ` - ${issuerComplement}` : ''}`);
  }
  if (issuerDistrict) addressParts.push(issuerDistrict);
  if (issuerCity) addressParts.push(`${issuerCity} - ${issuerState}`);
  if (issuerCep) addressParts.push(`CEP: ${formatPostalCode(issuerCep)}`);
  if (issuerPhone) addressParts.push(`Fone: ${issuerPhone}`);
  const issuerFullAddress = addressParts.join(' · ');

  // Datas
  const issueDateRaw = fiscalDetails?.general.issueDate || '';
  const formattedIssueDate = formatToBRDate(issueDateRaw);
  const issueTime = issueDateRaw.match(/T(\d{2}:\d{2}(?::\d{2})?)/)?.[1] || '';
  const issueDateTimeStr = issueTime ? `${formattedIssueDate} às ${issueTime}` : formattedIssueDate;

  // Itens
  const homologationDescription = 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';
  const rawItems = fiscalDetails?.items || [];
  const itemsHtml = rawItems
    .map((item, index) => {
      const displayDescription =
        item.description === homologationDescription && item.additionalInfo
          ? item.additionalInfo
          : item.description;

      const ncm = item.ncm || '-';
      const quantity = item.quantity || '1';
      const unit = item.unit || 'UN';
      const unitVal = formatCurrency(item.unitValue);
      const totalVal = formatCurrency(item.total);

      return `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td class="text-mono">${escapeDanfeHtml(item.code || '-')}</td>
          <td>
            <div class="item-name">${escapeDanfeHtml(displayDescription)}</div>
            ${item.additionalInfo && item.description !== homologationDescription ? `<div class="item-extra">${escapeDanfeHtml(item.additionalInfo)}</div>` : ''}
          </td>
          <td class="text-center text-mono">${escapeDanfeHtml(ncm)}</td>
          <td class="text-center">${escapeDanfeHtml(quantity)}</td>
          <td class="text-center">${escapeDanfeHtml(unit)}</td>
          <td class="text-right">${unitVal}</td>
          <td class="text-right font-bold">${totalVal}</td>
        </tr>
      `;
    })
    .join('');

  // Totais
  const totalItemsCount = rawItems.length;
  const productsTotal = fiscalDetails?.summary.products || fiscalDetails?.general.total || '';
  const discountTotal = fiscalDetails?.summary.discount || '';
  const freightTotal = fiscalDetails?.summary.freight || '';
  const otherExpenses = fiscalDetails?.summary.otherExpenses || '';
  const invoiceTotal = fiscalDetails?.general.total || fiscalDetails?.summary.invoiceTotal || productsTotal;

  // Pagamentos
  const payments = fiscalDetails?.payments || [];
  const paymentsHtml = payments
    .map((payment) => `
      <div class="payment-row">
        <span>${escapeDanfeHtml(payment.method)}</span>
        <span class="font-bold">${formatCurrency(payment.value)}</span>
      </div>
    `)
    .join('');

  const changeValue = fiscalDetails?.changeValue;
  const changeHtml = changeValue
    ? `
      <div class="payment-row change-row">
        <span>Troco</span>
        <span class="font-bold">${formatCurrency(changeValue)}</span>
      </div>
    `
    : '';

  // Tributos incidentes (Lei 12.741/2012)
  const estimatedTaxesEntry = fiscalDetails?.totals.find((entry) => entry.label.toLowerCase().includes('tributos')) ||
    fiscalDetails?.totals.find((entry) => entry.isTaxDetail);
  const estimatedTaxesText = estimatedTaxesEntry
    ? `Informação dos Tributos Totais Incidentes (Lei Federal 12.741/2012): ${formatCurrency(estimatedTaxesEntry.value)}`
    : fiscalDetails?.totals
        .filter((entry) => entry.isTaxDetail)
        .map((entry) => `${escapeDanfeHtml(entry.label)}: ${formatCurrency(entry.value)}`)
        .join(' · ');

  // Consumidor
  const recipientName = fiscalDetails?.recipient.name || 'Consumidor não identificado';
  const recipientTaxId = fiscalDetails?.recipient.taxId || '';
  const isConsumerIdentified = Boolean(recipientTaxId || (recipientName && recipientName !== 'Consumidor não identificado' && recipientName !== 'Consumidor Final'));

  // QR Code
  const qrCodeText = fiscalDetails?.general.qrCode || '';
  const qrSvg = generateQrCodeSvg(qrCodeText);

  // Chave de acesso e consulta
  const formattedKey = formatAccessKey(accessKey);
  const sefazUrl = SEFAZ_PR_NFCE_CONSULTA_URL;

  // Protocolo
  const protocolText = protocolNumber
    ? `Protocolo de Autorização: ${escapeDanfeHtml(protocolNumber)}${protocolDate ? ` · ${escapeDanfeHtml(protocolDate)}` : ''}`
    : 'Protocolo de autorização não informado';

  // Informações complementares
  const complementaryInfo = fiscalDetails?.general.additionalInfo || '';

  // CSS A4 Oficial
  const css = `
    @page {
      size: 210mm 297mm portrait;
      margin: 8mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
    }
    .no-print {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto 10px;
      padding: 10px 16px;
      background: #1e293b;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .no-print-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .btn-print {
      background: #2563eb;
      color: #fff;
      border: 1px solid #1d4ed8;
      padding: 7px 18px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }
    .btn-close {
      background: transparent;
      color: #94a3b8;
      border: 1px solid #475569;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .btn-close:hover {
      color: #fff;
      border-color: #cbd5e1;
    }
    .env-tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 4px;
    }
    .env-tag.homolog {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #f59e0b;
    }
    .env-tag.prod {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #22c55e;
    }
    .danfe-nfce-a4 {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 12mm 14mm;
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      box-sizing: border-box;
    }
    .homologation-stripe {
      background: #fff1f2;
      border: 2px dashed #e11d48;
      color: #be123c;
      padding: 8px 12px;
      text-align: center;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    .issuer-header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 2px solid #0f172a;
    }
    .issuer-title {
      font-size: 17px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .issuer-data {
      font-size: 10.5px;
      color: #334155;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .issuer-address {
      font-size: 10px;
      color: #64748b;
    }
    .doc-identification {
      text-align: center;
      padding: 8px 0;
      border-bottom: 1px solid #cbd5e1;
    }
    .doc-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #0f172a;
    }
    .doc-subtitle {
      font-size: 10px;
      font-weight: 600;
      color: #475569;
      font-style: italic;
      margin-top: 1px;
    }
    .doc-meta {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 4px;
    }
    .section-title {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e293b;
      margin-top: 8px;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 2px;
      page-break-inside: auto;
    }
    table.items-table thead {
      display: table-header-group;
    }
    table.items-table th {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      font-size: 9.5px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
    }
    table.items-table td {
      border: 1px solid #e2e8f0;
      padding: 4px 6px;
      color: #1e293b;
      vertical-align: top;
    }
    table.items-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.items-table tr:nth-child(even) {
      background: #fafafa;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .item-name {
      font-weight: 700;
      color: #0f172a;
    }
    .item-extra {
      font-size: 9px;
      color: #64748b;
      margin-top: 1px;
    }
    .totals-payment-container {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }
    .totals-panel {
      flex: 1.2;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 10px;
      background: #ffffff;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 10.5px;
      color: #334155;
    }
    .totals-highlight {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      padding: 6px 8px;
      background: #f8fafc;
      border: 1.5px solid #0f172a;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
    }
    .payments-panel {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 8px 10px;
      background: #ffffff;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 10.5px;
      color: #334155;
      border-bottom: 1px dashed #e2e8f0;
    }
    .payment-row:last-child {
      border-bottom: none;
    }
    .change-row {
      color: #0f172a;
      font-weight: 700;
    }
    .taxes-banner {
      margin-top: 6px;
      padding: 4px 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 9.5px;
      color: #475569;
      text-align: center;
      font-style: italic;
    }
    .consultation-card {
      display: flex;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-top: 8px;
      background: #ffffff;
      overflow: hidden;
    }
    .consultation-info {
      flex: 1;
      padding: 10px 12px;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .consumer-block {
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .consumer-title {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
    }
    .consumer-name {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .consumer-doc {
      font-size: 10px;
      color: #334155;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .key-block {
      margin-bottom: 6px;
    }
    .key-label {
      font-size: 9.5px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
    }
    .key-url {
      font-size: 9.5px;
      color: #2563eb;
      word-break: break-all;
    }
    .key-value {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 5px 8px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      margin-top: 3px;
      text-align: center;
      color: #0f172a;
      overflow-wrap: anywhere;
    }
    .protocol-meta {
      font-size: 9.5px;
      font-weight: 600;
      color: #475569;
      margin-top: 4px;
    }
    .consultation-qr {
      width: 170px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fafafa;
    }
    .qr-title {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
      margin-bottom: 4px;
      text-align: center;
    }
    .qr-svg-wrapper {
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      padding: 4px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
    }
    .qr-svg-wrapper svg {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .qr-caption {
      font-size: 8.5px;
      color: #64748b;
      text-align: center;
      margin-top: 4px;
      line-height: 1.2;
    }
    .additional-info-section {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      margin-top: 8px;
      padding: 6px 10px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .additional-info-title {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #1e293b;
      margin-bottom: 3px;
    }
    .additional-info-content {
      font-size: 9.5px;
      color: #334155;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      line-height: 1.35;
    }
    .doc-footer {
      text-align: center;
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #cbd5e1;
      font-size: 9px;
      color: #64748b;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .no-print {
        display: none !important;
      }
      .danfe-nfce-a4 {
        width: 100% !important;
        max-width: none !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }
      .totals-highlight {
        border-color: #000000 !important;
        background: #f8fafc !important;
      }
      .key-value {
        background: #f1f5f9 !important;
      }
      .qr-svg-wrapper {
        border-color: #94a3b8 !important;
      }
    }
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DANFE NFC-e - Nº ${nfeNumber} (A4)</title>
  <style>${css}</style>
</head>
<body>
  <div class="no-print">
    <div class="no-print-actions">
      <button type="button" class="btn-print" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
          <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/>
        </svg>
        Imprimir DANFE NFC-e (A4)
      </button>
      <button type="button" class="btn-close" onclick="window.close()">Fechar</button>
    </div>
    <div>
      <span class="env-tag ${isHomologacao ? 'homolog' : 'prod'}">
        ${isHomologacao ? '⚠️ AMBIENTE DE HOMOLOGAÇÃO (TESTES)' : 'PRODUÇÃO'}
      </span>
    </div>
  </div>

  <main class="danfe-nfce-a4">
    ${isHomologacao ? '<div class="homologation-stripe">NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL</div>' : ''}

    <!-- DIVISÃO I: IDENTIFICAÇÃO DO EMITENTE -->
    <header class="issuer-header">
      <div class="issuer-title">${escapeDanfeHtml(issuerName)}</div>
      <div class="issuer-data">
        CNPJ: ${escapeDanfeHtml(issuerCnpj)} ${issuerIe ? ` · Inscrição Estadual: ${escapeDanfeHtml(issuerIe)}` : ''}
      </div>
      ${issuerFullAddress ? `<div class="issuer-address">${escapeDanfeHtml(issuerFullAddress)}</div>` : ''}
    </header>

    <!-- DIVISÃO II: IDENTIFICAÇÃO DO DOCUMENTO FISCAL -->
    <div class="doc-identification">
      <div class="doc-title">DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</div>
      <div class="doc-subtitle">Não permite aproveitamento de crédito de ICMS</div>
      <div class="doc-meta">
        NFC-e nº ${nfeNumber} · Série ${escapeDanfeHtml(series || '1')} · Emissão: ${escapeDanfeHtml(issueDateTimeStr)}
      </div>
    </div>

    <!-- DIVISÃO III: ITENS DA VENDA -->
    <div class="section-title">Dados dos Produtos / Serviços</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th style="width: 12%;">Código</th>
          <th style="width: 44%;">Descrição do Produto / Serviço</th>
          <th style="width: 10%;">NCM</th>
          <th style="width: 6%;">Qtd.</th>
          <th style="width: 5%;">UN</th>
          <th style="width: 9%; text-align: right;">Vl. Unit.</th>
          <th style="width: 10%; text-align: right;">Vl. Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="8" class="text-center">Nenhum item informado.</td></tr>'}
      </tbody>
    </table>

    <!-- DIVISÃO IV & V: TOTAIS E FORMAS DE PAGAMENTO -->
    <div class="totals-payment-container avoid-break">
      <section class="totals-panel">
        <div class="section-title" style="margin-top: 0; margin-bottom: 4px;">Totais da Venda</div>
        <div class="totals-row">
          <span>Qtd. Total de Itens:</span>
          <span class="font-bold">${totalItemsCount}</span>
        </div>
        <div class="totals-row">
          <span>Valor dos Produtos:</span>
          <span>${formatCurrency(productsTotal)}</span>
        </div>
        ${discountTotal && Number(discountTotal) > 0 ? `
          <div class="totals-row">
            <span>Desconto:</span>
            <span>- ${formatCurrency(discountTotal)}</span>
          </div>
        ` : ''}
        ${freightTotal && Number(freightTotal) > 0 ? `
          <div class="totals-row">
            <span>Frete:</span>
            <span>${formatCurrency(freightTotal)}</span>
          </div>
        ` : ''}
        ${otherExpenses && Number(otherExpenses) > 0 ? `
          <div class="totals-row">
            <span>Outras Despesas:</span>
            <span>${formatCurrency(otherExpenses)}</span>
          </div>
        ` : ''}
        <div class="totals-highlight">
          <span>VALOR A PAGAR</span>
          <span>${formatCurrency(invoiceTotal)}</span>
        </div>
      </section>

      <section class="payments-panel">
        <div class="section-title" style="margin-top: 0; margin-bottom: 4px;">Forma de Pagamento</div>
        ${paymentsHtml || '<div class="payment-row"><span>Em dinheiro / À vista</span><span class="font-bold">' + formatCurrency(invoiceTotal) + '</span></div>'}
        ${changeHtml}
      </section>
    </div>

    <!-- DIVISÃO IX: TRIBUTOS LEI 12.741/2012 -->
    ${estimatedTaxesText ? `<div class="taxes-banner avoid-break">${estimatedTaxesText}</div>` : ''}

    <!-- DIVISÃO VI, VII & VIII: CONSUMIDOR, CONSULTA, PROTOCOLO E QR CODE -->
    <div class="consultation-card avoid-break">
      <div class="consultation-info">
        <div class="consumer-block">
          <div class="consumer-title">Dados do Consumidor</div>
          <div class="consumer-name">${escapeDanfeHtml(recipientName)}</div>
          ${isConsumerIdentified && recipientTaxId ? `<div class="consumer-doc">CPF/CNPJ: ${formatDocumentId(recipientTaxId)}</div>` : '<div class="consumer-doc">CONSUMIDOR NÃO IDENTIFICADO</div>'}
        </div>

        <div class="key-block">
          <div class="key-label">Consulte pela Chave de Acesso em:</div>
          <div class="key-url">${escapeDanfeHtml(sefazUrl)}</div>
          <div class="key-value">${escapeDanfeHtml(formattedKey)}</div>
        </div>

        <div class="protocol-meta">
          <div>${protocolText}</div>
          <div>Ambiente: ${isHomologacao ? 'Homologação' : 'Produção'}</div>
        </div>
      </div>

      <div class="consultation-qr">
        <div class="qr-title">Consulta via QR Code</div>
        <div class="qr-svg-wrapper">
          ${qrSvg || '<div style="font-size: 8px; color: #94a3b8; text-align: center;">QR Code indisponível</div>'}
        </div>
        <div class="qr-caption">Aponte a câmera do seu celular para consultar na SEFAZ</div>
      </div>
    </div>

    <!-- INFORMAÇÕES COMPLEMENTARES -->
    ${complementaryInfo.trim() ? `
      <section class="additional-info-section avoid-break">
        <div class="additional-info-title">Informações Complementares de Interesse do Contribuinte</div>
        <div class="additional-info-content">${escapeDanfeHtml(complementaryInfo)}</div>
      </section>
    ` : ''}

    <!-- RODAPÉ -->
    <footer class="doc-footer avoid-break">
      <div>Obrigado pela preferência!</div>
      <div style="margin-top: 2px;">MoranteHub ERP · Sistema de Gestão Empresarial</div>
    </footer>
  </main>
</body>
</html>`;
}

/**
 * Gera o arquivo PDF do DANFE NFC-e A4 para download ou impressão nativa.
 */
export async function generateDanfeNfceA4Pdf(data: DanfeData): Promise<{ blob: Blob; fileName: string; print: () => void }> {
  const html = generateDanfeNfceA4Html(data);
  const fileName = `DANFE_NFCe_${String(data.nfeNumber).padStart(6, '0')}.pdf`;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('A geração do PDF do DANFE NFC-e requer ambiente do navegador.');
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: '900px',
    height: '1400px',
    border: '0',
  });

  try {
    const loaded = new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Tempo esgotado ao preparar o PDF do DANFE NFC-e.')), 15000);
      iframe.addEventListener(
        'load',
        () => {
          window.clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    });

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    await loaded;

    const frameDocument = iframe.contentDocument;
    const danfeElement = frameDocument?.querySelector<HTMLElement>('.danfe-nfce-a4');
    if (!frameDocument || !danfeElement) {
      throw new Error('Não foi possível montar a visualização do DANFE NFC-e A4.');
    }

    await frameDocument.fonts?.ready;
    await Promise.all(
      Array.from(frameDocument.images).map((image) => image.decode().catch(() => undefined))
    );

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(danfeElement, {
      backgroundColor: '#ffffff',
      logging: false,
      scale: 2,
      useCORS: true,
      width: danfeElement.scrollWidth,
      height: danfeElement.scrollHeight,
      windowWidth: iframe.contentWindow?.innerWidth || 900,
      windowHeight: Math.max(1400, danfeElement.scrollHeight),
    });

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/png');

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    const blob = pdf.output('blob');

    return {
      blob,
      fileName,
      print: () => {
        const blobUrl = URL.createObjectURL(blob);
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        }
      },
    };
  } finally {
    iframe.remove();
  }
}

