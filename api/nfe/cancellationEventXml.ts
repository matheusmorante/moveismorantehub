import { formatNfeDateTime } from '../../erp/src/pages/utils/nfe/nfeXmlBuilder';

export const escapeXml = (value: string): string =>
  value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[character] as string
  );

/**
 * Extrai o CNPJ do emitente do XML da NF-e original autorizada.
 * Suporta o formato padrão de 14 caracteres (incluindo eventual CNPJ alfanumérico pela NT 2026.004).
 */
export function extractIssuerCnpjFromXml(xml: string): string | null {
  return xml.match(/<emit\b[^>]*>[\s\S]*?<CNPJ>([A-Z0-9]{12}[0-9]{2})<\/CNPJ>/i)?.[1] || null;
}

export interface BuildCancellationEventXmlParams {
  chaveAcesso: string;
  environment: number;
  issuerCnpj: string;
  protocolNumber: string | number;
  reason: string;
  timestamp?: string;
  batchId?: string;
}

/**
 * Constrói o envelope XML oficial do Evento 110111 (Cancelamento de NF-e / NFC-e) no leiaute 1.00.
 */
export function buildCancellationEventXml(params: BuildCancellationEventXmlParams): string {
  const timestamp = params.timestamp || formatNfeDateTime(new Date());
  const batchId = params.batchId || Date.now().toString().slice(-15);
  const escapedProtocol = escapeXml(String(params.protocolNumber));
  const escapedReason = escapeXml(params.reason.trim());

  return (
    '<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">' +
    `<idLote>${batchId}</idLote>` +
    '<evento versao="1.00">' +
    `<infEvento Id="ID110111${params.chaveAcesso}01">` +
    '<cOrgao>41</cOrgao>' +
    `<tpAmb>${params.environment}</tpAmb>` +
    `<CNPJ>${params.issuerCnpj}</CNPJ>` +
    `<chNFe>${params.chaveAcesso}</chNFe>` +
    `<dhEvento>${timestamp}</dhEvento>` +
    '<tpEvento>110111</tpEvento>' +
    '<nSeqEvento>1</nSeqEvento>' +
    '<verEvento>1.00</verEvento>' +
    '<detEvento versao="1.00">' +
    '<descEvento>Cancelamento</descEvento>' +
    `<nProt>${escapedProtocol}</nProt>` +
    `<xJust>${escapedReason}</xJust>` +
    '</detEvento>' +
    '</infEvento>' +
    '</evento>' +
    '</envEvento>'
  );
}
