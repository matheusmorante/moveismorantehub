import { randomInt } from 'node:crypto';
import { ACCESS_KEY_PATTERN, CNPJ_PATTERN } from '../../shared-utils/fiscalIdentifiers.js';
import { formatNfeDateTime } from '../../erp/src/pages/utils/nfe/nfeXmlBuilder';

const extractTag = (xml: string, tag: string): string => {
  const match = xml.match(
    new RegExp(`<(?:(?:[\\w.-]+):)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${tag}\\s*>`, 'i')
  );
  return match?.[1]?.trim() || '';
};

const extractBlock = (xml: string, tag: string): string => {
  const match = xml.match(
    new RegExp(`<(?:(?:[\\w.-]+):)?${tag}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[\\w.-]+):)?${tag}\\s*>`, 'i')
  );
  return match?.[0] || '';
};

export function buildInboundScienceEventXml(input: {
  accessKey: string;
  environment: 1 | 2;
  recipientCnpj: string;
}): string {
  const batchId = `${String(randomInt(0, 1_000_000_000_000)).padStart(12, '0')}${String(randomInt(0, 1000)).padStart(3, '0')}`;
  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${batchId}</idLote>${buildInboundScienceEventElement(input)}</envEvento>`;
}

export function buildInboundScienceEventElement(input: {
  accessKey: string;
  environment: 1 | 2;
  recipientCnpj: string;
}): string {
  const { accessKey, environment, recipientCnpj } = input;
  if (!ACCESS_KEY_PATTERN.test(accessKey) || accessKey.slice(20, 22) !== '55')
    throw new Error('A Ciência da Emissão deste fluxo exige chave de NF-e modelo 55 válida.');
  if (!CNPJ_PATTERN.test(recipientCnpj))
    throw new Error('O CNPJ destinatário informado para a Ciência é inválido.');
  if (environment !== 1 && environment !== 2)
    throw new Error('O ambiente fiscal da NF-e não foi identificado.');

  const timestamp = formatNfeDateTime(new Date());
  return `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><infEvento Id="ID210210${accessKey}01"><cOrgao>91</cOrgao><tpAmb>${environment}</tpAmb><CNPJ>${recipientCnpj}</CNPJ><chNFe>${accessKey}</chNFe><dhEvento>${timestamp}</dhEvento><tpEvento>210210</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento></infEvento></evento>`;
}

export function buildInboundScienceEventBatchXml(signedEvents: string[]): string {
  if (signedEvents.length < 1 || signedEvents.length > 20)
    throw new Error('O lote de Ciência deve conter entre 1 e 20 eventos.');
  if (signedEvents.some((event) =>
    !/^<evento\b[\s\S]*<infEvento\b/i.test(event) ||
    !/<Signature\b/i.test(event)
  )) {
    throw new Error('O lote contém evento sem a assinatura digital esperada.');
  }
  const batchId = `${String(randomInt(0, 1_000_000_000_000)).padStart(12, '0')}${String(randomInt(0, 1000)).padStart(3, '0')}`;
  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${batchId}</idLote>${signedEvents.join('')}</envEvento>`;
}

export interface InboundManifestationResponse {
  accessKey?: string | null;
  responseXml?: string;
  status: 'registered' | 'rejected' | 'unknown';
  cStat: string | null;
  xMotivo: string | null;
  protocolNumber: string | null;
  protocolDate: string | null;
}

export function parseInboundManifestationResponse(xml: string): InboundManifestationResponse {
  const eventResult = extractBlock(xml, 'retEvento');
  const batchResult = extractBlock(xml, 'retEnvEvento') || xml;
  const resultXml = eventResult || batchResult;
  const cStat = extractTag(resultXml, 'cStat') || null;
  const xMotivo = extractTag(resultXml, 'xMotivo') || null;
  const protocolNumber = extractTag(resultXml, 'nProt') || null;
  const protocolDate = extractTag(resultXml, 'dhRegEvento') || null;

  if (eventResult && ['135', '136'].includes(cStat || '')) {
    return { status: 'registered', cStat, xMotivo, protocolNumber, protocolDate };
  }
  if (!cStat || cStat === '128' || cStat === '573') {
    return { status: 'unknown', cStat, xMotivo, protocolNumber, protocolDate };
  }
  return { status: 'rejected', cStat, xMotivo, protocolNumber, protocolDate };
}

export function parseInboundManifestationBatchResponse(xml: string): InboundManifestationResponse[] {
  const blocks = [...xml.matchAll(/<(?:[\w.-]+:)?retEvento\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?retEvento\s*>/gi)]
    .map((match) => match[0]);
  return blocks.map((block) => ({
    accessKey: extractTag(block, 'chNFe') || null,
    responseXml: block,
    ...parseInboundManifestationResponse(block),
  }));
}
