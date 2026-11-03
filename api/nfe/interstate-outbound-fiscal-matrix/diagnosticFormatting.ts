import type { InterstateOutboundFiscalMatrixFacts } from './types';

export const diagnosticFieldLabels: Partial<Record<keyof InterstateOutboundFiscalMatrixFacts, string>> = {
  environment: 'Ambiente fiscal',
  model: 'Modelo fiscal',
  issuerRegime: 'CRT do emitente',
  issuerUf: 'UF de origem',
  destinationUf: 'UF de destino',
  destinationScope: 'Destino',
  operationType: 'Operação',
  purpose: 'Finalidade',
  recipientPersonType: 'Tipo de destinatário',
  recipientIeStatus: 'Destinatário / indIEDest',
  finalConsumer: 'Consumidor final / indFinal',
  merchandiseOrigin: 'Origem da mercadoria',
  productOrigin: 'Origem no ICMS / origem NF-e',
  ncm: 'NCM',
  cest: 'CEST',
  hasSt: 'Mercadoria sujeita a ST',
  stRole: 'Papel na substituição tributária',
  allowsIcmsCredit: 'Permite crédito de ICMS',
  recipientTaxRegime: 'Regime tributário do destinatário',
  productId: 'Produto',
  effectiveAt: 'Data de vigência avaliada',
};

export const diagnosticCriterionLabels: Partial<
  Record<keyof InterstateOutboundFiscalMatrixFacts, string>
> = {
  environment: 'ambiente fiscal',
  model: 'modelo fiscal',
  issuerRegime: 'CRT do emitente',
  issuerUf: 'UF de origem',
  destinationUf: 'UF de destino',
  destinationScope: 'tipo de destino',
  operationType: 'tipo de operação',
  purpose: 'finalidade',
  recipientPersonType: 'tipo de destinatário',
  recipientIeStatus: 'destinatário / indIEDest',
  finalConsumer: 'consumidor final / indFinal',
  merchandiseOrigin: 'origem da mercadoria',
  productOrigin: 'origem no ICMS / origem NF-e',
  ncm: 'NCM',
  cest: 'CEST',
  hasSt: 'mercadoria sujeita a ST',
  stRole: 'papel na substituição tributária',
  allowsIcmsCredit: 'permissão de crédito de ICMS',
  recipientTaxRegime: 'regime tributário do destinatário',
  productId: 'produto',
  effectiveAt: 'data de vigência',
};

export const formatDiagnosticValue = (
  key: keyof InterstateOutboundFiscalMatrixFacts,
  value: unknown
): string => {
  if (value === undefined || value === null || value === '') return 'não informado';
  if (key === 'environment') return value === 1 ? 'Produção (1)' : 'Homologação (2)';
  if (key === 'model') return value === '55' ? 'NF-e 55' : 'NFC-e 65';
  if (key === 'issuerRegime') return `CRT ${String(value)}`;
  if (key === 'destinationScope') return value === 'INTERSTATE' ? 'interestadual' : String(value);
  if (key === 'operationType') {
    const operationLabels: Record<string, string> = {
      sale: 'venda',
      return: 'devolução',
      transfer: 'transferência',
      shipment: 'remessa',
    };
    return operationLabels[String(value)] || String(value);
  }
  if (key === 'purpose') {
    const purposeLabels: Record<string, string> = {
      '1': 'normal (1)',
      '2': 'complementar (2)',
      '3': 'ajuste (3)',
      '4': 'devolução (4)',
    };
    return purposeLabels[String(value)] || String(value);
  }
  if (key === 'recipientIeStatus') {
    const recipientLabels: Record<string, string> = {
      taxpayer: 'contribuinte do ICMS (indIEDest=1)',
      exempt: 'contribuinte isento (indIEDest=2)',
      non_taxpayer: 'não contribuinte do ICMS (indIEDest=9)',
    };
    return recipientLabels[String(value)] || String(value);
  }
  if (key === 'finalConsumer') return value ? 'sim (indFinal=1)' : 'não (indFinal=0)';
  if (key === 'merchandiseOrigin')
    return value === 'third_party' ? 'adquirida de terceiros' : 'produção própria';
  if (key === 'hasSt') return value ? 'sim' : 'não';
  if (key === 'stRole') {
    const stLabels: Record<string, string> = {
      NONE: 'sem ST',
      SUBSTITUTE: 'substituto tributário',
      SUBSTITUTED: 'substituído tributário',
    };
    return stLabels[String(value)] || String(value);
  }
  if (key === 'recipientPersonType') return value === 'PF' ? 'pessoa física' : 'pessoa jurídica';
  if (key === 'allowsIcmsCredit') return value ? 'sim' : 'não';
  return String(value);
};

export const recipientIndicatorValue = (
  status: InterstateOutboundFiscalMatrixFacts['recipientIeStatus'] | undefined
): string =>
  status === 'taxpayer'
    ? '1'
    : status === 'exempt'
      ? '2'
      : status === 'non_taxpayer'
        ? '9'
        : 'não informado';
