import { randomInt } from 'node:crypto';
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
  const { accessKey, environment, recipientCnpj } = input;
  if (!/^\d{44}$/.test(accessKey) || accessKey.slice(20, 22) !== '55')
    throw new Error('A Ciência da Emissão deste fluxo exige chave de NF-e modelo 55 válida.');
  if (!/^\d{14}$/.test(recipientCnpj) || accessKey.slice(6, 20) !== recipientCnpj)
    throw new Error('O CNPJ destinatário não corresponde à chave de acesso da NF-e.');
  if (environment !== 1 && environment !== 2)
    throw new Error('O ambiente fiscal da NF-e não foi identificado.');

  const batchId = `${String(randomInt(0, 1_000_000_000_000)).padStart(12, '0')}${String(randomInt(0, 1000)).padStart(3, '0')}`;
  const timestamp = formatNfeDateTime(new Date());
  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${batchId}</idLote><evento versao="1.00"><infEvento Id="ID210210${accessKey}01"><cOrgao>91</cOrgao><tpAmb>${environment}</tpAmb><CNPJ>${recipientCnpj}</CNPJ><chNFe>${accessKey}</chNFe><dhEvento>${timestamp}</dhEvento><tpEvento>210210</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento></infEvento></evento></envEvento>`;
}

export interface InboundManifestationResponse {
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
