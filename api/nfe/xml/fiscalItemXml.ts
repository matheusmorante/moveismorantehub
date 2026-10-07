import { validateItemCfopMatch } from '../../../shared-utils/fiscalCfopModel';
import type { FiscalDocument } from '../fiscalSnapshot';
import { serializeFiscalTaxes } from './fiscalTaxXml';
import { decimal, money, requireCode, tag } from './xmlPrimitives';
export function serializeFiscalItems(document: FiscalDocument): string {
  const operation = document.operation;
  const destination = operation.destination;
  if (destination !== '1' && destination !== '2' && destination !== '3')
    throw new Error('Destino fiscal do item ausente ou inválido.');
  return document.items
    .map((item) => {
      const p = item.product;
      const c = item.classification;
      requireCode(c.ncm, /^\d{8}$/, `NCM do item ${item.itemNumber}`);
      requireCode(c.cfop, /^\d{4}$/, `CFOP do item ${item.itemNumber}`);
      const cfopMatch = validateItemCfopMatch({
        cfop: c.cfop,
        destination,
        model: document.model,
        direction: operation.direction,
        itemType: 'product',
        operationType: 'sale',
      });
      if (!cfopMatch.valid)
        throw new Error(`CFOP do item ${item.itemNumber} inválido: ${cfopMatch.reason}`);
      requireCode(c.origin, /^[0-8]$/, `Origem do item ${item.itemNumber}`);
      const product =
        `<prod>${tag('cProd', p.code)}${tag('cEAN', p.gtin)}` +
        `${tag('xProd', document.environment === 2 && item.itemNumber === 1 ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : p.description)}` +
        `${tag('NCM', c.ncm)}${c.cest ? tag('CEST', requireCode(c.cest, /^\d{7}$/, 'CEST')) : ''}` +
        `${c.benefitCode ? tag('cBenef', c.benefitCode) : ''}${tag('CFOP', c.cfop)}` +
        `${tag('uCom', c.unit)}${tag('qCom', decimal(p.quantity, 4))}` +
        `${tag('vUnCom', decimal(p.unitValue, 4))}${tag('vProd', money(p.gross))}` +
        `${tag('cEANTrib', p.gtin)}${tag('uTrib', c.unit)}` +
        `${tag('qTrib', decimal(p.quantity, 4))}${tag('vUnTrib', decimal(p.unitValue, 4))}` +
        `${p.freight ? tag('vFrete', money(p.freight)) : ''}` +
        `${p.insurance ? tag('vSeg', money(p.insurance)) : ''}` +
        `${p.discount ? tag('vDesc', money(p.discount)) : ''}` +
        `${p.otherExpenses ? tag('vOutro', money(p.otherExpenses)) : ''}` +
        `${tag('indTot', '1')}</prod>`;
      return `<det nItem="${item.itemNumber}">${product}${serializeFiscalTaxes(item.taxes, c.origin)}</det>`;
    })
    .join('');
}
