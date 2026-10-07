import type {
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

const COMMON_INTERSTATE_CSOSN_CANDIDATE = '103';

const baseThirdPartyTreatment = (cfop: string): InterstateTaxTreatment => ({
  cfop,
  csosn: COMMON_INTERSTATE_CSOSN_CANDIDATE,
  icms: {
    xmlGroup: 'ICMSSN102',
    framework: 'CSOSN 103 candidato comum; isenção por faixa de receita pendente de comprovação',
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

const COMMON_INTERSTATE_CSOSN_PENDING_REVIEW =
  'CSOSN 103 é o candidato comum informado para todas as UFs de destino, sem override por estado; comprovar a isenção por faixa de receita aplicável ao emitente no PR antes de aprovar qualquer família.';

/**
 * Matriz-base com os 6 cenários fundamentais de saída interestadual de mercadoria de terceiros.
 * Desacoplada de PF/PJ (critério é condição de IE e consumidor final).
 */
export const INTERSTATE_OUTBOUND_FISCAL_MATRIX_RULES: readonly InterstateOutboundFiscalMatrixRule[] =
  [
    // 1. Contribuinte (indIEDest=1), Não final (indFinal=0): 6102 é candidato de CFOP;
    // o restante do tratamento continua pendente de decisão por adquirente e produto.
    {
      id: 'INTERSTATE-TAXPAYER-NONFINAL-BASE',
      status: 'DRAFT',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'taxpayer',
        finalConsumer: false,
      },
      treatment: baseThirdPartyTreatment('6102'),
      candidateCfops: ['6102'],
      pendingReview: [
        COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
        'CFOP 6102 é apenas classificação da operação; validar CSOSN/crédito e ICMS conforme o adquirente.',
        'Definir ST, DIFAL, FCP e vigência por produto e destino; os curingas atuais não sustentam essas incidências como false.',
        'Não foi localizado registro rastreável de aprovação fiscal para a regra completa ou para seus curingas.',
      ],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
    },

    // 2. Contribuinte (indIEDest=1), Consumidor final (indFinal=1): finalidade final
    // não demonstra sozinha uso/consumo ou ativo nem encerra DIFAL/ST.
    {
      id: 'INTERSTATE-TAXPAYER-FINAL-BASE',
      status: 'DRAFT',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'taxpayer',
        finalConsumer: true,
      },
      treatment: baseThirdPartyTreatment('6102'),
      candidateCfops: ['6102'],
      pendingReview: [
        COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
        'CFOP 6102 é apenas classificação da operação; validar CSOSN/crédito e ICMS conforme o adquirente.',
        'Distinguir revenda, uso/consumo e ativo; definir incidência e responsabilidade de DIFAL, ST e FCP por produto e destino.',
        'Não foi localizado registro rastreável de aprovação fiscal para a regra completa ou para seus curingas.',
      ],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
    },

    // 3. IE isenta (indIEDest=2), não final: validação técnica por UF não aprova tributos.
    {
      id: 'INTERSTATE-EXEMPT-NONFINAL-BASE',
      status: 'DRAFT',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'exempt',
        finalConsumer: false,
      },
      treatment: baseThirdPartyTreatment('6102'),
      candidateCfops: ['6102'],
      pendingReview: [
        COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
        'Validar se a UF de destino aceita indIEDest=2; RV 805/E16a-30 é validação técnica, não aprovação do tratamento fiscal.',
        'Comprovar CSOSN/crédito, ST, DIFAL, FCP, produto e vigência; os curingas atuais não sustentam incidências como false.',
        'Não foi localizado registro rastreável de aprovação fiscal para a regra completa ou para seus curingas.',
      ],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
    },

    // 4. IE isenta (indIEDest=2), consumidor final: além da aceitação técnica por UF,
    // a destinação e o tratamento tributário precisam ser comprovados.
    {
      id: 'INTERSTATE-EXEMPT-FINAL-BASE',
      status: 'DRAFT',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'exempt',
        finalConsumer: true,
      },
      treatment: baseThirdPartyTreatment('6102'),
      candidateCfops: ['6102'],
      pendingReview: [
        COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
        'Validar se a UF de destino aceita indIEDest=2; RV 805/E16a-30 é validação técnica, não aprovação do tratamento fiscal.',
        'Comprovar destinação, CSOSN/crédito, DIFAL, ST, FCP, produto e vigência; os curingas atuais não sustentam incidências como false.',
        'Não foi localizado registro rastreável de aprovação fiscal para a regra completa ou para seus curingas.',
      ],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
    },

    // 5. Não contribuinte (indIEDest=9), consumidor final: 6108 é candidato de CFOP;
    // leiaute/validação XML não substituem a decisão legal sobre DIFAL e demais tributos.
    {
      id: 'INTERSTATE-NONTAXPAYER-FINAL-BASE',
      status: 'DRAFT',
      normativeScope: 'NATIONAL',
      priority: 10,
      criteria: {
        ...baseCommonCriteria,
        recipientIeStatus: 'non_taxpayer',
        finalConsumer: true,
      },
      treatment: baseThirdPartyTreatment('6108'),
      candidateCfops: ['6108'],
      pendingReview: [
        COMMON_INTERSTATE_CSOSN_PENDING_REVIEW,
        'CFOP 6108 é apenas classificação da operação; confirmar enquadramento fiscal do adquirente e do produto.',
        'Definir DIFAL e responsabilidade, ST, FCP e vigência por destino e produto; exceção de leiaute do CRT 1 não prova não incidência.',
        'Não foi localizado registro rastreável de aprovação fiscal para a regra completa ou para seus curingas.',
      ],
      sourceReferences: INTERSTATE_OUTBOUND_GENERAL_SOURCES.map((s) => s.url),
      normativeSources: INTERSTATE_OUTBOUND_GENERAL_SOURCES,
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
