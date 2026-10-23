import bwipjs from 'bwip-js';
import { formatToBRDate } from '../../formatters';
import { formatAccessKey } from '../nfeAccessKey';
import { escapeDanfeHtml } from './danfeHtmlUtils';
import type { DanfeData } from './danfe.types';
import { ACCESS_KEY_PATTERN, hasValidAccessKeyDigit, normalizeFiscalIdentifier } from '../../../../../../shared-utils/fiscalIdentifiers.js';
import { formatRecipientTaxId, isValidRecipientTaxId, normalizeRecipientTaxId } from '../../../../../../shared-utils/recipientTaxId';

const DEFAULT_DANFE_NFCE_LOGO_URL = '/images/logo-morante.svg';

const DANFE_NFCE_A4_PAGINATION_SCRIPT = `
(() => {
  const root = document.querySelector('.danfe-pages');
  const template = root && root.querySelector('.danfe-page');
  if (!root || !template) return;

  const sourceHeader = template.querySelector('.document-header');
  const sourceConsumer = template.querySelector('.consumer-card');
  const sourceItems = template.querySelector('.page-items');
  const sourceTitle = sourceItems && sourceItems.querySelector('.products-title');
  const sourceTable = sourceItems && sourceItems.querySelector('.items-table');
  const sourceFooter = template.querySelector('.page-footer-core');
  const sourceInfo = template.querySelector('.additional-info-section');
  const sourceRows = sourceTable ? Array.from(sourceTable.tBodies[0].rows) : [];
  const sourceStripe = template.querySelector('.homologation-stripe');
  const heightOf = (element) => element ? element.getBoundingClientRect().height : 0;
  if (!sourceHeader || !sourceItems || !sourceTitle || !sourceTable || !sourceFooter || !sourceRows.length) return;

  const measureHost = document.createElement('div');
  measureHost.style.cssText = 'position:absolute;left:-20000px;top:0;width:200mm;visibility:hidden;';
  document.body.appendChild(measureHost);
  document.body.classList.add('danfe-pagination-measuring');

  try {
    const pageHeight = heightOf(template);
    const stripeHeight = heightOf(sourceStripe);
    const headerHeight = heightOf(sourceHeader);
    const consumerHeight = heightOf(sourceConsumer);
    const titleHeight = heightOf(sourceTitle);
    const tableHead = sourceTable.tHead;
    const tableHeadHeight = heightOf(tableHead);
    const rowHeights = sourceRows.map(heightOf);
    const totalRowsHeight = rowHeights.reduce((total, height) => total + height, 0);
    const tableChromeHeight = Math.max(0, heightOf(sourceTable) - tableHeadHeight - totalRowsHeight);
    const footerHeight = heightOf(sourceFooter);
    const infoHeight = heightOf(sourceInfo);
    const safety = 2;
    const headerWithConsumer = stripeHeight + headerHeight + consumerHeight;
    const headerContinuation = stripeHeight + headerHeight;
    const firstCapacity = pageHeight - headerWithConsumer - titleHeight - tableHeadHeight - tableChromeHeight - safety;
    const continuationCapacity = pageHeight - headerContinuation - titleHeight - tableHeadHeight - tableChromeHeight - safety;
    const totalRows = totalRowsHeight + tableChromeHeight;

    let productGroups;
    if (totalRows + footerHeight + infoHeight <= firstCapacity) {
      productGroups = [sourceRows];
    } else if (totalRows + footerHeight <= firstCapacity) {
      productGroups = [sourceRows];
    } else {
      const lastCapacity = continuationCapacity - footerHeight;
      let suffixStart = sourceRows.length;
      let suffixHeight = tableChromeHeight;
      while (suffixStart > 0 && suffixHeight + rowHeights[suffixStart - 1] <= lastCapacity) {
        suffixStart -= 1;
        suffixHeight += rowHeights[suffixStart];
      }
      if (suffixStart === 0) suffixStart = 1;

      productGroups = [];
      let rowIndex = 0;
      while (rowIndex < suffixStart) {
        const capacity = rowIndex === 0 ? firstCapacity : continuationCapacity;
        const group = [];
        let groupHeight = tableChromeHeight;
        while (rowIndex < suffixStart && groupHeight + rowHeights[rowIndex] <= capacity) {
          group.push(sourceRows[rowIndex]);
          groupHeight += rowHeights[rowIndex];
          rowIndex += 1;
        }
        if (!group.length) {
          group.push(sourceRows[rowIndex]);
          rowIndex += 1;
        }
        productGroups.push(group);
      }
      productGroups.push(sourceRows.slice(suffixStart));
    }

    const infoColumns = sourceInfo ? Array.from(sourceInfo.querySelectorAll('.additional-info-content')) : [];
    let remainingInfo = infoColumns.map((element) => element.textContent || '');
    const splitText = (text, sourceElement, maxHeight) => {
      if (!text) return { part: '', rest: '', consumed: 0 };
      const characters = Array.from(text);
      const probe = document.createElement(sourceElement.tagName.toLowerCase());
      probe.className = sourceElement.className;
      probe.style.cssText = 'position:absolute;left:-20000px;top:0;width:' + sourceElement.getBoundingClientRect().width + 'px;';
      measureHost.appendChild(probe);
      let low = 1;
      let high = characters.length;
      let best = 0;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        probe.textContent = characters.slice(0, middle).join('');
        if (heightOf(probe) <= maxHeight) {
          best = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      probe.remove();
      if (best === 0) return { part: '', rest: text, consumed: 0 };
      if (best < characters.length) {
        const earliestBoundary = Math.floor(best * 0.75);
        for (let index = best - 1; index >= earliestBoundary; index -= 1) {
          if (/\s/.test(characters[index])) {
            best = index + 1;
            break;
          }
        }
      }
      return {
        part: characters.slice(0, best).join(''),
        rest: characters.slice(best).join(''),
        consumed: best,
      };
    };
    const takeInfoPiece = (remaining, maxSectionHeight) => {
      if (!sourceInfo || maxSectionHeight <= 0) return null;
      const emptySection = sourceInfo.cloneNode(true);
      const emptyContents = Array.from(emptySection.querySelectorAll('.additional-info-content'));
      emptyContents.forEach((element) => { element.textContent = ''; });
      measureHost.appendChild(emptySection);
      const emptyHeight = heightOf(emptySection);
      const baseTextHeight = Math.max(...emptyContents.map(heightOf));
      const textHeightLimit = Math.max(0, maxSectionHeight - emptyHeight + baseTextHeight);
      const measuredContents = Array.from(emptySection.querySelectorAll('.additional-info-content'));
      const pieces = remaining.map((text, index) => splitText(text, measuredContents[index], textHeightLimit));
      emptySection.remove();
      if (!pieces.some((piece) => piece.consumed > 0)) return null;

      const section = sourceInfo.cloneNode(true);
      const content = Array.from(section.querySelectorAll('.additional-info-content'));
      content.forEach((element, index) => { element.textContent = pieces[index].part; });
      measureHost.appendChild(section);
      const sectionHeight = heightOf(section);
      section.remove();
      return {
        section,
        pieces,
        remaining: pieces.map((piece) => piece.rest),
        height: sectionHeight,
      };
    };

    const lastGroup = productGroups[productGroups.length - 1];
    const lastGroupHeight = lastGroup.reduce((total, row) => total + heightOf(row), 0) + tableChromeHeight;
    const lastHasConsumer = productGroups.length === 1;
    const lastHeaderHeight = lastHasConsumer ? headerWithConsumer : headerContinuation;
    const remainingHeightForInfo = pageHeight - lastHeaderHeight - titleHeight - tableHeadHeight - lastGroupHeight - footerHeight - safety;
    const finalPageInfo = takeInfoPiece(remainingInfo, remainingHeightForInfo);
    if (finalPageInfo) remainingInfo = finalPageInfo.remaining;

    const infoPages = [];
    const infoPageCapacity = pageHeight - headerContinuation - safety;
    while (remainingInfo.some(Boolean)) {
      const piece = takeInfoPiece(remainingInfo, infoPageCapacity);
      if (!piece) break;
      infoPages.push(piece);
      remainingInfo = piece.remaining;
    }

    const totalPageCount = productGroups.length + infoPages.length;
    const buildTable = (rows) => {
      const table = sourceTable.cloneNode(false);
      Array.from(sourceTable.children).forEach((child) => {
        if (child.tagName.toLowerCase() !== 'tbody') {
          table.appendChild(child.cloneNode(true));
          return;
        }
        const body = document.createElement('tbody');
        rows.forEach((row) => body.appendChild(row.cloneNode(true)));
        const filler = document.createElement('tr');
        filler.className = 'table-fill-row';
        filler.setAttribute('aria-hidden', 'true');
        const columnCount = sourceTable.tHead.querySelectorAll('th').length;
        for (let index = 0; index < columnCount; index += 1) filler.appendChild(document.createElement('td'));
        body.appendChild(filler);
        table.appendChild(body);
      });
      return table;
    };
    const buildPage = (rows, index, isFirst, isFinal, infoPiece) => {
      const page = document.createElement('section');
      page.className = 'danfe-page';
      page.dataset.pageNumber = String(index);
      if (sourceStripe) page.appendChild(sourceStripe.cloneNode(true));
      const header = sourceHeader.cloneNode(true);
      const counter = header.querySelector('.doc-page-counter');
      if (counter) counter.textContent = 'Folha ' + index + '/' + totalPageCount;
      page.appendChild(header);
      if (isFirst && sourceConsumer) page.appendChild(sourceConsumer.cloneNode(true));
      if (rows) {
        const items = document.createElement('section');
        items.className = 'page-items';
        items.appendChild(sourceTitle.cloneNode(true));
        items.appendChild(buildTable(rows));
        page.appendChild(items);
      }
      if (isFinal) page.appendChild(sourceFooter.cloneNode(true));
      if (infoPiece && sourceInfo) {
        const section = sourceInfo.cloneNode(true);
        Array.from(section.querySelectorAll('.additional-info-content')).forEach((element, infoIndex) => {
          element.textContent = infoPiece.pieces[infoIndex].part;
        });
        page.appendChild(section);
      }
      return page;
    };

    const pages = [];
    productGroups.forEach((group, index) => {
      const isFinal = index === productGroups.length - 1;
      pages.push(buildPage(group, index + 1, index === 0, isFinal, isFinal ? finalPageInfo : null));
    });
    infoPages.forEach((piece, index) => {
      pages.push(buildPage(null, productGroups.length + index + 1, false, false, piece));
    });
    root.replaceChildren(...pages);

    pages.slice(0, productGroups.length).forEach((page) => {
      const fillerCells = page.querySelectorAll('.table-fill-row td');
      if (!fillerCells.length) return;
      fillerCells.forEach((cell) => { cell.style.height = '0px'; });
      const pageTop = page.getBoundingClientRect().top;
      const contentBottom = Math.max(...Array.from(page.children).map((element) => element.getBoundingClientRect().bottom));
      const remaining = Math.max(0, pageHeight - (contentBottom - pageTop) - safety);
      fillerCells.forEach((cell) => { cell.style.height = remaining + 'px'; });
    });
  } catch (error) {
    console.error('[DANFE NFC-e A4] Falha ao paginar as folhas.', error);
  } finally {
    document.body.classList.remove('danfe-pagination-measuring');
    measureHost.remove();
  }
})();
`;

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
  const css = `
    @page {
      size: A4 portrait;
      margin: 5mm;
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
      color: #000;
      font-family: "Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif;
      font-size: 9px;
      line-height: 1.15;
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
      max-width: 200mm;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
      box-shadow: none;
      box-sizing: border-box;
    }
    .danfe-pages {
      display: flex;
      flex-direction: column;
      gap: 5mm;
    }
    .danfe-page {
      width: 100%;
      height: 287mm;
      margin: 0 auto;
      overflow: visible;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
    }
    .danfe-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .homologation-stripe {
      background: #fff1f2;
      border: 1px solid #e11d48;
      color: #be123c;
      padding: 3px 5px;
      text-align: center;
      font-weight: 900;
      font-size: 9px;
      letter-spacing: 0.5px;
      margin-bottom: 0;
      border-radius: 0;
      border-bottom-width: 0;
    }
    .document-header {
      display: grid;
      grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.78fr) minmax(0, 1fr);
      border: 1px solid #000;
      border-radius: 0;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .issuer-card,
    .document-card,
    .consultation-header {
      min-width: 0;
      padding: 2px 3px;
    }
    .issuer-card,
    .document-card {
      border-right: 1px solid #000;
    }
    .issuer-card {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .issuer-card.without-logo { justify-content: center; }
    .issuer-logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 20mm;
      min-height: 20mm;
    }
    .issuer-logo {
      display: block;
      max-width: 20mm;
      max-height: 20mm;
      object-fit: contain;
    }
    .issuer-details { min-width: 0; text-align: left; }
    .issuer-title {
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #000;
      margin-bottom: 1px;
      overflow-wrap: anywhere;
    }
    .issuer-data {
      font-size: 6.5px;
      color: #000;
      font-weight: 600;
      margin-bottom: 1px;
      overflow-wrap: anywhere;
    }
    .issuer-address {
      font-size: 6.2px;
      color: #000;
      overflow-wrap: anywhere;
      line-height: 1.1;
    }
    .document-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
    }
    .doc-title {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      color: #000;
    }
    .doc-subtitle {
      font-size: 6.5px;
      font-weight: 600;
      color: #000;
      margin-top: 2px;
      line-height: 1.25;
    }
    .doc-direction {
      font-size: 7px;
      margin-top: 2px;
      color: #000;
    }
    .doc-number {
      font-size: 9px;
      font-weight: 700;
      color: #000;
      margin-top: 2px;
    }
    .doc-meta {
      font-size: 6.5px;
      font-weight: 600;
      color: #000;
      margin-top: 1px;
      overflow-wrap: anywhere;
    }
    .doc-page-counter {
      font-size: 6.5px;
      font-weight: 700;
    }
    .consultation-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .key-label {
      font-size: 6px;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
    }
    .key-value {
      width: 100%;
      margin-top: 2px;
      color: #000;
      font-size: 6.5px;
      font-weight: 700;
      letter-spacing: 0.25px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      overflow-wrap: anywhere;
      line-height: 1.1;
    }
    .consultation-header .qr-svg-wrapper {
      margin-top: 1px;
    }
    .key-url {
      margin-top: 1px;
      font-size: 6.5px;
      color: #1d4ed8;
      overflow-wrap: anywhere;
      line-height: 1.2;
    }
    .section-title {
      background: #ffffff;
      border: 1px solid #000;
      padding: 2px 4px;
      font-size: 7px;
      font-weight: 900;
      text-transform: uppercase;
      color: #000;
      margin: 0;
      page-break-after: avoid;
      break-after: avoid-page;
    }
    .products-title {
      border-width: 0 1px 0;
    }
    .consumer-card {
      margin: 0;
      border: 0 solid #000;
      border-width: 0 1px 1px;
      border-radius: 0;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .consumer-card .section-title { border-width: 0 0 1px; }
    .consumer-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1.5fr 0.8fr;
    }
    .consumer-field {
      min-width: 0;
      padding: 3px 5px;
      border-right: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .consumer-name { grid-column: span 2; }
    .consumer-tax-id { grid-column: span 2; border-right: 0; }
    .consumer-address { grid-column: span 2; border-bottom: 0; }
    .consumer-municipality { border-bottom: 0; }
    .consumer-state { border-right: 0; }
    .consumer-label {
      display: block;
      font-size: 6.5px;
      color: #000;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .consumer-value {
      display: block;
      font-size: 8.5px;
      color: #000;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .consumer-value.primary { font-size: 9px; font-weight: 800; }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 8px;
      margin-top: 0;
      page-break-inside: auto;
    }
    table.items-table thead {
      display: table-header-group;
    }
    table.items-table th {
      background: #ffffff;
      border: 1px solid #000;
      padding: 3px 2px;
      font-size: 7px;
      font-weight: 800;
      color: #000;
      text-transform: uppercase;
      line-height: 1.05;
    }
    table.items-table td {
      border: 1px solid #000;
      padding: 3px 2px;
      color: #000;
      vertical-align: top;
      overflow-wrap: anywhere;
      line-height: 1.15;
    }
    table.items-table .table-fill-row td {
      height: 0;
      padding: 0;
      font-size: 0;
      line-height: 0;
      vertical-align: top;
    }
    table.items-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    table.items-table tr:nth-child(even) {
      background: #ffffff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .item-name {
      font-weight: 500;
      color: #000;
      overflow-wrap: anywhere;
    }
    .item-extra {
      font-size: 7.2px;
      color: #000;
      margin-top: 1px;
      overflow-wrap: anywhere;
    }
    .totals-payment-container {
      display: block;
      margin: 0;
      border: 0 solid #000;
      border-width: 0 1px 1px;
    }
    .totals-panel,
    .payments-panel {
      min-width: 0;
      border: 0;
      padding: 0;
      background: #fff;
    }
    .totals-panel .section-title,
    .payments-panel .section-title { border-width: 0 0 1px; }
    .totals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(23mm, 1fr));
    }
    .totals-cell {
      min-width: 0;
      padding: 3px 4px;
      border-right: 1px solid #000;
    }
    .totals-cell:last-child { border-right: 0; }
    .totals-label {
      display: block;
      min-height: 14px;
      font-size: 6.2px;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .totals-value {
      display: block;
      margin-top: 2px;
      font-size: 8px;
      font-weight: 800;
      text-align: right;
      white-space: nowrap;
    }
    .totals-cell-total {
      font-weight: 900;
      background: #f2f2f2;
    }
    .totals-cell-total .totals-label { font-size: 6.5px; }
    .totals-cell-total .totals-value { font-size: 9.5px; font-weight: 900; }
    .payments-panel {
      border-top: 1px solid #000;
    }
    table.payment-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      color: #000;
    }
    .payment-table th,
    .payment-table td {
      padding: 3px 5px;
      text-align: left;
      vertical-align: middle;
      border-bottom: 1px solid #000;
    }
    .payment-table th {
      font-size: 6.8px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .payment-table td {
      font-size: 8px;
    }
    .payment-table th + th,
    .payment-table td + td {
      border-left: 1px solid #000;
    }
    .payment-table th:last-child,
    .payment-table td:last-child {
      width: 27mm;
      text-align: right;
    }
    .payment-table tbody tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .payment-table tbody tr:last-child td {
      border-bottom: 0;
    }
    .payment-table .payments-paid-total td {
      font-weight: 900;
      background: #f2f2f2;
    }
    .payment-table .change-row td {
      font-weight: 700;
    }
    .taxes-banner {
      margin: 0;
      padding: 3px 5px;
      background: #fff;
      border: 0 solid #000;
      border-width: 0 1px 1px;
      font-size: 7.5px;
      color: #000;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .qr-svg-wrapper {
      width: 30mm;
      height: 30mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      padding: 2mm;
      border: 1px solid #000;
    }
    .qr-svg-wrapper svg {
      width: 100% !important;
      height: 100% !important;
      display: block;
    }
    .authorization-card {
      margin: 0;
      border: 0 solid #000;
      border-width: 0 1px 1px;
      border-radius: 0;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .authorization-card .section-title { margin: 0; border-width: 0 0 1px; }
    .authorization-grid {
      display: grid;
      grid-template-columns: 2fr 1.35fr 1.2fr 0.85fr;
    }
    .authorization-field {
      min-width: 0;
      padding: 4px 5px;
      border-right: 1px solid #000;
      border-bottom: 0;
    }
    .authorization-field:last-child { border-right: 0; }
    .authorization-label {
      display: block;
      font-size: 6.5px;
      color: #000;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .authorization-value {
      display: block;
      font-size: 8px;
      color: #000;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .authorization-access-key .authorization-value { font-size: 7.5px; }
    .document-notice {
      border-top: 1px solid #000;
      padding: 3px 5px;
      text-align: center;
      color: #000;
      font-size: 7.5px;
      line-height: 1.3;
    }
    .additional-info-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      border: 0 solid #000;
      border-width: 0 1px 1px;
      border-radius: 0;
      margin: 0;
      padding: 0;
      background: #fff;
      page-break-inside: auto;
      break-inside: auto;
    }
    .page-footer-core {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .additional-info-cell { min-width: 0; }
    .additional-info-cell + .additional-info-cell { border-left: 1px solid #000; }
    .additional-info-title {
      padding: 1px 3px;
      border-bottom: 1px solid #000;
      font-size: 6.5px;
      font-weight: 900;
      text-transform: uppercase;
      color: #000;
      page-break-after: avoid;
      break-after: avoid-page;
      margin: 0;
    }
    .additional-info-content {
      padding: 2px 3px;
      font-size: 7.5px;
      color: #000;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      line-height: 1.15;
      orphans: 3;
      widows: 3;
    }
    @media screen and (max-width: 760px) {
      .danfe-nfce-a4 {
        width: 100%;
        min-height: 0;
        padding: 0;
      }
      .document-header { grid-template-columns: 1fr 0.85fr; }
      .issuer-card { grid-column: 1 / -1; border-right: 0; border-bottom: 1px solid #000; }
      .document-card { border-right: 1px solid #000; }
    }
    @media screen and (max-width: 480px) {
      .document-header { grid-template-columns: 1fr; }
      .issuer-card,
      .document-card { border-right: 0; border-bottom: 1px solid #000; }
      .issuer-card { justify-content: flex-start; }
      .consultation-header { align-items: center; }
      .totals-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .consumer-grid { grid-template-columns: 1fr 1fr; }
      .consumer-name,
      .consumer-tax-id,
      .consumer-address { grid-column: span 2; border-right: 0; }
      .consumer-field { border-bottom: 1px solid #000; }
      .consumer-address { border-bottom: 1px solid #000; }
      .consumer-field.consumer-municipality { border-right: 1px solid #000; border-bottom: 0; }
      .consumer-field.consumer-state { border-bottom: 0; }
      .authorization-grid { grid-template-columns: 1fr 1fr; }
      .authorization-field:nth-child(2n) { border-right: 0; }
      .authorization-field:nth-child(-n + 2) { border-bottom: 1px solid #000; }
      .authorization-field:nth-child(n + 3) { border-bottom: 0; }
      .additional-info-section { grid-template-columns: 1fr; }
      .additional-info-cell + .additional-info-cell { border-top: 1px solid #000; border-left: 0; }
    }
    body.danfe-pagination-measuring .danfe-nfce-a4 {
      position: relative !important;
      width: 200mm !important;
      max-width: 200mm !important;
      margin: 0 !important;
    }
    body.danfe-pagination-measuring .danfe-pages {
      position: absolute !important;
      top: 0 !important;
      left: -10000px !important;
      display: block !important;
      width: 200mm !important;
    }
    body.danfe-pagination-measuring .danfe-page {
      width: 200mm !important;
      height: 287mm !important;
      margin: 0 !important;
    }
    body.danfe-pagination-measuring .document-header { grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.78fr) minmax(0, 1fr) !important; }
    body.danfe-pagination-measuring .issuer-card { grid-column: auto !important; border-right: 1px solid #000 !important; border-bottom: 0 !important; }
    body.danfe-pagination-measuring .document-card { border-right: 1px solid #000 !important; border-bottom: 0 !important; }
    body.danfe-pagination-measuring .totals-grid { grid-template-columns: repeat(auto-fit, minmax(23mm, 1fr)) !important; }
    body.danfe-pagination-measuring .consumer-grid { grid-template-columns: 2fr 1fr 1.5fr 0.8fr !important; }
    body.danfe-pagination-measuring .consumer-name,
    body.danfe-pagination-measuring .consumer-tax-id,
    body.danfe-pagination-measuring .consumer-address { grid-column: span 2 !important; border-right: 0 !important; }
    body.danfe-pagination-measuring .consumer-field { border-bottom: 1px solid #000 !important; }
    body.danfe-pagination-measuring .consumer-address,
    body.danfe-pagination-measuring .consumer-municipality,
    body.danfe-pagination-measuring .consumer-state { border-bottom: 0 !important; }
    body.danfe-pagination-measuring .consumer-municipality { border-right: 1px solid #000 !important; }
    body.danfe-pagination-measuring .consumer-state { border-right: 0 !important; }
    body.danfe-pagination-measuring .authorization-grid { grid-template-columns: 2fr 1.35fr 1.2fr 0.85fr !important; }
    body.danfe-pagination-measuring .authorization-field { border-bottom: 0 !important; border-right: 1px solid #000 !important; }
    body.danfe-pagination-measuring .authorization-field:last-child { border-right: 0 !important; }
    body.danfe-pagination-measuring .additional-info-section { grid-template-columns: 2fr 1fr !important; }
    body.danfe-pagination-measuring .additional-info-cell + .additional-info-cell { border-top: 0 !important; border-left: 1px solid #000 !important; }
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
      .danfe-pages { display: block !important; }
      .danfe-page {
        width: 100% !important;
        height: 287mm !important;
        margin: 0 !important;
      }
      .danfe-page:last-child { page-break-after: auto !important; break-after: auto !important; }
      .key-value { background: #ffffff !important; }
      .qr-svg-wrapper {
        border-color: #000 !important;
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
</body>
</html>`;
}

