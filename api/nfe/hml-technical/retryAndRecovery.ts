import { randomUUID } from 'node:crypto';
import { parseSefazAuthorization } from '../../../erp/src/pages/utils/nfe/sefazResponseParser';
import { validateContributorNfeSeries } from '../../../erp/src/pages/utils/nfe/nfeSequenceSettings';
import { validateNfeAgainstOfficialSchema } from '../schemaValidator';
import { extractCertificateAndKey } from '../nfeSigner';
import { sefazTransportDiagnostic } from '../sefazTransportDiagnostic';
import {
  fiscalNumberConflict,
  isDifferentKeyNumberConflict,
} from '../../../shared-utils/fiscalNumbering';
import {
  isFormallyAbandonedHmlAttempt,
  getFiscalSelectionMismatchDetails,
  canAbandonBeforeHmlTransmission,
} from '../hmlAttemptSafety';
import type { FiscalEmissionCommand } from '../fiscalSnapshot';
import type { Database, Result } from './types';
import {
  isHmlRuleSet,
  failure,
  nfceXmlNeedsFreshEmission,
  freshNfceEmissionRequired,
  SNAPSHOT_REASON_MESSAGES,
} from './constants';
import { activeAttemptMetadata } from './snapshotClassification';
import { consultExisting } from './consultation';
import { transmitAndPersist, releaseAttempt } from './transmission';

export async function retryHmlTechnical(
  db: Database,
  documentId: string,
  allowRetransmission = true
): Promise<Result> {
  const { data: doc, error } = await db
    .from('nfe_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle();
  if (
    error ||
    !doc ||
    doc.ambiente !== 2 ||
    !['55', '65'].includes(doc.modelo) ||
    !isHmlRuleSet(doc.fiscal_ruleset_version)
  )
    return failure(404, 'HML_DOCUMENT_NOT_FOUND', 'Tentativa HML original não encontrada.');
  if (doc.status === 'homologada')
    return {
      status: 200,
      body: {
        success: true,
        documentId: doc.id,
        orderId: doc.order_id,
        accessKey: doc.chave_acesso,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
        protocolNumber: doc.numero_protocolo,
        signedXml: doc.xml_nfe,
      },
    };
  if (
    doc.status === 'erro' &&
    parseSefazAuthorization(String(doc.xml_protocolo || '')).cStat === '244'
  )
    return failure(
      409,
      'HML_SERIES_CORRECTION_REQUIRED',
      '244: A SEFAZ rejeitou a série. Corrija a série nas configurações fiscais e solicite uma nova tentativa vinculada; o XML rejeitado será preservado.',
      {
        documentId: doc.id,
        cStat: '244',
        pending: false,
        sefazContacted: false,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
      }
    );
  if (
    doc.status === 'erro' &&
    parseSefazAuthorization(String(doc.xml_protocolo || '')).cStat === '209'
  )
    return failure(
      409,
      'HML_ISSUER_IE_CORRECTION_REQUIRED',
      '209: A SEFAZ rejeitou a inscrição estadual do emitente. Confira o cadastro da Receita/PR ou a contabilidade; o XML e a resposta rejeitados serão preservados.',
      {
        documentId: doc.id,
        cStat: '209',
        pending: false,
        sefazContacted: false,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
      }
    );
  const previousRejection = parseSefazAuthorization(String(doc.xml_protocolo || ''));
  if (doc.status === 'erro' && doc.modelo === '65' && previousRejection.cStat === '704')
    return freshNfceEmissionRequired(doc, previousRejection.cStat);
  if (
    doc.status === 'erro' &&
    isDifferentKeyNumberConflict(
      previousRejection.cStat,
      previousRejection.xMotivo,
      String(doc.chave_acesso || '')
    )
  ) {
    return failure(
      409,
      'NFE_NUMBER_ALREADY_USED',
      `A numeração ${doc.numero_nfe} já está sendo usada; revise o número sugerido antes de tentar novamente.`,
      {
        documentId: doc.id,
        cStat: previousRejection.cStat,
        pending: false,
        sefazContacted: false,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
        numberConflict: fiscalNumberConflict(doc.numero_nfe),
      }
    );
  }
  if (
    doc.status === 'erro' &&
    previousRejection.cStat &&
    !['100', '101', '105', '204', '217'].includes(previousRejection.cStat)
  ) {
    return failure(
      409,
      'HML_SEFAZ_REJECTED',
      `${previousRejection.cStat}: ${previousRejection.xMotivo || doc.motivo_status || 'Tentativa anterior rejeitada pela SEFAZ.'}`,
      {
        documentId: doc.id,
        cStat: previousRejection.cStat,
        xMotivo: previousRejection.xMotivo,
        pending: false,
        sefazContacted: true,
        orderId: doc.order_id,
        nfeNumber: doc.numero_nfe,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
      }
    );
  }
  const pfx = process.env.NFE_CERTIFICATE_BASE64;
  if (!pfx) return failure(503, 'HML_CERTIFICATE_UNAVAILABLE', 'Certificado A1 não configurado.');
  let cert: ReturnType<typeof extractCertificateAndKey>;
  try {
    cert = extractCertificateAndKey(pfx, process.env.NFE_CERTIFICATE_PASSWORD || '');
  } catch {
    return failure(503, 'HML_CERTIFICATE_INVALID', 'Certificado A1 inválido.');
  }
  const attemptToken = randomUUID();
  const { data: claimed, error: claimError } = await db.rpc('claim_hml_nfe_attempt', {
    p_document_id: doc.id,
    p_attempt_token: attemptToken,
  });
  if (claimError || !claimed)
    return failure(
      409,
      'HML_ATTEMPT_IN_PROGRESS',
      'Outra chamada está conduzindo esta tentativa. Aguarde antes de consultar novamente.',
      { pending: true, documentId: doc.id, accessKey: doc.chave_acesso }
    );
  try {
    let consultation: Result;
    try {
      consultation = await consultExisting(db, doc, cert, attemptToken);
    } catch (error) {
      const transportDiagnostic = sefazTransportDiagnostic(error);
      const diagnosticId = randomUUID();
      const attemptDiagnostic = {
        diagnosticId,
        emissionRequestId: doc.emission_request_id,
        ...transportDiagnostic,
      };
      console.error('SEFAZ_HML_CONSULT', { documentId: doc.id, ...attemptDiagnostic });
      const { error: diagnosticPersistError } = await db.rpc('persist_hml_nfe_result', {
        p_document_id: doc.id,
        p_attempt_token: attemptToken,
        p_status: 'pendente',
        p_reason: `Consulta HML inconclusiva por transporte: ${JSON.stringify(attemptDiagnostic)}`,
        p_response_xml: String(doc.xml_protocolo || ''),
        p_protocol: null,
        p_items: [],
      });
      return failure(
        502,
        'HML_RECONCILIATION_REQUIRED',
        'Consulta da chave original inconclusiva; a retransmissão permanece bloqueada.',
        {
          pending: true,
          documentId: doc.id,
          accessKey: doc.chave_acesso,
          transportDiagnostic,
          diagnosticId,
          diagnosticStage: 'sefaz-consultation',
          diagnosticCategory: 'SEFAZ_TRANSPORT_FAILED',
          transportDiagnosticPersisted: !diagnosticPersistError,
        }
      );
    }
    if (consultation.body.code !== 'HML_CONFIRMED_NOT_FOUND') return consultation;
    if (doc.modelo === '65' && nfceXmlNeedsFreshEmission(doc.xml_nfe))
      return freshNfceEmissionRequired(doc, String(consultation.body.cStat || '217'));
    if (!allowRetransmission) return consultation;
    try {
      validateContributorNfeSeries(doc.serie);
    } catch {
      return failure(
        422,
        'HML_RETRY_SERIES_INVALID',
        'A série do XML original é incompatível com este emissor. A retransmissão foi bloqueada; preserve a tentativa e corrija a configuração fiscal.',
        { documentId: doc.id, pending: false, sefazContacted: false }
      );
    }
    if (!doc.xml_nfe || !doc.chave_acesso || !doc.fiscal_snapshot_id)
      return failure(409, 'HML_RETRY_XML_UNAVAILABLE', 'XML ou snapshot original não disponível.');
    try {
      await validateNfeAgainstOfficialSchema(doc.xml_nfe);
    } catch {
      return failure(409, 'HML_RETRY_XML_INVALID', 'XML original falhou no XSD oficial.');
    }
    const { error: reactivateError } = await db.rpc('reactivate_hml_nfe_retry', {
      p_document_id: doc.id,
      p_attempt_token: attemptToken,
    });
    if (reactivateError)
      return failure(
        409,
        'HML_RETRY_STATE_CHANGED',
        'A tentativa mudou de estado; consulte novamente.',
        { documentId: doc.id }
      );
    return await transmitAndPersist(
      db,
      doc.id,
      doc.xml_nfe,
      doc.chave_acesso,
      doc.numero_nfe,
      {
        documentId: doc.id,
        orderId: doc.order_id,
        accessKey: doc.chave_acesso,
        nfeNumber: doc.numero_nfe,
        fiscalSnapshotId: doc.fiscal_snapshot_id,
        emissionRequestId: doc.emission_request_id,
        series: doc.serie,
        model: doc.modelo,
        environment: 2,
      },
      cert,
      attemptToken
    );
  } finally {
    await releaseAttempt(db, doc.id, attemptToken);
  }
}

/** Recover persisted facts before loading today's commercial order or issuer settings. */
export async function recoverHmlTechnical(
  db: Database,
  command: FiscalEmissionCommand
): Promise<Result | null> {
  if (command.environment !== 2)
    return failure(
      503,
      'PRODUCTION_FISCAL_RULESET_REQUIRED',
      'Produção exige uma matriz fiscal aprovada própria.'
    );
  const { data: previous, error: previousError } = await db
    .from('nfe_documents')
    .select(
      'id,order_id,emission_request_id,ambiente,modelo,status,document_type,fiscal_ruleset_version,fiscal_snapshot_id,hml_attempt_token,hml_attempt_expires_at,numero_protocolo,xml_protocolo,hml_response_history,supersedes_document_id,numero_nfe,serie'
    )
    .eq('emission_request_id', command.emissionRequestId)
    .maybeSingle();
  if (previousError)
    return failure(
      503,
      'HML_ATTEMPT_READ_FAILED',
      'Não foi possível verificar a tentativa anterior. Nenhuma nova transmissão foi iniciada.'
    );
  if (previous) {
    if (
      previous.order_id !== command.orderId ||
      previous.ambiente !== 2 ||
      !['55', '65'].includes(previous.modelo) ||
      !isHmlRuleSet(previous.fiscal_ruleset_version)
    )
      return failure(
        409,
        'HML_IDEMPOTENCY_MISMATCH',
        'A chave de solicitação já pertence a outra tentativa fiscal.'
      );
    if (isFormallyAbandonedHmlAttempt(previous.hml_response_history))
      return failure(
        409,
        'HML_ATTEMPT_FORMALLY_ABANDONED',
        'Esta tentativa foi encerrada antes do envio à SEFAZ. Use a ação explícita para iniciar uma nova tentativa fiscal.',
        {
          pending: false,
          documentId: previous.id,
          emissionRequestId: command.emissionRequestId,
          orderId: command.orderId,
          environment: 2,
          model: previous.modelo,
          hmlCanAbandonTlsFailure: false,
        }
      );
    if ((previous.supersedes_document_id || null) !== (command.supersedesDocumentId || null))
      return failure(
        409,
        'HML_IDEMPOTENCY_MISMATCH',
        'A tentativa já está vinculada a outra origem fiscal. Consulte o documento original.'
      );
    if (
      command.itemCsosnOverrides !== undefined ||
      command.itemFiscalSelections ||
      command.recipientTaxId !== undefined ||
      command.finalConsumer !== undefined ||
      command.deliveryByIssuer !== undefined ||
      command.cardNotIntegrated !== undefined ||
      command.requestedNumber !== undefined
    ) {
      if (!previous.fiscal_snapshot_id)
        return failure(
          409,
          'HML_IDEMPOTENCY_MISMATCH',
          'A tentativa anterior não tem snapshot verificável das escolhas de CSOSN.'
        );
      const { data: snapshot, error } = await db
        .from('nfe_fiscal_snapshots')
        .select('snapshot_data,reserved_number')
        .eq('id', previous.fiscal_snapshot_id)
        .maybeSingle();
      if (error || !snapshot)
        return failure(
          409,
          'HML_IDEMPOTENCY_MISMATCH',
          'O snapshot fiscal original não está disponível para comparar esta tentativa. Consulte o documento original.'
        );
      const fiscalMismatchFields = getFiscalSelectionMismatchDetails(
        snapshot.snapshot_data,
        command
      );
      if (
        command.requestedNumber !== undefined &&
        snapshot.reserved_number !== command.requestedNumber
      )
        fiscalMismatchFields.push({
          field: 'número fiscal',
          snapshotValue: String(snapshot.reserved_number),
          currentValue: String(command.requestedNumber),
        });
      if (fiscalMismatchFields.length)
        return failure(
          409,
          'HML_IDEMPOTENCY_MISMATCH',
          'A tentativa fiscal existente não pode ser reutilizada porque os dados fiscais foram alterados após a criação do snapshot.',
          {
            pending: false,
            documentId: previous.id,
            orderId: command.orderId,
            emissionRequestId: command.emissionRequestId,
            nfeNumber: previous.numero_nfe,
            series: previous.serie,
            environment: 2,
            model: previous.modelo,
            fiscalMismatchFields,
            hmlCanAbandonTlsFailure: canAbandonBeforeHmlTransmission(previous),
          }
        );
    }
    return retryHmlTechnical(db, previous.id, false);
  }
  const activeAttempt = await activeAttemptMetadata(db, command.orderId);
  if ('documentId' in activeAttempt)
    return failure(
      409,
      'HML_SNAPSHOT_RESERVATION_FAILED',
      SNAPSHOT_REASON_MESSAGES.ALREADY_ACTIVE_FISCAL_ATTEMPT,
      {
        ...activeAttempt,
        pending: true,
        environment: 2,
        orderId: command.orderId,
        databaseCode: '23505',
        databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
        diagnosticStage: 'snapshot-reservation',
        numberReserved: false,
        sefazContacted: false,
      }
    );
  return null;
}
