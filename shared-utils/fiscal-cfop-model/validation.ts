import { getCfopDefinition } from './catalog';
import type {
  FiscalCfopScope,
  ValidateItemCfopMatchParams,
  ValidateItemCfopMatchResult,
} from './types';

/**
 * Validação rigorosa de correspondência entre CFOP, destino (idDest), modelo (55/65) e tipo de item.
 */
export function validateItemCfopMatch(
  params: ValidateItemCfopMatchParams
): ValidateItemCfopMatchResult {
  const {
    cfop,
    destination,
    model,
    direction = 'outbound',
    itemType = 'product',
    operationType,
    merchandiseOrigin,
    isSt,
  } = params;

  const def = getCfopDefinition(cfop);
  if (!def) {
    return { valid: false, reason: `CFOP ${cfop} não existe no catálogo oficial do sistema.` };
  }
  if (!def.active) {
    return { valid: false, reason: `CFOP ${cfop} está desativado para novas emissões.` };
  }
  if (def.direction !== direction) {
    return {
      valid: false,
      reason: `CFOP ${cfop} é de ${def.direction === 'inbound' ? 'entrada' : 'saída'}, mas a operação é de ${direction === 'inbound' ? 'entrada' : 'saída'}.`,
    };
  }
  if (operationType && def.operationType !== operationType) {
    return {
      valid: false,
      reason: `CFOP ${cfop} é classificado como ${def.operationType}, incompatível com a operação ${operationType}.`,
    };
  }
  if (merchandiseOrigin && def.merchandiseOrigin !== merchandiseOrigin) {
    return {
      valid: false,
      reason: `CFOP ${cfop} classifica mercadoria ${def.merchandiseOrigin}, incompatível com ${merchandiseOrigin}.`,
    };
  }
  const stApplicability =
    def.stApplicability || (def.isSt ? 'required' : def.itemType === 'product' ? 'not_required' : 'not_applicable');
  if (isSt === true && stApplicability === 'not_required') {
    return { valid: false, reason: `CFOP ${cfop} não se aplica a item sujeito a ST.` };
  }
  if (isSt === false && stApplicability === 'required') {
    return { valid: false, reason: `CFOP ${cfop} exige item sujeito a ST.` };
  }
  if (itemType === 'product' && def.itemType === 'service') {
    return {
      valid: false,
      reason: `CFOP ${cfop} pertence a prestação de serviço (ISSQN) e não pode ser utilizado para venda de mercadoria.`,
    };
  }
  if (itemType === 'service' && def.itemType === 'product') {
    return {
      valid: false,
      reason: `CFOP ${cfop} é de venda de mercadoria e não pode ser utilizado para prestação de serviço.`,
    };
  }
  if (model === '65') {
    if (destination !== '1') {
      return { valid: false, reason: 'NFC-e (modelo 65) não permite operação interestadual.' };
    }
    if (!cfop.startsWith('5')) {
      return { valid: false, reason: `CFOP ${cfop} inválido para NFC-e (modelo 65 exige CFOP 5xxx interno).` };
    }
  }
  if (!def.allowedModels.includes(model)) {
    return { valid: false, reason: `CFOP ${cfop} não é aceito para NF-e/NFC-e modelo ${model}.` };
  }
  const expectedScope: FiscalCfopScope | null =
    destination === '1' ? 'internal' : destination === '2' ? 'interstate' : 'foreign';
  if (def.scope !== expectedScope) {
    const scopeLabel =
      expectedScope === 'internal'
        ? 'interna (idDest=1)'
        : expectedScope === 'interstate'
          ? 'interestadual (idDest=2)'
          : 'com exterior (idDest=3)';
    return {
      valid: false,
      reason: `CFOP ${cfop} é incompatível com operação ${scopeLabel}.`,
    };
  }
  return { valid: true };
}
