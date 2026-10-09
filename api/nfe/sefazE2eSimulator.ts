import type { SefazSoapParams } from './sefazClient';

const OPERATIONAL_SUPABASE_REFS = new Set([
  'hkoxhourxwlddgsfdgws',
  'wzpdfmihnwcrgkyagwkd',
]);

const APPROVED_SEFAZ_HOSTS = new Set([
  'homologacao.nfe.sefa.pr.gov.br',
  'homologacao.nfce.sefa.pr.gov.br',
]);

export interface FiscalE2eSimulatorEnvironment {
  FISCAL_E2E_ALLOWED_SUPABASE_REF?: string;
  FISCAL_E2E_SIMULATOR_ENABLED?: string;
  MORANTE_ENV_SOURCE?: string;
  NFE_E2E_SEFAZ_MODE?: string;
  NFE_ENVIRONMENT?: string;
  NFE_PRODUCTION_ENABLED?: string;
  SUPABASE_URL?: string;
  VERCEL_ENV?: string;
  VITE_SUPABASE_URL?: string;
}

function projectRef(supabaseUrl: string | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) return null;
    return url.hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function assertSimulatorEnvironment(env: FiscalE2eSimulatorEnvironment): void {
  const actualRef = projectRef(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
  const allowedRef = env.FISCAL_E2E_ALLOWED_SUPABASE_REF;
  if (
    env.NFE_E2E_SEFAZ_MODE !== 'simulated' ||
    env.FISCAL_E2E_SIMULATOR_ENABLED !== '1' ||
    env.MORANTE_ENV_SOURCE !== 'vercel-development' ||
    env.VERCEL_ENV !== 'development' ||
    env.NFE_ENVIRONMENT !== '2' ||
    ['true', '1'].includes((env.NFE_PRODUCTION_ENABLED || '').toLowerCase()) ||
    !actualRef ||
    !allowedRef ||
    actualRef !== allowedRef ||
    OPERATIONAL_SUPABASE_REFS.has(actualRef)
  ) {
    throw Object.assign(
      new Error('Simulador fiscal E2E bloqueado: projeto operacional, ambiente não aprovado ou sem proteção de Homologação.'),
      { code: 'FISCAL_E2E_SIMULATOR_GUARD_FAILED' }
    );
  }
}

/**
 * Produces a clearly marked authorization response only at the SOAP boundary.
 * It accepts the signed XML produced by the real issuance path and never edits it.
 */
export function simulateFiscalE2eSoap(
  params: Pick<SefazSoapParams, 'url' | 'action' | 'xmlPayload'>,
  env: FiscalE2eSimulatorEnvironment = process.env
): string | null {
  if (env.NFE_E2E_SEFAZ_MODE !== 'simulated') return null;

  assertSimulatorEnvironment(env);

  const endpoint = new URL(params.url);
  if (
    endpoint.protocol !== 'https:' ||
    !APPROVED_SEFAZ_HOSTS.has(endpoint.hostname) ||
    !/NFeAutorizacao4\/nfeAutorizacaoLote$/.test(params.action)
  ) {
    throw Object.assign(
      new Error('O simulador fiscal E2E aceita somente autorização em endpoint oficial de Homologação.'),
      { code: 'FISCAL_E2E_SIMULATOR_ACTION_NOT_SUPPORTED' }
    );
  }

  const environments = [...params.xmlPayload.matchAll(/<(?:[\w.-]+:)?tpAmb\b[^>]*>\s*([^<]+)\s*<\/(?:[\w.-]+:)?tpAmb>/gi)];
  const models = [...params.xmlPayload.matchAll(/<(?:[\w.-]+:)?mod\b[^>]*>\s*([^<]+)\s*<\/(?:[\w.-]+:)?mod>/gi)];
  const invoiceIds = [
    ...params.xmlPayload.matchAll(/<(?:[\w.-]+:)?infNFe\b[^>]*\bId=["']NFe(\d{44})["'][^>]*>/gi),
  ];
  if (
    environments.length !== 1 ||
    environments[0][1].trim() !== '2' ||
    models.length !== 1 ||
    !['55', '65'].includes(models[0][1].trim()) ||
    invoiceIds.length !== 1 ||
    (models[0][1].trim() === '65') !== endpoint.hostname.includes('nfce.')
  ) {
    throw Object.assign(
      new Error('O XML encaminhado ao simulador não é uma única NF-e/NFC-e de Homologação válida.'),
      { code: 'FISCAL_E2E_SIMULATOR_XML_INVALID' }
    );
  }

  const accessKey = invoiceIds[0][1];
  const protocol = `9${accessKey.slice(-14)}`;
  const receiptDate = new Date().toISOString();
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">' +
    '<tpAmb>2</tpAmb><verAplic>MoranteHub-E2E-SIMULATOR</verAplic>' +
    '<cStat>104</cStat><xMotivo>Simulador E2E: lote processado sem contato com a SEFAZ.</xMotivo>' +
    '<protNFe versao="4.00"><infProt>' +
    '<tpAmb>2</tpAmb><verAplic>MoranteHub-E2E-SIMULATOR</verAplic>' +
    `<chNFe>${accessKey}</chNFe><dhRecbto>${receiptDate}</dhRecbto>` +
    `<nProt>${protocol}</nProt><digVal>E2E-SIMULATED</digVal>` +
    '<cStat>100</cStat><xMotivo>Simulador E2E: autorização simulada; nenhuma transmissão à SEFAZ ocorreu.</xMotivo>' +
    '</infProt></protNFe></retEnviNFe>'
  );
}
