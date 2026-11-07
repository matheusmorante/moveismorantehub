import { formatToBRDate } from '../../formatters';
import { DANFE_NFCE_A4_STYLES } from './danfeNfceA4Styles';
import { formatAccessKey } from '../nfeAccessKey';
import { escapeDanfeHtml } from './danfeHtmlUtils';
import type { DanfeData } from './danfe.types';
import { ACCESS_KEY_PATTERN, hasValidAccessKeyDigit, normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers.js';
import { formatRecipientTaxId, isValidRecipientTaxId, normalizeRecipientTaxId } from '../../../../../../shared-utils/recipientTaxId';
import { DANFE_NFCE_A4_PAGINATION_SCRIPT } from './danfeNfceA4PaginationScript';
import { generateQrCodeSvg, getQrPayload } from './danfeNfceQrCode';
import {
  buildDanfeNfceA4ItemTable,
  formatDanfeNfceA4Currency as formatCurrency,
} from './danfeNfceA4Presentation';

const DEFAULT_DANFE_NFCE_LOGO_URL = '/images/logo-morante.svg';

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

export function canGenerateDanfeNfceQrCode(data: DanfeData): boolean {
  return getDanfeNfceA4UnavailableReason(data) === null;
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
  const rawItems = fiscalDetails?.items || [];
  const {
    hasNcm,
    hasCfop,
    itemColumnWidths,
    itemsColumnCount,
    itemsHtml,
  } = buildDanfeNfceA4ItemTable(rawItems);

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
      <tr>
        <td>${escapeDanfeHtml(payment.method)}</td>
        <td class="text-right font-bold">${formatCurrency(payment.value)}</td>
      </tr>
    `)
    .join('');

  const changeValue = fiscalDetails?.changeValue;
  const changeHtml = changeValue && Number(changeValue) > 0
    ? `
      <tr class="change-row">
        <td>Troco</td>
        <td class="text-right font-bold">${formatCurrency(changeValue)}</td>
      </tr>
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
  if (recipient?.postalCode) recipientAddressParts.push(`CEP: ${formatPostalCode(recipient.postalCode)}`);
  const recipientAddress = recipientAddressParts.join(' · ');
  const recipientMunicipality = recipient?.municipality || '';
  const recipientState = recipient?.state || '';
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
  const css = DANFE_NFCE_A4_STYLES;

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
    <div class="danfe-pages">
      <section class="danfe-page">
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
        <div class="doc-meta doc-page-counter">Folha 1/1</div>
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
        <div class="consumer-field consumer-name">
          <span class="consumer-label">Nome / Razão Social</span>
          <span class="consumer-value primary">${escapeDanfeHtml(displayedRecipientName)}</span>
        </div>
        <div class="consumer-field consumer-tax-id">
          <span class="consumer-label">CPF / CNPJ</span>
          <span class="consumer-value">${isConsumerIdentified && recipientTaxId ? formatDocumentId(recipientTaxId) : '—'}</span>
        </div>
        <div class="consumer-field consumer-address">
          <span class="consumer-label">Endereço</span>
          <span class="consumer-value">${escapeDanfeHtml(recipientAddress || '—')}</span>
        </div>
        <div class="consumer-field consumer-municipality">
          <span class="consumer-label">Município</span>
          <span class="consumer-value">${escapeDanfeHtml(recipientMunicipality || '—')}</span>
        </div>
        <div class="consumer-field consumer-state">
          <span class="consumer-label">UF</span>
          <span class="consumer-value">${escapeDanfeHtml(recipientState || '—')}</span>
        </div>
      </div>
    </section>

    <section class="page-items">
    <!-- Itens e classificações exibidos exclusivamente quando constam no XML. -->
    <div class="section-title products-title">Dados dos Produtos / Serviços</div>
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
          <th style="text-align: right;">Vl. Unit.<br>(R$)</th>
          <th style="text-align: right;">Vl. Total<br>(R$)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td colspan="${itemsColumnCount}" class="text-center">Nenhum item informado.</td></tr>`}
      </tbody>
    </table>
    </section>

    <div class="page-footer-core">
    <!-- Totais e pagamentos em quadros tabulares do modelo 65. -->
    <div class="totals-payment-container">
      <section class="totals-panel">
        <div class="section-title">Totais da NFC-e</div>
        <div class="totals-grid">
          <div class="totals-cell">
            <span class="totals-label">Qtd. total de itens</span>
            <strong class="totals-value">${totalItemsCount}</strong>
          </div>
          <div class="totals-cell">
            <span class="totals-label">Valor dos produtos</span>
            <strong class="totals-value">${formatCurrency(productsTotal)}</strong>
          </div>
          ${discountTotal && Number(discountTotal) > 0 ? `
            <div class="totals-cell">
              <span class="totals-label">Desconto</span>
              <strong class="totals-value">- ${formatCurrency(discountTotal)}</strong>
            </div>
          ` : ''}
          ${freightTotal && Number(freightTotal) > 0 ? `
            <div class="totals-cell">
              <span class="totals-label">Frete</span>
              <strong class="totals-value">${formatCurrency(freightTotal)}</strong>
            </div>
          ` : ''}
          ${insuranceTotal && Number(insuranceTotal) > 0 ? `
            <div class="totals-cell">
              <span class="totals-label">Seguro</span>
              <strong class="totals-value">${formatCurrency(insuranceTotal)}</strong>
            </div>
          ` : ''}
          ${otherExpenses && Number(otherExpenses) > 0 ? `
            <div class="totals-cell">
              <span class="totals-label">Outras despesas</span>
              <strong class="totals-value">${formatCurrency(otherExpenses)}</strong>
            </div>
          ` : ''}
          <div class="totals-cell totals-cell-total">
            <span class="totals-label">Total da NFC-e</span>
            <strong class="totals-value">${formatCurrency(invoiceTotal)}</strong>
          </div>
        </div>
      </section>

      <section class="payments-panel">
        <div class="section-title">Forma de Pagamento</div>
        <table class="payment-table">
          <colgroup><col /><col style="width: 27mm" /></colgroup>
          <thead><tr><th>Descrição</th><th>Valor (R$)</th></tr></thead>
          <tbody>
            ${paymentsHtml || '<tr><td>Pagamento não informado no XML autorizado.</td><td class="text-right">—</td></tr>'}
            ${payments.length ? `<tr class="payments-paid-total"><td>Valor pago</td><td>${formatCurrency(paidTotal.toFixed(2))}</td></tr>` : ''}
            ${changeHtml}
          </tbody>
        </table>
      </section>
    </div>

    <!-- DIVISÃO IX: TRIBUTOS LEI 12.741/2012 -->
    ${estimatedTaxesText ? `<div class="taxes-banner avoid-break">${estimatedTaxesText}</div>` : ''}

    <section class="authorization-card avoid-break">
      <div class="section-title">Dados da NFC-e</div>
      <div class="authorization-grid">
        <div class="authorization-field authorization-access-key">
          <span class="authorization-label">Chave de acesso</span>
          <span class="authorization-value text-mono">${escapeDanfeHtml(formattedKey)}</span>
        </div>
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
    </div>

    ${complementaryInfo.trim() || taxAuthorityInfo.trim() ? `
      <section class="additional-info-section">
        <div class="additional-info-cell">
          <div class="additional-info-title">Informações adicionais</div>
          <div class="additional-info-content">${escapeDanfeHtml(complementaryInfo)}</div>
        </div>
        <div class="additional-info-cell">
          <div class="additional-info-title">Reservado ao fisco</div>
          <div class="additional-info-content">${escapeDanfeHtml(taxAuthorityInfo)}</div>
        </div>
      </section>
    ` : ''}

      </section>
    </div>
  </main>
<script>${DANFE_NFCE_A4_PAGINATION_SCRIPT}</script>
</body>
</html>`;
}

