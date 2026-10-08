import type Order from '@/pages/types/order.type';
import { fiscalPresence } from '../../../../../shared-utils/fiscalDocumentModel';
import type { AppSettings } from '../settingsService';
import { buildDestXml } from './xml/xmlDestBlock';
import { buildEmitXml, buildIdeXml } from './xml/xmlEmitterBlock';
import { buildItemsXml } from './xml/xmlItemsBlock';
import { buildTotalsAndPaymentXml } from './xml/xmlTotalsBlock';

export interface NfeXmlBuilderParams {
  order: Order;
  settings: AppSettings;
  accessKey: string;
  randomCode: string;
  checkDigit: number;
  nfeNumber: number;
  series: string;
  model: '55' | '65'; // 55 = NF-e, 65 = NFC-e
  environment: 1 | 2; // 1 = Produção, 2 = Homologação
  issuedAt?: Date;
}

function getSaoPauloDateParts(instant: Date): Record<string, string> {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime()))
    throw new Error('Instante de emissão inválido.');

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getNfeYearMonth(instant: Date): string {
  const parts = getSaoPauloDateParts(instant);
  return `${parts.year.slice(-2)}${parts.month}`;
}

export function formatNfeDateTime(instant: Date): string {
  const parts = getSaoPauloDateParts(instant);
  const localTimeAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMinutes = Math.round((localTimeAsUtc - instant.getTime()) / 60_000);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const offset = `${sign}${String(Math.floor(absoluteOffsetMinutes / 60)).padStart(2, '0')}:${String(absoluteOffsetMinutes % 60).padStart(2, '0')}`;

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

/**
 * Constrói o XML oficial da NF-e / NFC-e no Layout 4.00 da SEFAZ
 */
export function buildNfeXml(params: NfeXmlBuilderParams): string {
  const {
    order,
    settings,
    accessKey,
    randomCode,
    checkDigit,
    nfeNumber,
    series,
    model,
    environment,
    issuedAt,
  } = params;
  const isHomologacao = environment === 2;
  const dhEmi = formatNfeDateTime(issuedAt || new Date());
  const acquisitionPurpose = String(order.fiscalContext?.acquisitionPurpose || '');
  if (!['resale', 'use_consumption', 'fixed_asset'].includes(acquisitionPurpose)) {
    throw new Error('Registre a finalidade da compra no pedido antes de montar o XML fiscal.');
  }
  const finalConsumer = acquisitionPurpose !== 'resale';
  if (
    typeof order.fiscalContext?.finalConsumer === 'boolean' &&
    order.fiscalContext.finalConsumer !== finalConsumer
  ) {
    throw new Error('O indFinal persistido não corresponde à finalidade da compra no pedido.');
  }

  // 1. Bloco de Identificação (<ide>)
  const ideXml = buildIdeXml({
    accessKey,
    randomCode,
    checkDigit,
    nfeNumber,
    series,
    model,
    environment,
    dhEmi,
    municipalityCode: settings.companyCMun,
    finalConsumer: finalConsumer ? 1 : 0,
    presenceIndicator: Number(
      fiscalPresence(model, order.shipping?.deliveryMethod, order.fiscalContext?.presence)
    ) as 0 | 1 | 2 | 3 | 4 | 5 | 9,
  });

  // 2. Bloco do Emitente (<emit>)
  const emitXml = buildEmitXml(settings);

  // 3. Bloco do Destinatário (<dest>)
  const destXml = buildDestXml(order, isHomologacao, model);

  // 4. Bloco de Produtos e Impostos (<det>)
  const { itemsXml, vProdTotal, vDescTotal } = buildItemsXml(order, settings, isHomologacao);

  // 5. Bloco de Totais, Transporte, Pagamento e Informações Adicionais (<total>, <transp>, <pag>, <infAdic>)
  const totalsXml = buildTotalsAndPaymentXml(order, vProdTotal, vDescTotal, model);

  // NFC-e online: QR Code v3 uses only access key, version and environment.
  const infNFeSupl =
    model === '65'
      ? (() => {
          const qrCode = `http://www.fazenda.pr.gov.br/nfce/qrcode?p=${accessKey}|3|${environment}`;
          return `\n<infNFeSupl><qrCode><![CDATA[${qrCode}]]></qrCode><urlChave>http://www.fazenda.pr.gov.br/nfce/consulta</urlChave></infNFeSupl>`;
        })()
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${accessKey}" versao="4.00">${ideXml}${emitXml}${destXml}${itemsXml}${totalsXml}
  </infNFe>
  ${infNFeSupl}
</NFe>`;
}
