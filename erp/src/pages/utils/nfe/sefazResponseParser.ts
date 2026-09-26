export interface SefazAuthorizationResult {
    authorized: boolean;
    pending: boolean;
    cStat: string;
    xMotivo: string;
    protocolNumber?: string;
    protocolDate?: string;
}

function firstTag(xml: string, tag: string): string {
    const qualifiedTag = `(?:[\\w.-]+:)?${tag}`;
    return xml.match(new RegExp(`<${qualifiedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${qualifiedTag}>`, 'i'))?.[1]?.trim() || '';
}

function decodeXmlText(value: string): string {
    return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

/** A autorização válida fica no cStat de protNFe/infProt (100), não no cStat 104 do lote. */
export function parseSefazAuthorization(xml: string): SefazAuthorizationResult {
    const protocolXml = xml.match(/<(?:[\w.-]+:)?protNFe\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?protNFe>/i)?.[1] || '';
    const batchStatus = firstTag(xml, 'cStat');
    const protocolStatus = protocolXml ? firstTag(protocolXml, 'cStat') : '';
    const cStat = protocolStatus || batchStatus;
    const xMotivo = decodeXmlText(firstTag(protocolXml || xml, 'xMotivo'));
    const protocolNumber = firstTag(protocolXml, 'nProt') || undefined;
    const protocolDate = firstTag(protocolXml, 'dhRecbto') || undefined;
    const authorized = cStat === '100' && Boolean(protocolNumber);
    const pending = !protocolXml && ['103', '104', '105'].includes(batchStatus);

    return { authorized, pending, cStat, xMotivo, protocolNumber, protocolDate };
}
