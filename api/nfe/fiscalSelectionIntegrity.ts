import type { FiscalDocument, FiscalSnapshotCandidate } from './fiscalSnapshot';
import { parseFiscalItemSelections } from '../../shared-utils/fiscalItemSelections';

/** A rule may reject a selection; it may never silently replace the confirmed form. */
export function assertFiscalSelectionIntegrity(snapshot: FiscalSnapshotCandidate, document: FiscalDocument): void {
  const selections = parseFiscalItemSelections(snapshot.emissionRequest.itemFiscalSelections);
  if (!Object.keys(selections).length) return; // Legacy snapshots have no form contract.
  if (Object.keys(selections).length !== document.items.length)
    throw new Error('Formulário e documento possuem quantidades de itens diferentes.');
  for (const item of document.items) {
    const selected = selections[String(item.itemNumber)];
    const icms = item.taxes.find((tax) => tax.group === 'ICMS');
    if (!selected || selected.ncm !== item.classification.ncm ||
        selected.cfop !== item.classification.cfop || selected.origem !== item.classification.origin ||
        selected.cest !== (item.classification.cest || '') ||
        icms?.codeSystem !== 'CSOSN' || selected.csosn !== icms.code)
      throw new Error(`Campos confirmados no formulário divergem da determinação fiscal do item ${item.itemNumber}.`);
  }
}

/** Parse the actual signed XML at the transport boundary, including retry XML. */
export async function assertXmlFiscalSelections(snapshot: FiscalSnapshotCandidate, xml: string): Promise<void> {
  const selections = parseFiscalItemSelections(snapshot.emissionRequest.itemFiscalSelections);
  if (!Object.keys(selections).length) return;
  const { XmlDocument } = await import('libxml2-wasm');
  const parsed = XmlDocument.fromString(xml);
  try {
    const namespace = { n: 'http://www.portalfiscal.inf.br/nfe' };
    const items = parsed.find('//n:NFe/n:infNFe/n:det', namespace);
    if (items.length !== Object.keys(selections).length)
      throw new Error('XML assinado diverge da quantidade de itens confirmada.');
    for (const [key, selected] of Object.entries(selections)) {
      const base = `//n:NFe/n:infNFe/n:det[@nItem='${key}']`;
      const paths = { ncm: '/n:prod/n:NCM', cfop: '/n:prod/n:CFOP', cest: '/n:prod/n:CEST',
        origem: '/n:imposto/n:ICMS/*/n:orig', csosn: '/n:imposto/n:ICMS/*/n:CSOSN' };
      for (const [field, suffix] of Object.entries(paths)) {
        const nodes = parsed.find(base + suffix, namespace);
        const expected = selected[field as keyof typeof selected];
        if (nodes.length !== (expected === '' ? 0 : 1) || (nodes[0]?.content || '') !== expected)
          throw new Error(`XML assinado diverge do formulário: item ${key}, campo ${field}.`);
      }
    }
  } finally { parsed.dispose(); }
}
