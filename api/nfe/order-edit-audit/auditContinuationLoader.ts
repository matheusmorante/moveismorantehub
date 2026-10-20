import {
  assertAuthorizedFiscalSnapshot,
  findFiscalOrderEditChanges,
  type AuthorizedFiscalDocumentForEdit,
} from '../orderEditFiscalAudit';
import type { FiscalSnapshotCandidate } from '../fiscalSnapshot';
import type { AuthorizedDocumentRow, OrderRow } from './auditOrderEdit.types';

export async function loadAuditedChanges(
  db: any,
  order: OrderRow,
  document: AuthorizedDocumentRow,
  proposedOrderData: Record<string, any>
) {
  if (!document.emission_request_id || !document.xml_nfe)
    throw new Error('A nota autorizada não possui vínculo técnico e XML íntegro para auditoria.');

  const { data: fiscalSnapshotRow, error } = await db
    .from('nfe_fiscal_snapshots')
    .select('snapshot_data')
    .eq('emission_request_id', document.emission_request_id)
    .eq('order_id', order.id)
    .maybeSingle();

  if (error || !fiscalSnapshotRow?.snapshot_data)
    throw new Error('Não existe fotografia fiscal imutável para comparar esta nota autorizada.');

  const snapshot = fiscalSnapshotRow.snapshot_data as FiscalSnapshotCandidate;
  const resolvedDocument = assertAuthorizedFiscalSnapshot(
    snapshot,
    document as AuthorizedFiscalDocumentForEdit
  );

  return findFiscalOrderEditChanges(snapshot, proposedOrderData, resolvedDocument);
}

export async function loadContinuationReplacements(db: any, orderId: string) {
  const { data: rows, error } = await db
    .from('nfe_order_edit_replacements')
    .select(
      'id,original_document_id,environment,reversal_kind,status,operation_draft_id,source_document_snapshot,replacement_document_id'
    )
    .eq('order_id', orderId)
    .neq('status', 'completed')
    .order('created_at');

  if (error) throw new Error('O registro de substituição fiscal está indisponível.');

  return Promise.all(
    (rows || []).map(async (row: any) => {
      const { data: confirmed, error: proofError } = await db.rpc(
        'is_order_edit_reversal_confirmed',
        {
          p_original_document_id: row.original_document_id,
        }
      );
      if (proofError) throw new Error('Não foi possível comprovar a reversão da nota original.');
      const source = row.source_document_snapshot;
      return {
        id: row.id,
        status: row.status,
        action: row.reversal_kind,
        environment: row.environment,
        reversalConfirmed: confirmed === true,
        draftId: row.operation_draft_id,
        replacementDocumentId: row.replacement_document_id,
        sourceDocument: {
          id: row.original_document_id,
          order_id: orderId,
          modelo: source.modelo,
          ambiente: row.environment,
          numero_nfe: source.numero_nfe,
          serie: source.serie,
          chave_acesso: source.chave_acesso,
        },
      };
    })
  );
}
