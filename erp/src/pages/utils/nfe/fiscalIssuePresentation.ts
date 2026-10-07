export type FiscalIssueTone = 'attention' | 'error' | 'info';

export type FiscalIssueAction =
  | 'consult'
  | 'configure-certificate'
  | 'start-fresh-hml'
  | 'retransmit-same-document'
  | 'correct-fiscal-data'
  | 'choose-number'
  | 'retry-safely'
  | 'none';

export type FiscalIssueTechnicalDetails = {
  apiCode?: string;
  httpStatus?: number;
  transportCode?: string;
  diagnosticStage?: string;
  diagnosticId?: string;
  diagnosticCategory?: string;
  databaseCode?: string;
  sefazCode?: string;
  sefazMessage?: string;
  documentNumber?: number;
  documentId?: string;
  emissionRequestId?: string;
  environment?: number;
  model?: string;
};

export interface FiscalIssuePresentation {
  tone: FiscalIssueTone;
  title: string;
  description: string;
  nextStep: string;
  action: FiscalIssueAction;
}

export interface FiscalIssueResult {
  success?: boolean;
  status?: string;
  pending?: boolean;
  error?: string;
  code?: string;
  apiCode?: string;
  cStat?: string;
  xMotivo?: string;
  sefazMessage?: string;
  protocolNumber?: string;
  sefazConsulted?: boolean;
  databaseCode?: string;
  databaseReason?: string;
  diagnosticCategory?: string;
  diagnosticStage?: string;
  diagnosticId?: string;
  transportDiagnostic?: { code?: string; httpStatus?: number; tlsReason?: string };
  technicalDetails?: Partial<FiscalIssueTechnicalDetails>;
  documentId?: string;
  emissionRequestId?: string;
  nfeNumber?: number;
  model?: string;
  environment?: number;
  hmlConfirmedNotFound?: boolean;
  hmlNewEmissionRequired?: boolean;
  hmlCanAbandonTlsFailure?: boolean;
  safeNewEmission?: boolean;
  numberReserved?: boolean;
  sefazContacted?: boolean;
  reservationRecoveryRequired?: boolean;
  fiscalMismatchFields?: Array<{
    field: string;
    snapshotValue?: string;
    currentValue?: string;
  }>;
  numberConflict?: unknown;
  state?: string;
}

const TLS_CODES = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

const INTERNAL_IDENTIFIER =
  /\b(?:HML|NFE|SEFAZ|DATABASE)_[A-Z0-9_]+\b|\bHTTP\s*[45]\d\d\b|\b(?:SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|ERR_TLS_[A-Z0-9_]+)\b|\b(?:diagnosticId|diagnosticStage|emissionRequestId|SOAP|TLS|snapshot|idempot[eê]ncia)\b/i;
const SENSITIVE_VALUE =
  /\bBearer\s+[A-Za-z0-9._~+/=-]+|\b(?:token|senha|password|secret|api[_ -]?key)\s*[:=]\s*\S+/i;

const REJECTION_COPY: Record<string, string> = {
  '209': 'A inscrição estadual do emitente foi rejeitada. Confira o cadastro fiscal do emitente.',
  '244': 'A série da nota não foi aceita. Confira a série nas configurações fiscais.',
  '383': 'O CSOSN informado não é permitido para este item nesta operação.',
  '382': 'A combinação de CFOP e CST não é permitida para este item.',
  '386': 'A combinação de CFOP e CSOSN não é permitida para este item.',
  '591': 'O CSOSN informado não é compatível com o regime fiscal do emitente.',
  '725': 'O CFOP informado não é aceito para esta NFC-e.',
  '777': 'A SEFAZ exige o NCM completo do produto.',
  '778': 'O NCM informado para um dos produtos não existe na tabela aceita pela SEFAZ.',
  '779': 'O NCM informado não é compatível com esta NFC-e.',
};

export const HML_INTERSTATE_MATRIX_NOT_APPROVED = 'HML_INTERSTATE_MATRIX_NOT_APPROVED';
export const INTERSTATE_RULE_INVALID_COMBINATION = 'INTERSTATE_RULE_INVALID_COMBINATION';
export const INTERSTATE_EXEMPT_IE_NOT_ALLOWED = 'INTERSTATE_EXEMPT_IE_NOT_ALLOWED';
export const INTERSTATE_ST_RULE_NOT_CONFIGURED = 'INTERSTATE_ST_RULE_NOT_CONFIGURED';
export const INTERSTATE_CSOSN_NOT_RESOLVED = 'INTERSTATE_CSOSN_NOT_RESOLVED';
export const INTERSTATE_TAX_PROFILE_INCOMPLETE = 'INTERSTATE_TAX_PROFILE_INCOMPLETE';

export function isHmlInterstateMatrixBlock(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return (
    value.startsWith(`${HML_INTERSTATE_MATRIX_NOT_APPROVED}:`) ||
    value.startsWith(`${INTERSTATE_RULE_INVALID_COMBINATION}:`) ||
    value.startsWith(`${INTERSTATE_EXEMPT_IE_NOT_ALLOWED}:`) ||
    value.startsWith(`${INTERSTATE_ST_RULE_NOT_CONFIGURED}:`) ||
    value.startsWith(`${INTERSTATE_CSOSN_NOT_RESOLVED}:`) ||
    value.startsWith(`${INTERSTATE_TAX_PROFILE_INCOMPLETE}:`)
  );
}

const PREPARATION_ERROR_COPY: Record<string, string> = {
  [HML_INTERSTATE_MATRIX_NOT_APPROVED]:
    'Ainda não existe tratamento fiscal aprovado para esta combinação de operação, UF de destino, destinatário e produtos. Atualizar os dados e tentar novamente não libera a emissão; o tratamento precisa ser revisado e aprovado pelo responsável fiscal.',
  [INTERSTATE_RULE_INVALID_COMBINATION]:
    'A legislação não permite a combinação de destinatário não contribuinte (indIEDest=9) sem indicador de consumidor final (rejeição 696).',
  [INTERSTATE_EXEMPT_IE_NOT_ALLOWED]:
    'A SEFAZ do estado de destino não permite destinatário como contribuinte isento de inscrição estadual (indIEDest=2) em operações interestaduais (rejeição 805).',
  [INTERSTATE_ST_RULE_NOT_CONFIGURED]:
    'Ainda não há regra de Substituição Tributária interestadual parametrizada para este produto entre as UFs de origem e destino.',
  [INTERSTATE_CSOSN_NOT_RESOLVED]:
    'Não foi possível determinar o CSOSN aplicável para esta operação interestadual.',
  [INTERSTATE_TAX_PROFILE_INCOMPLETE]:
    'Faltam dados fiscais obrigatórios para a resolução da regra interestadual.',
};

export function containsTechnicalFiscalIdentifier(value: string): boolean {
  return INTERNAL_IDENTIFIER.test(value);
}

export function safeFiscalIssueMessage(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const message = value.trim();
  const code = message.match(/^([A-Z][A-Z0-9_]+):/)?.[1];
  if (code && PREPARATION_ERROR_COPY[code]) return PREPARATION_ERROR_COPY[code];
  if (!message || containsTechnicalFiscalIdentifier(message) || SENSITIVE_VALUE.test(message))
    return fallback;
  return message;
}

function getCode(result: FiscalIssueResult): string {
  return result.technicalDetails?.apiCode || result.apiCode || result.code || '';
}

function getTransportCode(result: FiscalIssueResult): string {
  return result.technicalDetails?.transportCode || result.transportDiagnostic?.code || '';
}

function getCStat(result: FiscalIssueResult): string {
  const candidate = result.cStat || result.technicalDetails?.sefazCode || '';
  if (candidate) return candidate;
  const match = (result.sefazMessage || result.xMotivo || '').match(/^\s*(\d{3})\s*[:–-]/);
  return match?.[1] || '';
}

function getSefazReason(result: FiscalIssueResult, cStat: string): string | undefined {
  const mapped = REJECTION_COPY[cStat];
  if (mapped) return mapped;

  const raw = result.sefazMessage || result.xMotivo || '';
  const cleaned = raw
    .replace(/^\s*(?:Rejeição\s*:\s*)?/i, '')
    .replace(/^\s*\d{3}\s*[:–-]?\s*/i, '')
    .replace(/\s*\[(?:nItem|nitem):\s*\d+\]\s*$/i, '')
    .trim();
  return cleaned && !containsTechnicalFiscalIdentifier(cleaned) ? cleaned : undefined;
}

export function getFiscalIssuePresentation(result: FiscalIssueResult): FiscalIssuePresentation {
  const code = getCode(result);
  const transportCode = getTransportCode(result);
  const cStat = getCStat(result);
  if (code === HML_INTERSTATE_MATRIX_NOT_APPROVED) {
    return {
      tone: 'error',
      title: 'Tratamento fiscal não aprovado',
      description: safeFiscalIssueMessage(
        result.error,
        PREPARATION_ERROR_COPY[HML_INTERSTATE_MATRIX_NOT_APPROVED]
      ),
      nextStep:
        'Solicite ao responsável fiscal a revisão e aprovação da regra aplicável a este cenário.',
      action: 'none',
    };
  }
  if (code === INTERSTATE_RULE_INVALID_COMBINATION) {
    return {
      tone: 'error',
      title: 'Combinação fiscal inválida',
      description: safeFiscalIssueMessage(
        result.error,
        PREPARATION_ERROR_COPY[INTERSTATE_RULE_INVALID_COMBINATION]
      ),
      nextStep: 'Corrija os dados fiscais do destinatário marcando consumidor final como sim.',
      action: 'correct-fiscal-data',
    };
  }
  if (code === INTERSTATE_EXEMPT_IE_NOT_ALLOWED) {
    return {
      tone: 'error',
      title: 'UF de destino não aceita contribuinte isento',
      description: safeFiscalIssueMessage(
        result.error,
        PREPARATION_ERROR_COPY[INTERSTATE_EXEMPT_IE_NOT_ALLOWED]
      ),
      nextStep:
        'Altere o indicador de IE do destinatário para não contribuinte ou informe a inscrição estadual ativa.',
      action: 'correct-fiscal-data',
    };
  }
  if (code === INTERSTATE_ST_RULE_NOT_CONFIGURED) {
    return {
      tone: 'error',
      title: 'Substituição Tributária não configurada',
      description: safeFiscalIssueMessage(
        result.error,
        PREPARATION_ERROR_COPY[INTERSTATE_ST_RULE_NOT_CONFIGURED]
      ),
      nextStep:
        'Solicite ao responsável fiscal a parametrização do protocolo/convênio de ST aplicável para este NCM.',
      action: 'none',
    };
  }
  if (code === INTERSTATE_CSOSN_NOT_RESOLVED) {
    return {
      tone: 'error',
      title: 'CSOSN não determinado',
      description: safeFiscalIssueMessage(
        result.error,
        PREPARATION_ERROR_COPY[INTERSTATE_CSOSN_NOT_RESOLVED]
      ),
      nextStep: 'Revise o enquadramento fiscal do emitente e destinatário.',
      action: 'correct-fiscal-data',
    };
  }
  if (code === INTERSTATE_TAX_PROFILE_INCOMPLETE) {
    return {
      tone: 'error',
      title: 'Dados fiscais incompletos',
      description: safeFiscalIssueMessage(
        result.error,
        PREPARATION_ERROR_COPY[INTERSTATE_TAX_PROFILE_INCOMPLETE]
      ),
      nextStep: 'Preencha todos os campos fiscais do pedido e dos itens.',
      action: 'correct-fiscal-data',
    };
  }
  const isTlsFailure = TLS_CODES.has(transportCode);
  const transportFailure =
    code === 'SEFAZ_TRANSPORT_FAILED' ||
    result.technicalDetails?.diagnosticCategory === 'SEFAZ_TRANSPORT_FAILED' ||
    result.diagnosticCategory === 'SEFAZ_TRANSPORT_FAILED';
  if (
    result.databaseReason === 'ALREADY_ACTIVE_FISCAL_ATTEMPT' &&
    ![
      'HML_TRANSMISSION_UNCERTAIN',
      'HML_RECONCILIATION_REQUIRED',
      'SEFAZ_TRANSPORT_FAILED',
    ].includes(code)
  ) {
    return {
      tone: 'attention',
      title: 'Já existe uma tentativa fiscal em andamento',
      description: 'O ERP encontrou uma tentativa anterior para este pedido.',
      nextStep: 'Consulte a situação dessa tentativa antes de continuar.',
      action: 'consult',
    };
  }

  const transmissionUncertain =
    result.pending === true ||
    code === 'HML_TRANSMISSION_UNCERTAIN' ||
    code === 'HML_RECONCILIATION_REQUIRED' ||
    (transportFailure && !(result.numberReserved === false && result.sefazContacted === false));

  if (transmissionUncertain) {
    return {
      tone: 'attention',
      title: 'Estamos confirmando o que aconteceu com esta nota',
      description: isTlsFailure
        ? 'A conexão segura com a SEFAZ falhou e ainda não recebemos a confirmação sobre esta nota.'
        : 'A comunicação terminou sem uma confirmação confiável da SEFAZ. Ainda não sabemos se a nota foi recebida.',
      nextStep:
        'Consulte a mesma tentativa antes de qualquer novo envio. Isso evita criar uma nota duplicada.',
      action: 'consult',
    };
  }

  if (code === 'HML_IDEMPOTENCY_MISMATCH') {
    const canStartFresh = result.environment === 2 && result.hmlCanAbandonTlsFailure === true;
    return {
      tone: 'attention',
      title: 'Os dados fiscais deste pedido mudaram',
      description:
        'Esta tentativa foi criada com dados fiscais anteriores e não pode ser reutilizada.',
      nextStep: canStartFresh
        ? 'A tentativa anterior será mantida no histórico. O sistema confirmou que é seguro iniciar uma nova tentativa.'
        : 'Consulte a tentativa original antes de continuar.',
      action: canStartFresh
        ? 'start-fresh-hml'
        : result.documentId || result.emissionRequestId
          ? 'consult'
          : 'none',
    };
  }

  if (result.hmlNewEmissionRequired || code === 'HML_NEW_EMISSION_REQUIRED') {
    return {
      tone: 'attention',
      title: 'A nota não foi encontrada na SEFAZ',
      description:
        'A consulta confirmou que esta tentativa não foi registrada. O ERP indicou que é necessária uma nova tentativa fiscal.',
      nextStep:
        'Inicie uma nova tentativa para gerar o documento com os dados e a numeração atuais.',
      action: 'start-fresh-hml',
    };
  }

  if (result.hmlConfirmedNotFound || code === 'HML_CONFIRMED_NOT_FOUND' || cStat === '217') {
    const backendAllowsSameDocument =
      result.hmlConfirmedNotFound || code === 'HML_CONFIRMED_NOT_FOUND';
    return {
      tone: 'info',
      title: 'A nota não foi encontrada na SEFAZ',
      description: 'A consulta confirmou que esta tentativa não foi registrada na SEFAZ.',
      nextStep: backendAllowsSameDocument
        ? 'Você pode retransmitir o mesmo documento, mantendo a chave original.'
        : 'Aguarde a confirmação do ERP sobre a ação segura para esta tentativa.',
      action: backendAllowsSameDocument ? 'retransmit-same-document' : 'none',
    };
  }

  if (code === 'HML_CERTIFICATE_INVALID' || code === 'HML_CERTIFICATE_UNAVAILABLE') {
    return {
      tone: 'error',
      title: 'Não foi possível usar o certificado digital',
      description: 'O certificado A1 configurado não pôde ser lido ou validado.',
      nextStep: 'Verifique o certificado nas configurações fiscais antes de emitir.',
      action: 'configure-certificate',
    };
  }

  const safelyNotTransmitted =
    (transportFailure || isTlsFailure) &&
    result.pending === false &&
    result.numberReserved === false &&
    result.sefazContacted === false;
  if (safelyNotTransmitted) {
    return {
      tone: 'error',
      title: 'Não conseguimos falar com a SEFAZ',
      description: isTlsFailure
        ? 'A conexão segura falhou antes do envio. Esta tentativa não chegou à SEFAZ.'
        : 'A falha aconteceu antes do envio desta tentativa à SEFAZ.',
      nextStep: 'Verifique a conexão e tente novamente.',
      action: 'retry-safely',
    };
  }

  if (result.numberConflict || code === 'NFE_NUMBER_ALREADY_USED') {
    return {
      tone: 'error',
      title: 'O número da nota já está em uso',
      description: safeFiscalIssueMessage(
        result.error,
        'Escolha outro número antes de emitir a nota.'
      ),
      nextStep: 'Informe o número indicado e confirme a nova tentativa.',
      action: 'choose-number',
    };
  }

  const rejected =
    code === 'HML_SEFAZ_REJECTED' ||
    code === 'HML_SERIES_CORRECTION_REQUIRED' ||
    code === 'HML_ISSUER_IE_CORRECTION_REQUIRED' ||
    Boolean(cStat && !['100', '101', '102', '103', '104', '105', '204', '217'].includes(cStat));
  if (rejected) {
    const reason = getSefazReason(result, cStat);
    return {
      tone: 'error',
      title: 'Não foi possível autorizar a nota',
      description: reason
        ? `A SEFAZ encontrou um problema nos dados da nota. ${reason}`
        : 'A SEFAZ encontrou um problema nos dados da nota. Revise as informações fiscais indicadas.',
      nextStep: 'Corrija os dados fiscais antes de iniciar outra tentativa.',
      action: 'correct-fiscal-data',
    };
  }

  if (result.status === 'abandoned') {
    return {
      tone: 'info',
      title: 'Tentativa encerrada',
      description: 'Esta tentativa não foi concluída e foi encerrada com segurança.',
      nextStep: 'Consulte o histórico do pedido para acompanhar uma eventual nova tentativa.',
      action: 'none',
    };
  }

  const message = safeFiscalIssueMessage(
    result.error,
    'O sistema não conseguiu concluir esta emissão.'
  );
  const canConsult = Boolean(result.documentId || result.emissionRequestId);
  return {
    tone: 'error',
    title: 'Não conseguimos concluir esta operação',
    description: message,
    nextStep: canConsult
      ? 'Consulte a situação desta tentativa antes de solicitar outro envio.'
      : 'Confira os dados fiscais e tente novamente.',
    action: canConsult ? 'consult' : 'retry-safely',
  };
}

export function getFiscalIssueTechnicalDetails(
  result: FiscalIssueResult
): FiscalIssueTechnicalDetails | undefined {
  const details = result.technicalDetails || {};
  const transportCode = details.transportCode || result.transportDiagnostic?.code;
  const diagnosticStage = details.diagnosticStage || result.diagnosticStage;
  const diagnosticId = details.diagnosticId || result.diagnosticId;
  const apiCode = details.apiCode || result.apiCode || result.code;
  const sefazCode = details.sefazCode || result.cStat;
  const sefazMessage = result.sefazMessage || result.xMotivo;
  const values: FiscalIssueTechnicalDetails = {
    ...(apiCode ? { apiCode } : {}),
    ...(details.httpStatus || result.transportDiagnostic?.httpStatus
      ? { httpStatus: details.httpStatus || result.transportDiagnostic?.httpStatus }
      : {}),
    ...(transportCode ? { transportCode } : {}),
    ...(diagnosticStage ? { diagnosticStage } : {}),
    ...(diagnosticId ? { diagnosticId } : {}),
    ...(details.diagnosticCategory || result.diagnosticCategory
      ? { diagnosticCategory: details.diagnosticCategory || result.diagnosticCategory }
      : {}),
    ...(details.databaseCode || result.databaseCode
      ? { databaseCode: details.databaseCode || result.databaseCode }
      : {}),
    ...(sefazCode ? { sefazCode } : {}),
    ...(sefazMessage ? { sefazMessage } : {}),
    ...(details.documentNumber || result.nfeNumber
      ? { documentNumber: details.documentNumber || result.nfeNumber }
      : {}),
    ...(details.documentId || result.documentId
      ? { documentId: details.documentId || result.documentId }
      : {}),
    ...(details.emissionRequestId || result.emissionRequestId
      ? { emissionRequestId: details.emissionRequestId || result.emissionRequestId }
      : {}),
    ...(details.environment || result.environment
      ? { environment: details.environment || result.environment }
      : {}),
    ...(details.model || result.model ? { model: details.model || result.model } : {}),
  };
  return Object.keys(values).length ? values : undefined;
}

export function getFiscalDocumentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    autorizada: 'Autorizada',
    homologada: 'Recebida em homologação',
    cancelada: 'Cancelada',
    rejeitada: 'Rejeitada',
    pendente: 'Aguardando confirmação',
    erro: 'Erro na emissão',
    abandoned: 'Tentativa encerrada',
  };
  return labels[status] || status;
}
