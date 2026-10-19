import { ACCESS_KEY_PATTERN } from '../../../../../shared-utils/fiscalIdentifiers.js';

const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
const SIGNATURE_NAMESPACE = 'http://www.w3.org/2000/09/xmldsig#';

function parseXml(xml: string): Document {
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML fiscal inválido para download.');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('XML fiscal inválido para download.');
  return document;
}

const elements = (root: Document | Element, name: string) =>
  Array.from(root.getElementsByTagNameNS(NFE_NAMESPACE, name));
const text = (root: Document | Element, name: string) => elements(root, name)[0]?.textContent?.trim() || '';

/** Wraps the original signed bytes; only the SEFAZ protocol is serialized. */
export function buildAuthorizedNfeDownloadXml(input: {
  signedXml: string;
  protocolXml?: string | null;
  accessKey: string;
  environment: 1 | 2;
  protocolNumber?: string | null;
}): string {
  const invoice = parseXml(input.signedXml);
  const nfe = elements(invoice, 'NFe');
  const info = elements(invoice, 'infNFe');
  if (!ACCESS_KEY_PATTERN.test(input.accessKey) || nfe.length !== 1 || info.length !== 1
    || info[0].getAttribute('Id') !== `NFe${input.accessKey}` || info[0].getAttribute('versao') !== '4.00'
    || text(info[0], 'tpAmb') !== String(input.environment)) {
    throw new Error('Identidade ou ambiente do XML diverge do documento fiscal.');
  }
  const response = input.protocolXml ? parseXml(input.protocolXml) : invoice;
  const protocols = elements(response, 'protNFe').filter(protocol =>
    text(protocol, 'chNFe') === input.accessKey && text(protocol, 'tpAmb') === String(input.environment));
  if (protocols.length !== 1 || protocols[0].getAttribute('versao') !== '4.00' || !['100', '150'].includes(text(protocols[0], 'cStat'))
    || !/^\d{15}$/.test(text(protocols[0], 'nProt'))
    || (input.protocolNumber && text(protocols[0], 'nProt') !== input.protocolNumber)) {
    throw new Error('Protocolo de autorização ausente ou divergente para este XML.');
  }
  const digest = Array.from(nfe[0].getElementsByTagNameNS(SIGNATURE_NAMESPACE, 'DigestValue'));
  if (digest.length !== 1 || !digest[0].textContent?.trim()
    || digest[0].textContent.replace(/\s/g, '') !== text(protocols[0], 'digVal').replace(/\s/g, '')) {
    throw new Error('Protocolo de autorização não corresponde ao resumo do XML assinado.');
  }
  if (invoice.documentElement.localName === 'nfeProc') {
    const embedded = elements(invoice, 'protNFe');
    if (invoice.documentElement.namespaceURI !== NFE_NAMESPACE || invoice.documentElement.getAttribute('versao') !== '4.00'
      || embedded.length !== 1 || !['100', '150'].includes(text(embedded[0], 'cStat'))
      || text(embedded[0], 'nProt') !== text(protocols[0], 'nProt')
      || text(embedded[0], 'chNFe') !== input.accessKey || text(embedded[0], 'tpAmb') !== String(input.environment)
      || text(embedded[0], 'digVal').replace(/\s/g, '') !== digest[0].textContent.replace(/\s/g, '')) {
      throw new Error('XML processado contém protocolo divergente.');
    }
    return input.signedXml;
  }
  if (invoice.documentElement !== nfe[0]) throw new Error('XML assinado não possui raiz NF-e válida.');
  const signedBytes = input.signedXml.replace(/^\uFEFF?\s*<\?xml[^?]*\?>\s*/i, '').trim();
  const protocol = new XMLSerializer().serializeToString(protocols[0]);
  return `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="${NFE_NAMESPACE}" versao="4.00">${signedBytes}${protocol}</nfeProc>`;
}
