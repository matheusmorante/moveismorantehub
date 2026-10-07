import {
  CANONICAL_CFOPS,
  getCfopDefinition,
  type FiscalCfopDirection,
  type FiscalCfopItemType,
  type FiscalCfopMerchandiseOrigin,
  type FiscalCfopOperationType,
  type FiscalCfopScope,
  type FiscalCfopStApplicability,
  type FiscalModelType,
} from './catalog';
/**
 * Validação rigorosa de correspondência entre CFOP, destino (idDest), modelo (55/65) e tipo de item.
 */
export function validateItemCfopMatch(params: {
  cfop: string;
  destination: '1' | '2' | '3';
  model: FiscalModelType;
  direction?: FiscalCfopDirection;
  itemType?: FiscalCfopItemType;
  operationType?: FiscalCfopOperationType;
  merchandiseOrigin?: FiscalCfopMerchandiseOrigin;
  isSt?: boolean;
}): { valid: boolean; reason?: string } {
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

/** Retorna somente o CFOP coberto pela regra HML normal de venda atualmente aprovada. */
export function determineSaleCfop(params: {
  destination: '1' | '2' | '3';
  isOwnProduction?: boolean;
  isSt?: boolean;
  itemType?: FiscalCfopItemType;
  catalogCfop?: string;
  recipientIeIndicator?: string;
  finalConsumer?: boolean;
}): string {
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

/**
 * Lista opções formatadas para dropdowns/selects na interface, filtrando apenas CFOPs ativos.
 */
export function listActiveCfopOptions(filter?: {
  direction?: FiscalCfopDirection;
  scope?: FiscalCfopScope;
  model?: FiscalModelType;
  itemType?: FiscalCfopItemType;
  operationType?: FiscalCfopOperationType;
  merchandiseOrigin?: FiscalCfopMerchandiseOrigin;
  isSt?: boolean;
}): Array<{
  value: string;
  label: string;
  operationType: FiscalCfopOperationType;
  merchandiseOrigin: FiscalCfopMerchandiseOrigin;
  isSt: boolean;
  stApplicability: FiscalCfopStApplicability;
}> {
  return CANONICAL_CFOPS.filter((item) => {
    if (!item.active) return false;
    if (filter?.direction && item.direction !== filter.direction) return false;
    if (filter?.scope && item.scope !== filter.scope) return false;
    if (filter?.itemType && item.itemType !== filter.itemType) return false;
    if (filter?.model && !item.allowedModels.includes(filter.model)) return false;
    if (filter?.operationType && item.operationType !== filter.operationType) return false;
    if (filter?.merchandiseOrigin && item.merchandiseOrigin !== filter.merchandiseOrigin)
      return false;
    const stApplicability =
      item.stApplicability ||
      (item.isSt ? 'required' : item.itemType === 'product' ? 'not_required' : 'not_applicable');
    if (filter?.isSt === true && stApplicability === 'not_required') return false;
    if (filter?.isSt === false && stApplicability === 'required') return false;
    return true;
  }).map((item) => ({
    value: item.code,
    label: `${item.code} - ${item.description}`,
    operationType: item.operationType,
    merchandiseOrigin: item.merchandiseOrigin,
    isSt: Boolean(item.isSt),
    stApplicability: item.stApplicability || (item.isSt ? 'required' : 'not_required'),
  }));
}
