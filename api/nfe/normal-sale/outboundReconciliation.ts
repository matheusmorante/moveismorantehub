import { randomUUID } from 'node:crypto';
import { parseSefazAuthorization } from '../../../erp/src/pages/utils/nfe/sefazResponseParser';
import { parseSefazNfeSituation } from '../../../erp/src/pages/utils/nfe/nfeEventRules';
import { getNfeServiceEndpoint } from '../fiscalEnvironmentPolicy';
import { extractCertificateAndKey } from '../nfeSigner';
import { sendSoapToSefaz } from '../sefazClient';
import { withNfeEmissionStage } from '../nfeEmissionPerformance';
import {
  type Attempt,
  type Document,
  type OutboundDatabase,
  type OutboundResult,
  metadata,
  outboundFailure,
} from './outboundTypes';
import { loadOutboundAttempt, persistResultToDatabase } from './outboundPersistence';
import { transmitPreparedOutbound } from './outboundTransmission';

export function finalResult(a: Attempt, doc: Document, isReversed = false): OutboundResult {
  const parsed = parseSefazAuthorization(String(doc.xml_protocolo || ''));
  const isCancelled = doc.status === 'cancelada';
  return {
    status: 200,
    body: {
      ...parsed,
      success: a.state === 'authorized' && !isCancelled && !isReversed,
      ...metadata(a),
      state: isCancelled || isReversed ? 'cancelled' : a.state,
      pending: false,
      signedXml: doc.xml_nfe,
      sefazResponseXml: doc.xml_protocolo,
      protocolNumber: doc.numero_protocolo,
      xMotivo: doc.motivo_status,
      ...(isCancelled
        ? {
            code: 'FISCAL_ALREADY_CANCELLED',
            error: 'O documento original está cancelado. Seu histórico foi preservado.',
          }
        : isReversed
        ? {
            code: 'FISCAL_ALREADY_REVERSED',
            error: 'O documento original foi revertido por estorno. Seu histórico foi preservado.',
          }
        : {}),
      ...(a.state === 'rejected'
        ? { code: 'FISCAL_SEFAZ_REJECTED', error: doc.motivo_status }
        : {}),
    },
  };
}

/** Consultation never allocates or rebuilds. A formerly uncertain request stops after the first confirmed 217. */
export async function reconcileNormalSale(
  db: OutboundDatabase,
  documentId: string,
  allowTransmission = false,
  productionConfirmed = false,
  ownedToken?: string,
  preloadedCertificate?: ReturnType<typeof extractCertificateAndKey>
): Promise<OutboundResult> {
  let loaded: Awaited<ReturnType<typeof loadOutboundAttempt>>;
  try {
    loaded = await withNfeEmissionStage(
      'attempt_load',
      () => loadOutboundAttempt(db, documentId),
      { documentId }
    );
  } catch {
    return outboundFailure(
      503,
      'FISCAL_ATTEMPT_UNAVAILABLE',
      'Tentativa fiscal indisponível. Nenhuma nova numeração foi reservada.',
      { documentId, pending: true }
    );
  }

  const { attempt: a, document: doc } = loaded;

  if (['authorized', 'rejected'].includes(a.state)) {
    let isReversed = false;
    try {
      const { data: revConfirmed } = await db.rpc('is_order_edit_reversal_confirmed', {
        p_original_document_id: doc.id,
      });
      isReversed = revConfirmed === true;
    } catch {
      // Falha ao conferir reversão não bloqueia leitura
    }
    return finalResult(a, doc, isReversed);
  }

  const token = ownedToken || randomUUID();
  if (!ownedToken) {
    const claimed = await db.rpc('claim_nfe_outbound_attempt', {
      p_document_id: documentId,
      p_attempt_token: token,
    });
    if (claimed.error || !claimed.data)
      return outboundFailure(
        409,
        'FISCAL_ATTEMPT_IN_PROGRESS',
        'Outra operação fiscal está em andamento. Consulte novamente após sua conclusão.',
        { ...metadata(a), pending: true }
      );
  }

  try {
    if (a.state === 'prepared' && !allowTransmission)
      return outboundFailure(
        409,
        'FISCAL_PREPARED_NOT_SENT',
        'Documento reservado; a transmissão não foi iniciada.',
        { ...metadata(a), pending: false, state: 'prepared', sefazContacted: false }
      );

    const pfx = process.env.NFE_CERTIFICATE_BASE64;
    if (!pfx)
      return outboundFailure(
        503,
        'FISCAL_CERTIFICATE_UNAVAILABLE',
        'Certificado A1 indisponível para consultar ou transmitir.',
        { ...metadata(a), pending: a.state !== 'prepared' }
      );

    const certificate = preloadedCertificate
      ? preloadedCertificate
      : await withNfeEmissionStage(
          'reconcile_cert_extract',
          () => extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || ''),
          { documentId }
        );

    if (a.state === 'prepared' && allowTransmission)
      return await transmitPreparedOutbound(db, a, doc, token, certificate, productionConfirmed);

    const response = await sendSoapToSefaz({
      url: getNfeServiceEndpoint(a.model, a.environment, 'NFeConsultaProtocolo4'),
      action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF',
      serviceNamespace: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4',
      xmlPayload: `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${a.environment}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${a.access_key}</chNFe></consSitNFe>`,
      certPem: certificate.certPem,
      privateKeyPem: certificate.privateKeyPem,
    });

    const situation = parseSefazNfeSituation(response);

    if (situation.state === 'authorized') {
      const parsed = parseSefazAuthorization(response);
      await persistResultToDatabase(
        db,
        a,
        token,
        'authorized',
        parsed.xMotivo,
        response,
        parsed.protocolNumber || null,
        String(doc.xml_nfe)
      );
      return {
        status: 200,
        body: {
          ...parsed,
          success: true,
          pending: false,
          state: 'authorized',
          ...metadata(a),
          signedXml: doc.xml_nfe,
          sefazResponseXml: response,
        },
      };
    }

    if (situation.state === 'not_found') {
      await persistResultToDatabase(
        db,
        a,
        token,
        'confirmed_not_found',
        `217: ${situation.xMotivo}`,
        response
      );
      if (allowTransmission && a.state === 'confirmed_not_found')
        return await transmitPreparedOutbound(db, a, doc, token, certificate, productionConfirmed);
      return outboundFailure(
        409,
        'FISCAL_CONFIRMED_NOT_FOUND',
        '217: Documento não encontrado. Uma nova tentativa explícita reutilizará o XML, a chave e o número reservados.',
        {
          ...metadata(a),
          pending: false,
          state: 'not_found',
          cStat: '217',
          xMotivo: situation.xMotivo,
        }
      );
    }

    await persistResultToDatabase(
      db,
      a,
      token,
      'reconciling',
      'Consulta não confirmou autorização nem ausência do documento.',
      response
    );
    return outboundFailure(
      409,
      'FISCAL_RECONCILIATION_REQUIRED',
      'Consulta inconclusiva. Não retransmita sem confirmar a situação da chave reservada.',
      { ...metadata(a), pending: true, state: 'unknown', cStat: situation.cStat }
    );
  } catch {
    return outboundFailure(
      502,
      'FISCAL_RECONCILIATION_REQUIRED',
      'Não foi possível confirmar e persistir a situação fiscal. A tentativa e o número foram preservados.',
      { ...metadata(a), pending: true, state: 'unknown' }
    );
  } finally {
    try {
      await withNfeEmissionStage(
        'release_attempt_rpc',
        () =>
          db.rpc('release_nfe_outbound_attempt', {
            p_document_id: documentId,
            p_attempt_token: token,
          }),
        { documentId }
      );
    } catch {
      /* Lease expires in PostgreSQL. */
    }
  }
}
