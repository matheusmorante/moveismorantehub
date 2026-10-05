import { describe, expect, it } from 'vitest';
import {
  getFiscalDocumentStatusLabel,
  getFiscalIssuePresentation,
  getFiscalIssueTechnicalDetails,
  safeFiscalIssueMessage,
} from '../fiscalIssuePresentation';

describe('mensagens fiscais para a interface', () => {
  it('explica uma falha TLS em linguagem simples e recomenda consultar a tentativa', () => {
    const presentation = getFiscalIssuePresentation({
      code: 'HML_TRANSMISSION_UNCERTAIN',
      pending: true,
      transportDiagnostic: { code: 'SELF_SIGNED_CERT_IN_CHAIN' },
    });

    expect(presentation).toMatchObject({
      title: 'Estamos confirmando o que aconteceu com esta nota',
      action: 'consult',
      tone: 'attention',
    });
    expect(presentation.description).toContain('conexão segura');
    expect(presentation.description).not.toContain('SELF_SIGNED_CERT_IN_CHAIN');
  });

  it('mantém códigos técnicos fora da mensagem principal', () => {
    expect(
      safeFiscalIssueMessage('HML_IDEMPOTENCY_MISMATCH: HTTP 409', 'Confira os detalhes técnicos.')
    ).toBe('Confira os detalhes técnicos.');
  });

  it('orienta certificado, rejeição e consulta inconclusiva com ações próprias', () => {
    expect(getFiscalIssuePresentation({ code: 'HML_CERTIFICATE_INVALID' })).toMatchObject({
      title: 'Não foi possível usar o certificado digital',
      action: 'configure-certificate',
      tone: 'error',
    });
    expect(getFiscalIssuePresentation({ code: 'HML_SEFAZ_REJECTED', cStat: '753' })).toMatchObject({
      title: 'Não foi possível autorizar a nota',
      action: 'correct-fiscal-data',
      tone: 'error',
    });
    expect(
      getFiscalIssuePresentation({ code: 'HML_RECONCILIATION_REQUIRED', pending: true })
    ).toMatchObject({
      title: 'Estamos confirmando o que aconteceu com esta nota',
      action: 'consult',
      tone: 'attention',
    });
  });

  it('offers a fresh emission only after the backend proves the prior attempt is safe to close', () => {
    const mismatch = {
      code: 'HML_IDEMPOTENCY_MISMATCH',
      environment: 2,
      documentId: 'document-1',
      fiscalMismatchFields: [
        { field: 'Item 1 · NCM', snapshotValue: '94036000', currentValue: '94035000' },
      ],
    };

    expect(getFiscalIssuePresentation(mismatch).action).toBe('consult');
    expect(getFiscalIssuePresentation({ ...mismatch, hmlCanAbandonTlsFailure: true }).action).toBe(
      'start-fresh-hml'
    );
  });

  it('distinguishes a same-document retransmission from a backend-required new attempt', () => {
    expect(
      getFiscalIssuePresentation({
        code: 'HML_CONFIRMED_NOT_FOUND',
        pending: false,
        hmlConfirmedNotFound: true,
      }).action
    ).toBe('retransmit-same-document');
    expect(
      getFiscalIssuePresentation({
        code: 'HML_NEW_EMISSION_REQUIRED',
        pending: false,
        hmlNewEmissionRequired: true,
      }).action
    ).toBe('start-fresh-hml');
  });

  it('translates known field rejections without exposing their SEFAZ code', () => {
    const ncmIssue = getFiscalIssuePresentation({
      code: 'HML_SEFAZ_REJECTED',
      cStat: '778',
      sefazMessage: '778: Informado NCM inexistente [nItem: 1]',
    });
    const cfopCsosnIssue = getFiscalIssuePresentation({
      code: 'HML_SEFAZ_REJECTED',
      cStat: '386',
      sefazMessage: '386: CFOP não permitido para o CSOSN informado',
    });

    expect(ncmIssue.description).toContain('NCM');
    expect(ncmIssue.description).not.toContain('778');
    expect(cfopCsosnIssue.description).toContain('CFOP');
    expect(cfopCsosnIssue.description).toContain('CSOSN');
  });

  it('marks a transport error retryable only when the backend proves nothing was reserved or sent', () => {
    const issue = getFiscalIssuePresentation({
      code: 'SEFAZ_TRANSPORT_FAILED',
      pending: false,
      numberReserved: false,
      sefazContacted: false,
      transportDiagnostic: { code: 'SELF_SIGNED_CERT_IN_CHAIN' },
    });

    expect(issue.action).toBe('retry-safely');
    expect(issue.description).toContain('não chegou à SEFAZ');
  });

  it('keeps transport diagnostics available to support without putting them in the main message', () => {
    const result = {
      code: 'HML_TRANSMISSION_UNCERTAIN',
      pending: true,
      documentId: 'document-1',
      emissionRequestId: 'request-1',
      diagnosticId: 'diagnostic-1',
      diagnosticStage: 'sefaz-transmission',
      transportDiagnostic: { code: 'SELF_SIGNED_CERT_IN_CHAIN' },
      environment: 2,
      model: '65',
    };
    const presentation = getFiscalIssuePresentation(result);
    const technicalDetails = getFiscalIssueTechnicalDetails(result);

    expect(presentation.action).toBe('consult');
    expect(presentation.title).not.toMatch(/HML_|SELF_SIGNED|HTTP|TLS/);
    expect(technicalDetails).toMatchObject({
      apiCode: 'HML_TRANSMISSION_UNCERTAIN',
      transportCode: 'SELF_SIGNED_CERT_IN_CHAIN',
      emissionRequestId: 'request-1',
      environment: 2,
      model: '65',
    });
  });

  it('labels an abandoned attempt as ended rather than cancelled', () => {
    expect(getFiscalDocumentStatusLabel('abandoned')).toBe('Tentativa encerrada');
    expect(getFiscalDocumentStatusLabel('cancelada')).toBe('Cancelada');
  });
});
