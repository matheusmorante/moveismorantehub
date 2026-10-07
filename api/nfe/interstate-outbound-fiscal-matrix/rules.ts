import type {
  InterstateOutboundFiscalMatrixFacts,
  InterstateOutboundFiscalMatrixRule,
  InterstateOutboundNormativeSource,
  InterstateTaxTreatment,
} from './types';

export const EXEMPT_IE_DISALLOWED_UFS: readonly string[] = [
  'AM',
  'BA',
  'CE',
  'GO',
  'MG',
  'MS',
  'MT',
  'PA',
  'PE',
  'RN',
  'SE',
  'SP',
];

export const INTERSTATE_OUTBOUND_GENERAL_SOURCES: readonly InterstateOutboundNormativeSource[] = [
  {
    id: 'N1',
    scope: 'NATIONAL',
    url: 'https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf',
  },
  {
    id: 'N2',
    scope: 'NATIONAL',
    url: 'https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24',
  },
  { id: 'N3', scope: 'NATIONAL', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm' },
  {
    id: 'N4',
    scope: 'NATIONAL',
    url: 'https://www.confaz.fazenda.gov.br/legislacao/convenios/2018/CV142_18',
  },
  {
    id: 'N5-LC',
    scope: 'NATIONAL',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp190.htm',
  },
  {
    id: 'N5-CV',
    scope: 'NATIONAL',
    url: 'https://www.confaz.fazenda.gov.br/legislacao/convenios/2021/CV236_21',
  },
  {
    id: 'PR1',
    scope: 'ORIGIN_STATE',
    issuerUf: 'PR',
    url: 'https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/102202405144.pdf',
  },
  {
    id: 'PR2',
    scope: 'ORIGIN_STATE',
    issuerUf: 'PR',
    url: 'https://www.fazenda.pr.gov.br/Pagina/ICMS-Substituicao-tributaria',
  },
  {
    id: 'PR3',
    scope: 'ORIGIN_STATE',
    issuerUf: 'PR',
    url: 'https://www.legislacao.pr.gov.br/legislacao/pesquisarAto.do?action=exibir&codAto=278020&codTipoAto=1&tipoVisualizacao=compilado',
  },
];

export const emptyInterstateTreatment = (): InterstateTaxTreatment => ({
  cfop: null,
  csosn: null,
  icms: {
    xmlGroup: null,
    framework: null,
    ratePercent: null,
    baseMethod: null,
    reductionPercent: null,
  },
  st: {
    responsibility: null,
    applicable: null,
    agreementOrProtocol: null,
    baseMethod: null,
    ratePercent: null,
  },
  difal: {
    applicable: null,
    responsibility: null,
    internalRatePercent: null,
    interstateRatePercent: null,
    destinationSharePercent: null,
  },
  fcp: { applicable: null, ratePercent: null },
  fcpSt: { applicable: null, ratePercent: null },
});

const baseThirdPartyTreatment = (cfop: string, csosn = '102'): InterstateTaxTreatment => ({
  cfop,
  csosn,
  icms: {
    xmlGroup: csosn === '101' ? 'ICMSSN101' : 'ICMSSN102',
    framework:
      csosn === '101'
        ? 'Simples Nacional - Com permissão de crédito'
        : 'Simples Nacional - Sem permissão de crédito',
    ratePercent: 0,
    baseMethod: 'Simples Nacional',
    reductionPercent: 0,
  },
  st: {
    responsibility: 'none',
    applicable: false,
    agreementOrProtocol: 'not_applicable',
    baseMethod: 'none',
    ratePercent: 0,
  },
  difal: {
    responsibility: 'none',
    applicable: false,
    internalRatePercent: 0,
    interstateRatePercent: 0,
    destinationSharePercent: 0,
  },
  fcp: { applicable: false, ratePercent: 0 },
  fcpSt: { applicable: false, ratePercent: 0 },
});

const baseCommonCriteria = {
  environment: 2 as const,
  model: '55' as const,
  issuerRegime: '1',
  issuerUf: 'PR',
  destinationScope: 'INTERSTATE' as const,
  destinationUf: null,
  operationType: 'sale' as const,
  purpose: '1' as const,
  merchandiseOrigin: 'third_party' as const,
};

const commonWildcards: Array<keyof InterstateOutboundFiscalMatrixFacts> = [
  'destinationUf',
  'ncm',
  'cest',
  'productId',
  'productOrigin',
  'hasSt',
  'recipientPersonType',
];

/**
 * Matriz-base com os 6 cenários fundamentais de saída interestadual de mercadoria de terceiros.
 * Desacoplada de PF/PJ (critério é condição de IE e consumidor final).
 */
export const INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES: readonly InterstateOutboundFiscalMatrixRule[] =
  [
    // 1. Contribuinte (indIEDest=1), Revenda (indFinal=0) -> CFOP 6102 (APPROVED)
    {
      id: 'INTERSTATE-TAXPAYER-NONFINAL-BASE',
      status: 'APPROVED',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'taxpayer',
        finalConsumer: false,
      },
      treatment: baseThirdPartyTreatment('6102'),
      candidateCfops: ['6102'],
      pendingReview: [],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
      approvedBy: 'FISCAL_COUNCIL',
      approvedAt: '2026-10-06T00:00:00Z',
      effectiveFrom: '2026-01-01T00:00:00Z',
      reviewedWildcards: commonWildcards,
      xmlEvidence:
        'MOC 7 e NT 2015/003: idDest=2, indIEDest=1, indFinal=0, CFOP 6102, CRT 1 sem DIFAL',
      testEvidence: 'Automated test suite interstateOutboundFiscalMatrix',
    },

    // 2. Contribuinte (indIEDest=1), Consumidor Final (indFinal=1) -> CFOP 6102 (APPROVED)
    {
      id: 'INTERSTATE-TAXPAYER-FINAL-BASE',
      status: 'APPROVED',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'taxpayer',
        finalConsumer: true,
      },
      treatment: baseThirdPartyTreatment('6102'),
      candidateCfops: ['6102'],
      pendingReview: [],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
      approvedBy: 'FISCAL_COUNCIL',
      approvedAt: '2026-10-06T00:00:00Z',
      effectiveFrom: '2026-01-01T00:00:00Z',
      reviewedWildcards: commonWildcards,
      xmlEvidence:
        'MOC 7: idDest=2, indIEDest=1, indFinal=1, CFOP 6102, Simples Nacional sem retenção DIFAL',
      testEvidence: 'Automated test suite interstateOutboundFiscalMatrix',
    },

    // 3. Contribuinte Isento de IE (indIEDest=2), Não Final (indFinal=0) -> CFOP 6102 (APPROVED condicional à UF)
    {
      id: 'INTERSTATE-EXEMPT-NONFINAL-BASE',
      status: 'APPROVED',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'exempt',
        finalConsumer: false,
      },
      treatment: baseThirdPartyTreatment('6102'),
      candidateCfops: ['6102'],
      pendingReview: [],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
      approvedBy: 'FISCAL_COUNCIL',
      approvedAt: '2026-10-06T00:00:00Z',
      effectiveFrom: '2026-01-01T00:00:00Z',
      reviewedWildcards: commonWildcards,
      xmlEvidence:
        'MOC 7 RV 805 / E16a-30: idDest=2, indIEDest=2, indFinal=0, CFOP 6102 para UFs que aceitam isento',
      testEvidence: 'Automated test suite interstateOutboundFiscalMatrix',
    },

    // 4. Contribuinte Isento de IE (indIEDest=2), Consumidor Final (indFinal=1) -> CFOP 6102 (APPROVED condicional à UF)
    {
      id: 'INTERSTATE-EXEMPT-FINAL-BASE',
      status: 'APPROVED',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'exempt',
        finalConsumer: true,
      },
      treatment: baseThirdPartyTreatment('6102'),
      candidateCfops: ['6102'],
      pendingReview: [],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
      approvedBy: 'FISCAL_COUNCIL',
      approvedAt: '2026-10-06T00:00:00Z',
      effectiveFrom: '2026-01-01T00:00:00Z',
      reviewedWildcards: commonWildcards,
      xmlEvidence:
        'MOC 7 RV 805 / E16a-30: idDest=2, indIEDest=2, indFinal=1, CFOP 6102 para UFs que aceitam isento',
      testEvidence: 'Automated test suite interstateOutboundFiscalMatrix',
    },

    // 5. Não Contribuinte (indIEDest=9), Consumidor Final (indFinal=1) -> CFOP 6108 (APPROVED)
    {
      id: 'INTERSTATE-NONTAXPAYER-FINAL-BASE',
      status: 'APPROVED',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'non_taxpayer',
        finalConsumer: true,
      },
      treatment: baseThirdPartyTreatment('6108'),
      candidateCfops: ['6108'],
      pendingReview: [],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
      approvedBy: 'FISCAL_COUNCIL',
      approvedAt: '2026-10-06T00:00:00Z',
      effectiveFrom: '2026-01-01T00:00:00Z',
      reviewedWildcards: commonWildcards,
      xmlEvidence:
        'MOC 7: idDest=2, indIEDest=9, indFinal=1, CFOP 6108, Simples Nacional CRT 1 dispensado de DIFAL EC 87',
      testEvidence: 'Automated test suite interstateOutboundFiscalMatrix',
    },

    // 6. Não Contribuinte (indIEDest=9), Não Final (indFinal=0) -> BLOCKED (RV E16a-40 / Rejeição 696)
    {
      id: 'INTERSTATE-NONTAXPAYER-NONFINAL-BASE',
      status: 'BLOCKED',
      normativeScope: 'NATIONAL',
      priority: 0,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'non_taxpayer',
        finalConsumer: false,
      },
      treatment: emptyInterstateTreatment(),
      candidateCfops: [],
      pendingReview: [
        'MOC E16a-40: venda de saída com indIEDest=9 e indFinal=0 é rejeitada pela SEFAZ (rejeição 696)',
      ],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
    },
  ];
