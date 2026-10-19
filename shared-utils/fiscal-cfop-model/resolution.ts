import { getCfopDefinition } from './catalog';
import type { DetermineSaleCfopParams } from './types';

/**
 * Retorna somente o CFOP coberto pela regra HML normal de venda atualmente aprovada.
 */
export function determineSaleCfop(params: DetermineSaleCfopParams): string {
  const {
    destination,
    isOwnProduction,
    isSt,
    itemType = 'product',
    catalogCfop,
    recipientIeIndicator,
    finalConsumer,
  } = params;

  if (itemType === 'service')
    throw new Error('Prestação de serviço exige uma matriz fiscal específica aprovada.');

  const catDef = getCfopDefinition(catalogCfop);
  const effectiveIsOwnProduction = isOwnProduction ?? catDef?.isOwnProduction ?? false;
  const effectiveIsSt = isSt ?? catDef?.isSt ?? false;

  if (effectiveIsSt || effectiveIsOwnProduction)
    throw new Error('Mercadoria com ST ou de produção própria exige matriz fiscal específica aprovada.');

  if (destination === '2') {
    if (
      recipientIeIndicator === '9' ||
      (recipientIeIndicator === undefined && finalConsumer === true && catDef?.code === '6108')
    ) {
      return '6108';
    }
    return '6102';
  }

  if (destination !== '1')
    throw new Error(`Determinação fiscal de CFOP para destino idDest=${destination} não suportada.`);

  if (catDef && catDef.code !== '5102')
    throw new Error(`CFOP ${catDef.code} exige uma matriz fiscal específica aprovada.`);

  return '5102';
}
