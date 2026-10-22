import bwipjs from 'bwip-js';
import { formatToBRDate } from '../../formatters';
import { formatAccessKey } from '../nfeAccessKey';
import { escapeDanfeHtml } from './danfeHtmlUtils';
import type { DanfeData } from './danfe.types';
import { ACCESS_KEY_PATTERN, hasValidAccessKeyDigit, normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers.js';
import { formatRecipientTaxId, isValidRecipientTaxId, normalizeRecipientTaxId } from '../../../../../../shared-utils/recipientTaxId';

const DEFAULT_DANFE_NFCE_LOGO_URL = '/images/logo-morante.svg';

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
  return formatRecipientTaxId(doc);
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
      padding: 4,
    });
  } catch {
    return '';
  }
}

export function canGenerateDanfeNfceQrCode(data: DanfeData): boolean {
  return getDanfeNfceA4UnavailableReason(data) === null;
}

function getQrPayload(qrCode: string): { accessKey: string; version: string; environment: string } | null {
  try {
    const url = new URL(qrCode);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    const values = url.searchParams.get('p')?.split('|') || [];
    if (values.length < 3) return null;
    return {
      accessKey: normalizeFiscalIdentifier(values[0]),
      version: values[1],
      environment: values[2],
    };
  } catch {
    return null;
  }
}

function isValidConsultationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function getDanfeLogoUrl(value: string | undefined): string | null {
  if (value === undefined) return DEFAULT_DANFE_NFCE_LOGO_URL;
  const logoUrl = value?.trim();
  if (!logoUrl) return null;
  if (logoUrl.startsWith('/') && !logoUrl.startsWith('//') && !logoUrl.includes('..') && !logoUrl.includes('\\')) {
    return logoUrl;
  }
  try {
    const url = new URL(logoUrl);
    return url.protocol === 'https:' ? url.href : DEFAULT_DANFE_NFCE_LOGO_URL;
  } catch {
    return DEFAULT_DANFE_NFCE_LOGO_URL;
  }
}

/** Checks the authorized XML identity and the key/environment carried by its QR payload. */
export function getDanfeNfceA4UnavailableReason(data: DanfeData): string | null {
  const fiscalDetails = data.fiscalDetails;
  if (!fiscalDetails) return 'O XML autorizado não está disponível para validar o DANFE A4.';

  const { general, issuer } = fiscalDetails;
  const xmlKey = normalizeFiscalIdentifier(general.accessKey);
  const documentKey = normalizeFiscalIdentifier(data.accessKey);
  if (data.model !== '65' || !ACCESS_KEY_PATTERN.test(xmlKey) || !hasValidAccessKeyDigit(xmlKey) || xmlKey.slice(20, 22) !== '65') {
    return 'A chave de acesso do XML autorizado está ausente ou inválida.';
  }
  if (documentKey !== xmlKey) return 'A chave de acesso do XML não corresponde ao documento selecionado.';
  if (general.model !== '65' || String(general.environment) !== String(data.environment)) {
    return 'O XML autorizado não corresponde ao modelo e ambiente deste documento.';
  }
  if (!general.stateCode || xmlKey.slice(0, 2) !== general.stateCode) {
    return 'A chave de acesso não corresponde à UF do XML autorizado.';
  }
  const issueDate = general.issueDate.match(/^(\d{4})-(\d{2})/);
  if (!issueDate || xmlKey.slice(2, 6) !== `${issueDate[1].slice(2)}${issueDate[2]}`) {
    return 'A chave de acesso não corresponde ao mês de emissão do XML autorizado.';
  }
  if (
    !general.series || !general.number ||
    Number(general.series) !== Number(xmlKey.slice(22, 25)) ||
    Number(general.number) !== Number(xmlKey.slice(25, 34)) ||
    general.emissionType !== xmlKey.slice(34, 35) ||
    Number(data.nfeNumber) !== Number(general.number) ||
    Number(data.series) !== Number(general.series)
  ) {
    return 'A chave de acesso não corresponde ao número e à série do XML autorizado.';
  }

  const normalizedIssuerId = normalizeRecipientTaxId(issuer.taxId || '');
  if (!issuer.name?.trim() || !isValidRecipientTaxId(normalizedIssuerId)) {
    return 'O XML autorizado não contém uma razão social e um CNPJ/CPF válidos para o emitente.';
  }
  if (!issuer.stateRegistration?.trim()) {
    return 'O XML autorizado não contém a Inscrição Estadual do emitente para o cabeçalho.';
  }
  if (normalizedIssuerId.length === 14 && xmlKey.slice(6, 20) !== normalizedIssuerId) {
    return 'A chave de acesso não corresponde ao CNPJ do emitente no XML autorizado.';
  }
  if (
    !issuer.street?.trim() || !issuer.number?.trim() || !issuer.district?.trim() ||
    !issuer.municipality?.trim() || !issuer.state?.trim() || !issuer.postalCode?.trim()
  ) {
    return 'O XML autorizado não contém o endereço completo do emitente para o cabeçalho.';
  }
  if (!general.total || !fiscalDetails.summary.products || fiscalDetails.items.length === 0 || fiscalDetails.payments.length === 0) {
    return 'O XML autorizado não contém todos os itens, totais e pagamentos necessários ao DANFE A4.';
  }
  if (!isValidConsultationUrl(general.consultationUrl || '')) {
    return 'A URL de consulta do XML autorizado está ausente ou inválida.';
  }

  const qrCodeText = general.qrCode?.trim() || '';
  const qrPayload = getQrPayload(qrCodeText);
  if (!qrPayload || !generateQrCodeSvg(qrCodeText)) {
    return 'O QR Code do XML autorizado está ausente ou inválido.';
  }
  if (
    qrPayload.accessKey !== xmlKey ||
    qrPayload.environment !== String(general.environment) ||
    !['2', '3'].includes(qrPayload.version)
  ) {
    return 'O QR Code não corresponde à chave, versão ou ambiente do XML autorizado.';
  }
  return null;
}

/**
 * Gera o documento de impressão A4 do DANFE NFC-e (modelo 65), seguindo o Manual de Especificações Técnicas do DANFE NFC-e e QR Code v6.0.
 */
export function generateDanfeNfceA4Html(data: DanfeData): string {
  const unavailableReason = getDanfeNfceA4UnavailableReason(data);
  if (unavailableReason) throw new Error(unavailableReason);

  const { fiscalDetails, protocolNumber, protocolDate, settings } = data;
  const { general, issuer } = fiscalDetails!;
  const isHomologacao = general.environment === '2';
  const isContingency = Boolean(general.emissionType && general.emissionType !== '1');
  const invoiceNumber = Number(general.number);
  const invoiceSeries = general.series;

  // Os dados fiscais do emitente vêm do XML autorizado; a configuração só define a marca visual.
  const issuerName = issuer.name;
  const issuerTaxId = formatRecipientTaxId(issuer.taxId);
  const issuerTaxIdLabel = normalizeRecipientTaxId(issuer.taxId).length === 11 ? 'CPF' : 'CNPJ';
  const issuerIe = issuer.stateRegistration.trim();
  const issuerStreet = issuer.street;
  const issuerNumber = issuer.number;
  const issuerComplement = issuer.complement || '';
  const issuerDistrict = issuer.district;
  const issuerCity = issuer.municipality;
  const issuerState = issuer.state;
  const issuerCep = issuer.postalCode;
  const issuerPhone = issuer.phone || '';
  const issuerLogoUrl = getDanfeLogoUrl(settings.companyDanfeLogoUrl);

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
  const hasNcm = rawItems.some((item) => Boolean(item.ncm?.trim()));
  const hasCfop = rawItems.some((item) => Boolean(item.cfop?.trim()));
  const itemColumnWidths = hasNcm && hasCfop
    ? ['4%', '11%', '34%', '8%', '7%', '7%', '5%', '12%', '12%']
    : hasNcm || hasCfop
      ? ['4%', '12%', '39%', '9%', '8%', '6%', '11%', '11%']
      : ['4%', '13%', '48%', '8%', '6%', '11%', '10%'];
  const itemsColumnCount = 7 + Number(hasNcm) + Number(hasCfop);
  const itemsHtml = rawItems
    .map((item, index) => {
      const displayDescription =
        item.description === homologationDescription && item.additionalInfo
          ? item.additionalInfo
          : item.description;

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

  // Totais
  const totalItemsCount = rawItems.length;
  const productsTotal = fiscalDetails!.summary.products || '';
  const discountTotal = fiscalDetails?.summary.discount || '';
  const freightTotal = fiscalDetails?.summary.freight || '';
  const insuranceTotal = fiscalDetails?.summary.insurance || '';
  const otherExpenses = fiscalDetails?.summary.otherExpenses || '';
  const invoiceTotal = general.total;

  // Pagamentos
  const payments = fiscalDetails?.payments || [];
  const paidTotal = payments.reduce((total, payment) => total + Number(payment.value || 0), 0);
  const paymentsHtml = payments
    .map((payment) => `
      <div class="payment-row">
        <span>${escapeDanfeHtml(payment.method)}</span>
        <span class="font-bold">${formatCurrency(payment.value)}</span>
      </div>
    `)
    .join('');

  const changeValue = fiscalDetails?.changeValue;
  const changeHtml = changeValue && Number(changeValue) > 0
    ? `
      <div class="payment-row change-row">
        <span>Troco</span>
        <span class="font-bold">${formatCurrency(changeValue)}</span>
      </div>
    `
    : '';

  // Tributos incidentes (Lei 12.741/2012)
  const estimatedTaxesEntry = fiscalDetails!.totals.find((entry) => entry.label.toLowerCase() === 'tributos aproximados');
  const estimatedTaxesText = estimatedTaxesEntry
    ? `Informação dos Tributos Totais Incidentes (Lei Federal 12.741/2012): ${formatCurrency(estimatedTaxesEntry.value)}`
    : '';

  // Consumidor
  const recipientName = fiscalDetails?.recipient.name || 'Consumidor não identificado';
  const recipientTaxId = fiscalDetails?.recipient.taxId || '';
  const normalizedRecipientName = recipientName.trim().toLocaleLowerCase('pt-BR');
  const isConsumerIdentified = Boolean(recipientTaxId || (
    normalizedRecipientName &&
    normalizedRecipientName !== 'consumidor não identificado' &&
    normalizedRecipientName !== 'consumidor nao identificado' &&
    normalizedRecipientName !== 'consumidor final'
  ));
  const displayedRecipientName = isConsumerIdentified ? recipientName : 'Consumidor não identificado';
  const recipient = fiscalDetails?.recipient;
  const recipientAddressParts: string[] = [];
  if (recipient?.street) {
    recipientAddressParts.push(`${recipient.street}${recipient.number ? `, ${recipient.number}` : ''}${recipient.complement ? ` - ${recipient.complement}` : ''}`);
  }
  if (recipient?.district) recipientAddressParts.push(recipient.district);
  if (recipient?.municipality || recipient?.state) {
    recipientAddressParts.push([recipient.municipality, recipient.state].filter(Boolean).join(' - '));
  }
  if (recipient?.postalCode) recipientAddressParts.push(`CEP: ${formatPostalCode(recipient.postalCode)}`);
  const recipientFullAddress = recipientAddressParts.join(' · ');
  const operationTypeLabel = general.operationType === '0' ? '0 - Entrada' : general.operationType === '1' ? '1 - Saída' : '';

  // QR Code
  const qrCodeText = general.qrCode || '';
  const qrSvg = generateQrCodeSvg(qrCodeText);

  // Chave e URL de consulta extraídas do XML autorizado.
  const formattedKey = formatAccessKey(general.accessKey || '');
  const sefazUrl = general.consultationUrl || '';

  // Protocolo
  const protocolText = protocolNumber
    ? escapeDanfeHtml(protocolNumber)
    : isContingency
      ? 'Autorização pendente de processamento'
      : 'Não informado no XML de autorização';

  // Informações complementares
  const complementaryInfo = general.additionalInfo || '';
  const taxAuthorityInfo = general.taxAuthorityInfo || '';

  // CSS do DANFE NFC-e A4 e suas regras de paginação para impressão.
  const css = `
    @page {
      size: A4 portrait;
      margin: 10mm;
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
    .env-tag.contingency {
      display: inline-block;
      margin-left: 6px;
      background: #fff7ed;
      color: #9a3412;
      border: 1px solid #fb923c;
    }
    .danfe-nfce-a4 {
      width: calc(100% - 24px);
      max-width: 190mm;
      min-height: 277mm;
      margin: 0 auto;
      padding: 5mm;
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      box-sizing: border-box;
    }
    .homologation-stripe {
      background: #fff1f2;
      border: 1px solid #e11d48;
      color: #be123c;
      padding: 8px 12px;
      text-align: center;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    .document-header {
      display: grid;
      grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.78fr) minmax(0, 1fr);
      border: 1px solid #64748b;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .issuer-card,
    .document-card,
    .consultation-header {
      min-width: 0;
      padding: 7px 8px;
    }
    .issuer-card,
    .document-card {
      border-right: 1px solid #94a3b8;
    }
    .issuer-card {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .issuer-card.without-logo { justify-content: center; }
    .issuer-logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 29mm;
      min-height: 30mm;
    }
    .issuer-logo {
      display: block;
      max-width: 28mm;
      max-height: 27mm;
      object-fit: contain;
    }
    .issuer-details { min-width: 0; text-align: left; }
    .issuer-title {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 2px;
      overflow-wrap: anywhere;
    }
    .issuer-data {
      font-size: 9px;
      color: #1e293b;
      font-weight: 600;
      margin-bottom: 2px;
      overflow-wrap: anywhere;
    }
    .issuer-address {
      font-size: 8.5px;
      color: #334155;
      overflow-wrap: anywhere;
      line-height: 1.3;
    }
    .document-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
    }
    .doc-title {
      font-size: 17px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
    }
    .doc-subtitle {
      font-size: 8px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
      line-height: 1.25;
    }
    .doc-direction {
      font-size: 9px;
      margin-top: 4px;
      color: #475569;
    }
    .doc-number {
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 5px;
    }
    .doc-meta {
      font-size: 9px;
      font-weight: 600;
      color: #334155;
      margin-top: 2px;
      overflow-wrap: anywhere;
    }
    .consultation-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .key-label {
      font-size: 8px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
    }
    .key-value {
      width: 100%;
      margin-top: 2px;
      color: #0f172a;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.25px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      overflow-wrap: anywhere;
      line-height: 1.25;
    }
    .consultation-header .qr-svg-wrapper {
      margin-top: 4px;
    }
    .key-url {
      margin-top: 3px;
      font-size: 8px;
      color: #1d4ed8;
      overflow-wrap: anywhere;
      line-height: 1.2;
    }
    .section-title {
      background: #e5e7eb;
      border: 1px solid #9ca3af;
      padding: 4px 7px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      color: #111827;
      margin-top: 7px;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    .consumer-card {
      margin-top: 7px;
      border: 1px solid #9ca3af;
      border-radius: 5px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .consumer-card .section-title { margin: 0; border-width: 0 0 1px; }
    .consumer-grid {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
    }
    .consumer-field {
      min-width: 0;
      padding: 5px 7px;
      border-right: 1px solid #d1d5db;
      border-bottom: 1px solid #d1d5db;
    }
    .consumer-field:nth-child(2) { border-right: 0; }
    .consumer-label {
      display: block;
      font-size: 8px;
      color: #4b5563;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .consumer-value {
      display: block;
      font-size: 9.5px;
      color: #111827;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .consumer-value.primary { font-size: 11px; font-weight: 800; }
    .consumer-address { grid-column: 1 / -1; border-right: 0; border-bottom: 0; }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 9px;
      margin-top: 2px;
      page-break-inside: auto;
    }
    table.items-table thead {
      display: table-header-group;
    }
    table.items-table th {
      background: #e5e7eb;
      border: 1px solid #9ca3af;
      padding: 4px 3px;
      font-size: 8px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
    }
    table.items-table td {
      border: 1px solid #9ca3af;
      padding: 4px 3px;
      color: #111827;
      vertical-align: top;
      overflow-wrap: anywhere;
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
      font-weight: 500;
      color: #111827;
      overflow-wrap: anywhere;
    }
    .item-extra {
      font-size: 8px;
      color: #4b5563;
      margin-top: 1px;
      overflow-wrap: anywhere;
    }
    .totals-payment-container {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 7px;
      margin-top: 7px;
      align-items: stretch;
    }
    .totals-panel,
    .payments-panel {
      min-width: 0;
      border: 1px solid #9ca3af;
      border-radius: 5px;
      padding: 0 6px 6px;
      background: #ffffff;
    }
    .totals-panel .section-title,
    .payments-panel .section-title { margin: 0 -6px 2px; }
    .totals-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 3px 2px;
      border-bottom: 1px solid #d1d5db;
      font-size: 9px;
      color: #111827;
    }
    .totals-highlight {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      padding: 5px 4px;
      background: #f3f4f6;
      border: 1px solid #6b7280;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 900;
      color: #111827;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 3px 2px;
      font-size: 9px;
      color: #111827;
      border-bottom: 1px solid #d1d5db;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .payment-row:last-child {
      border-bottom: none;
    }
    .payments-paid-total {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 4px;
      padding: 5px 4px;
      background: #f3f4f6;
      border: 1px solid #6b7280;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 900;
      color: #111827;
    }
    .change-row {
      color: #0f172a;
      font-weight: 700;
    }
    .taxes-banner {
      margin-top: 7px;
      padding: 5px 7px;
      background: #f9fafb;
      border: 1px solid #9ca3af;
      font-size: 8.5px;
      color: #374151;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .qr-svg-wrapper {
      width: 37mm;
      height: 37mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      padding: 3mm;
      border: 1px solid #9ca3af;
    }
    .qr-svg-wrapper svg {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .authorization-card {
      margin-top: 7px;
      border: 1px solid #9ca3af;
      border-radius: 5px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .authorization-card .section-title { margin: 0; border-width: 0 0 1px; }
    .authorization-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
    }
    .authorization-field {
      min-width: 0;
      padding: 5px 7px;
      border-right: 1px solid #d1d5db;
      border-bottom: 1px solid #d1d5db;
    }
    .authorization-field:last-child { border-right: 0; }
    .authorization-field:nth-last-child(-n + 3) { border-bottom: 0; }
    .authorization-label {
      display: block;
      font-size: 8px;
      color: #4b5563;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .authorization-value {
      display: block;
      font-size: 9px;
      color: #111827;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .document-notice {
      border-top: 1px solid #d1d5db;
      padding: 6px 8px;
      text-align: center;
      color: #374151;
      font-size: 8.5px;
      line-height: 1.3;
    }
    .additional-info-section {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      margin-top: 8px;
      padding: 6px 10px;
      background: #ffffff;
      page-break-inside: auto;
      break-inside: auto;
    }
    .additional-info-title {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #1e293b;
      page-break-after: avoid;
      break-after: avoid-page;
      margin-bottom: 3px;
    }
    .fiscal-message-section {
      margin-top: 8px;
      padding: 6px 10px;
      border: 1px solid #94a3b8;
      page-break-inside: auto;
      break-inside: auto;
    }
    .fiscal-message-title {
      margin: 0 0 3px;
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    .fiscal-message-content {
      font-size: 9.5px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      orphans: 3;
      widows: 3;
    }
    .additional-info-content {
      font-size: 9.5px;
      color: #334155;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      line-height: 1.35;
      orphans: 3;
      widows: 3;
    }
    @media screen and (max-width: 760px) {
      .danfe-nfce-a4 {
        width: 100%;
        min-height: 0;
        padding: 12px;
      }
      .document-header { grid-template-columns: 1fr 0.85fr; }
      .issuer-card { grid-column: 1 / -1; border-right: 0; border-bottom: 1px solid #94a3b8; }
      .document-card { border-right: 1px solid #94a3b8; }
    }
    @media screen and (max-width: 480px) {
      .document-header { grid-template-columns: 1fr; }
      .issuer-card,
      .document-card { border-right: 0; border-bottom: 1px solid #94a3b8; }
      .issuer-card { justify-content: flex-start; }
      .consultation-header { align-items: center; }
      .totals-payment-container { grid-template-columns: 1fr; }
      .consumer-grid,
      .authorization-grid { grid-template-columns: 1fr 1fr; }
      .authorization-field:nth-child(2n) { border-right: 0; }
      .authorization-field:nth-last-child(-n + 3) { border-bottom: 1px solid #d1d5db; }
      .authorization-field:nth-last-child(-n + 2) { border-bottom: 0; }
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
  <title>DANFE NFC-e - Nº ${invoiceNumber} (A4)</title>
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
      ${isContingency ? `<span class="env-tag contingency">EMISSÃO EM CONTINGÊNCIA (${escapeDanfeHtml(general.emissionType || '')})</span>` : ''}
    </div>
  </div>

  <main class="danfe-nfce-a4">
    ${isHomologacao ? '<div class="homologation-stripe">NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL</div>' : ''}

    <!-- Hierarquia do cabeçalho: emitente; identificação do documento; consulta/QR. -->
    <header class="document-header">
      <section class="issuer-card${issuerLogoUrl ? '' : ' without-logo'}">
        ${issuerLogoUrl ? `<div class="issuer-logo-wrap"><img class="issuer-logo" src="${escapeDanfeHtml(issuerLogoUrl)}" alt="Logotipo da empresa emitente" /></div>` : ''}
        <div class="issuer-details">
          <div class="issuer-title">${escapeDanfeHtml(issuerName)}</div>
          <div class="issuer-data">${issuerTaxIdLabel}: ${escapeDanfeHtml(issuerTaxId)}</div>
          <div class="issuer-data">Inscrição Estadual: ${escapeDanfeHtml(issuerIe)}</div>
          <div class="issuer-address">${escapeDanfeHtml(issuerFullAddress)}</div>
        </div>
      </section>

      <section class="document-card">
        <div class="doc-title">DANFE NFC-e</div>
        <div class="doc-subtitle">Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</div>
        <div class="doc-subtitle">Não permite aproveitamento de crédito de ICMS</div>
        ${operationTypeLabel ? `<div class="doc-direction">${operationTypeLabel}</div>` : ''}
        <div class="doc-number">NFC-e nº ${invoiceNumber}</div>
        <div class="doc-meta">Série ${escapeDanfeHtml(invoiceSeries)}</div>
        <div class="doc-meta">Emissão: ${escapeDanfeHtml(issueDateTimeStr)}</div>
      </section>

      <section class="consultation-header">
        <div class="key-label">Chave de acesso</div>
        <div class="key-value">${escapeDanfeHtml(formattedKey)}</div>
        <div class="qr-svg-wrapper" role="img" aria-label="QR Code para consulta da NFC-e na SEFAZ">
          ${qrSvg || '<div style="font-size: 8px; color: #94a3b8; text-align: center;">QR Code indisponível</div>'}
        </div>
        <div class="key-url">Consulte em ${escapeDanfeHtml(sefazUrl)} ou pelo QR Code</div>
      </section>
    </header>

    <section class="consumer-card avoid-break">
      <div class="section-title">Dados do Consumidor</div>
      <div class="consumer-grid">
        <div class="consumer-field">
          <span class="consumer-label">Nome / Razão Social</span>
          <span class="consumer-value primary">${escapeDanfeHtml(displayedRecipientName)}</span>
        </div>
        <div class="consumer-field">
          <span class="consumer-label">CPF / CNPJ</span>
          <span class="consumer-value">${isConsumerIdentified && recipientTaxId ? formatDocumentId(recipientTaxId) : '—'}</span>
        </div>
        <div class="consumer-field consumer-address">
          <span class="consumer-label">Endereço</span>
          <span class="consumer-value">${escapeDanfeHtml(recipientFullAddress || '—')}</span>
        </div>
      </div>
    </section>

    <!-- Itens e classificações exibidos exclusivamente quando constam no XML. -->
    <div class="section-title">Dados dos Produtos / Serviços</div>
    <table class="items-table">
      <colgroup>${itemColumnWidths.map((width) => `<col style="width: ${width};" />`).join('')}</colgroup>
      <thead>
        <tr>
          <th>Item</th>
          <th>Código</th>
          <th>Descrição do Produto / Serviço</th>
          ${hasNcm ? '<th>NCM</th>' : ''}
          ${hasCfop ? '<th>CFOP</th>' : ''}
          <th>Qtd.</th>
          <th>UN</th>
          <th style="text-align: right;">Vl. Unit. (R$)</th>
          <th style="text-align: right;">Vl. Total (R$)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td colspan="${itemsColumnCount}" class="text-center">Nenhum item informado.</td></tr>`}
      </tbody>
    </table>

    <!-- DIVISÃO IV & V: TOTAIS E FORMAS DE PAGAMENTO -->
    <div class="totals-payment-container">
      <section class="totals-panel">
        <div class="section-title">Totais da NFC-e</div>
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
        ${insuranceTotal && Number(insuranceTotal) > 0 ? `
          <div class="totals-row">
            <span>Seguro:</span>
            <span>${formatCurrency(insuranceTotal)}</span>
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
        <div class="section-title">Forma de Pagamento</div>
        ${paymentsHtml || '<div class="payment-row">Pagamento não informado no XML autorizado.</div>'}
        ${payments.length ? `<div class="payments-paid-total"><span>Valor pago</span><span>${formatCurrency(paidTotal.toFixed(2))}</span></div>` : ''}
        ${changeHtml}
      </section>
    </div>

    <!-- DIVISÃO IX: TRIBUTOS LEI 12.741/2012 -->
    ${estimatedTaxesText ? `<div class="taxes-banner avoid-break">${estimatedTaxesText}</div>` : ''}

    <!-- INFORMAÇÕES COMPLEMENTARES -->
    ${complementaryInfo.trim() ? `
      <section class="additional-info-section">
        <div class="additional-info-title">Informações Complementares de Interesse do Contribuinte</div>
        <div class="additional-info-content">${escapeDanfeHtml(complementaryInfo)}</div>
      </section>
    ` : ''}

    ${taxAuthorityInfo.trim() ? `
      <section class="fiscal-message-section">
        <div class="fiscal-message-title">Informações de Interesse do Fisco</div>
        <div class="fiscal-message-content">${escapeDanfeHtml(taxAuthorityInfo)}</div>
      </section>
    ` : ''}

    <section class="authorization-card avoid-break">
      <div class="section-title">Dados da NFC-e</div>
      <div class="authorization-grid">
        <div class="authorization-field">
          <span class="authorization-label">Protocolo de autorização</span>
          <span class="authorization-value">${protocolText}</span>
        </div>
        <div class="authorization-field">
          <span class="authorization-label">Data e hora da autorização</span>
          <span class="authorization-value">${escapeDanfeHtml(protocolDate || 'Não informado')}</span>
        </div>
        <div class="authorization-field">
          <span class="authorization-label">Ambiente</span>
          <span class="authorization-value">${isHomologacao ? 'Homologação (tpAmb=2)' : 'Produção (tpAmb=1)'}</span>
        </div>
      </div>
      ${isContingency ? '<div class="document-notice">Emissão em contingência; autorização pendente de processamento.</div>' : ''}
      <div class="document-notice">Este documento é uma representação gráfica da NFC-e. Consulte a autenticidade no endereço indicado ou pelo QR Code.</div>
    </section>

  </main>
</body>
</html>`;
}

