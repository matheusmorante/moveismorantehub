/** Standalone declarations cannot be nested in SOAP/batch XML. Signature content stays intact. */
export function embeddedNfeXml(xml: string): string {
  return xml.replace(/^\uFEFF?\s*<\?xml\s[^?]*\?>\s*/, '');
}
