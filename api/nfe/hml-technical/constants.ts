import { ACCESS_KEY_PATTERN } from '../../../shared-utils/fiscalIdentifiers.js';
import { HML_TECHNICAL_RULESET_VERSION } from '../hmlTechnicalRuleSet';
import { HML_NORMAL_SALE_RULESET_VERSION } from '../hmlNormalSaleRuleSet';
import { getNfeServiceEndpoint } from '../fiscalEnvironmentPolicy';
import type { FiscalDatabase } from '../fiscalDatabaseTypes';
import type { Result } from './types';

export const isHmlRuleSet = (version: unknown) =>
  version === HML_TECHNICAL_RULESET_VERSION ||
  version === 'HML_NORMAL_SALE_V1' ||
  version === HML_NORMAL_SALE_RULESET_VERSION;

export const hmlEndpoint = (model: unknown, service: string) => {
  if (model !== '55' && model !== '65') throw new Error('Modelo fiscal inválido.');
  return getNfeServiceEndpoint(model, 2, service);
};

export const failure = (
  status: number,
  code: string,
  error: string,
  extra: Record<string, unknown> = {}
): Result => ({ status, body: { success: false, code, error, ...extra } });

export const SNAPSHOT_REASON_MESSAGES: Record<string, string> = {
  ORDER_NOT_ELIGIBLE_FOR_OUTBOUND_FISCAL: 'O pedido não é venda/showroom ativa ou está cancelado.',
  ORDER_FISCAL_DATA_UNAVAILABLE: 'O pedido não possui dados fiscais válidos.',
  ORDER_REVISION_UNAVAILABLE: 'O pedido não possui versão/data de atualização registrada.',
  HML_ORDER_NOT_ISOLATED:
    'O pedido técnico HML precisa estar isolado (rascunho, excluído e sem pagamentos).',
  NCM_NOT_ACTIVE: 'Algum item usa NCM inexistente, inativo ou fora da vigência.',
  ISSUER_PROFILE_UNAVAILABLE: 'Configurações da empresa emitente não encontradas.',
  HML_CSOSN_CONFIGURATION_UNAVAILABLE:
    'Configuração padrão de CSOSN da homologação não encontrada.',
  ISSUER_MUNICIPALITY_UNAVAILABLE:
    'Código IBGE do município do emitente ausente ou inválido (7 dígitos).',
  ALREADY_ACTIVE_FISCAL_ATTEMPT:
    'Já existe uma tentativa fiscal em andamento para este pedido. Consulte o status antes de emitir novamente.',
  HML_ORDER_ALREADY_HAS_ATTEMPT:
    'O pedido de teste técnico HML já possui uma tentativa registrada.',
};

export const hasProtocolKey = (xml: string, key: string) => {
  const protocol =
    xml.match(/<(?:[\w.-]+:)?protNFe\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?protNFe>/i)?.[1] || '';
  return (
    ACCESS_KEY_PATTERN.test(key) &&
    new RegExp(`<(?:[\\w.-]+:)?chNFe>\\s*${key}\\s*<\\/(?:[\\w.-]+:)?chNFe>`, 'i').test(protocol)
  );
};

export function saoPauloTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error('Data da reserva inválida.');
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value])
  );
  const offset = String(parts.timeZoneName || '').replace('GMT', '') || '+00:00';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

/** NFC-e authorizations reject dhEmi more than five minutes behind SEFAZ time. */
export function nfceXmlNeedsFreshEmission(xml: string | null | undefined, now = Date.now()) {
  const issuedAtText = xml?.match(/<dhEmi>([^<]+)<\/dhEmi>/)?.[1];
  const issuedAt = issuedAtText ? Date.parse(issuedAtText) : Number.NaN;
  // Leave a one-minute margin for signing, network latency, and SEFAZ queueing.
  return !Number.isFinite(issuedAt) || now - issuedAt >= 4 * 60_000 || issuedAt > now + 60_000;
}

export function freshNfceEmissionRequired(
  doc: FiscalDatabase['public']['Tables']['nfe_documents']['Row'],
  cStat: string
) {
  return failure(
    409,
    'HML_NEW_EMISSION_REQUIRED',
    cStat === '217'
      ? 'A SEFAZ confirmou que a NFC-e original não consta, mas seu horário de emissão expirou. Inicie uma nova tentativa para gerar XML assinado com horário e numeração atuais.'
      : 'A SEFAZ rejeitou a NFC-e original por data-hora de emissão atrasada. Inicie uma nova tentativa para gerar XML assinado com horário e numeração atuais.',
    {
      documentId: doc.id,
      orderId: doc.order_id,
      accessKey: doc.chave_acesso,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      environment: 2,
      cStat,
      pending: false,
      sefazContacted: true,
      safeNewEmission: true,
    }
  );
}
