import { DOMParser } from '@xmldom/xmldom';

function readSefazResult(response: string) {
  try {
    if (/<!DOCTYPE|<!ENTITY/i.test(response)) return null;
    let invalidXml = false;
    const xml = new DOMParser({ errorHandler(level, message) {
      if (level === 'warning' && String(message).includes('errorHandler') && String(message).includes('deprecated')) return;
      invalidXml = true;
    } })
      .parseFromString(response, 'text/xml');
    if (invalidXml) return null;
    const namespace = 'http://www.portalfiscal.inf.br/nfe';
    const results = [
      ...Array.from(xml.getElementsByTagNameNS('*', 'retEnviNFe')),
      ...Array.from(xml.getElementsByTagNameNS('*', 'retConsSitNFe')),
    ];
    const protocols = xml.getElementsByTagNameNS('*', 'infProt');
    if (results.length !== 1 || protocols.length > 1) return null;
    const result = results[0];
    const protocol = protocols[0];
    if (result.namespaceURI !== namespace || (protocol && (protocol.namespaceURI !== namespace ||
        protocol.parentNode?.localName !== 'protNFe' ||
        protocol.parentNode.namespaceURI !== namespace || protocol.parentNode.parentNode !== result))) return null;
    const directValue = (element: typeof result, name: string) => {
      const children = Array.from(element.childNodes).filter(
        node => node.nodeType === 1 && 'localName' in node && node.localName === name
      );
      const child = children[0];
      return children.length === 1 && child && 'namespaceURI' in child && child.namespaceURI === namespace
        ? child.textContent?.trim() : undefined;
    };
    return { result, protocol, directValue };
  } catch {
    return null;
  }
}

/** Match a single synchronous authorization or consultation to the prepared attempt. */
export function matchesSefazAuthorization(
  response: string,
  expected: { accessKey: string; environment: 1 | 2; protocolNumber: string }
): boolean {
  const parsed = readSefazResult(response);
  if (!parsed?.protocol || !/^\d{15}$/.test(expected.protocolNumber)) return false;
  const { result, protocol, directValue } = parsed;
  const consultation = result.localName === 'retConsSitNFe';
  return directValue(result, 'cStat') === (consultation ? '100' : '104') &&
    directValue(result, 'tpAmb') === String(expected.environment) &&
    (!consultation || directValue(result, 'chNFe') === expected.accessKey) &&
    directValue(protocol, 'cStat') === '100' &&
    directValue(protocol, 'tpAmb') === String(expected.environment) &&
    directValue(protocol, 'chNFe') === expected.accessKey &&
    directValue(protocol, 'nProt') === expected.protocolNumber &&
    Number.isFinite(Date.parse(directValue(protocol, 'dhRecbto') || ''));
}

/** A definitive rejection must belong to this transmission, rather than a failed HTTP/SOAP exchange. */
export function matchesSefazTransmissionResponse(
  response: string,
  expected: { accessKey: string; environment: 1 | 2 }
): boolean {
  const parsed = readSefazResult(response);
  if (!parsed) return false;
  const { result, protocol, directValue } = parsed;
  const batchStatus = directValue(result, 'cStat') || '';
  if (result.localName !== 'retEnviNFe' || directValue(result, 'tpAmb') !== String(expected.environment) ||
      !/^\d{3}$/.test(batchStatus)) return false;
  if (!protocol) return !['100', '104'].includes(batchStatus);
  return batchStatus === '104' && /^\d{3}$/.test(directValue(protocol, 'cStat') || '') &&
    directValue(protocol, 'tpAmb') === String(expected.environment) &&
    directValue(protocol, 'chNFe') === expected.accessKey;
}
