import type { Database } from './types';
import { SNAPSHOT_REASON_MESSAGES } from './constants';

/** Extrai o código de negócio levantado pela RPC (token seguro, sem dados pessoais). */
export function snapshotReasonOf(error: unknown) {
  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message.trim()
      : '';
  if (/^[A-Z][A-Z0-9_]{2,80}$/.test(message)) return message;
  const check = message.match(
    /relation "([\w.]{1,80})" violates check constraint "([\w.]{1,120})"/
  );
  return check ? `CHECK:${check[1]}.${check[2]}` : undefined;
}

/** Find the conflicting intent without assuming the blocked request describes its SEFAZ contact. */
export async function activeAttemptMetadata(db: Database, orderId: string, model?: string) {
  const { data: doc, error } = await db
    .from('nfe_documents')
    .select('id,emission_request_id,chave_acesso,numero_nfe,serie,modelo,fiscal_snapshot_id')
    .eq('order_id', orderId)
    .eq('ambiente', 2)
    .eq('document_type', 'outbound')
    .in('status', ['pendente', 'processando', 'homologada', 'autorizada'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return {};
  if (doc)
    return {
      documentId: doc.id,
      emissionRequestId: doc.emission_request_id,
      accessKey: doc.chave_acesso,
      nfeNumber: doc.numero_nfe,
      series: doc.serie,
      model: doc.modelo,
      fiscalSnapshotId: doc.fiscal_snapshot_id,
    };
  if (!model) return {};
  const { data: snapshot, error: snapshotError } = await db
    .from('nfe_fiscal_snapshots')
    .select('id,emission_request_id,reserved_number,series,requested_model')
    .eq('order_id', orderId)
    .eq('environment', 2)
    .eq('requested_model', model)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (snapshotError || !snapshot) return {};
  return {
    emissionRequestId: snapshot.emission_request_id,
    fiscalSnapshotId: snapshot.id,
    nfeNumber: snapshot.reserved_number,
    series: snapshot.series,
    model: snapshot.requested_model,
    reservationRecoveryRequired: true,
  };
}

export function classifySnapshotReservationError(error: unknown) {
  const databaseCode =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[A-Z0-9]{5,8}$/.test(error.code)
      ? error.code
      : 'UNKNOWN';
  const databaseReason = snapshotReasonOf(error);
  const reasonMessage = databaseReason ? SNAPSHOT_REASON_MESSAGES[databaseReason] : undefined;
  if (reasonMessage)
    return {
      databaseCode,
      databaseReason,
      category: 'DATABASE_VALIDATION_REJECTED',
      hint: reasonMessage,
    };
  if (databaseCode === '42883')
    return {
      databaseCode,
      category: 'SQL_FUNCTION_NOT_FOUND',
      hint: 'O PostgreSQL não encontrou a função SQL solicitada. Verifique se a migration da reserva foi aplicada com a assinatura esperada.',
    };
  if (databaseCode === 'PGRST202')
    return {
      databaseCode,
      category: 'RPC_MISSING_FROM_SCHEMA_CACHE',
      hint: 'A função não foi localizada no schema cache do PostgREST. Confira a migration e atualize o cache do Supabase.',
    };
  if (databaseCode === 'PGRST203')
    return {
      databaseCode,
      category: 'RPC_SIGNATURE_AMBIGUOUS',
      hint: 'Há sobrecarga ambígua para a função de reserva. Confira e remova assinaturas conflitantes.',
    };
  if (databaseCode === '42501')
    return {
      databaseCode,
      category: 'DATABASE_PERMISSION_DENIED',
      hint: 'O papel de serviço não tem permissão para executar a reserva fiscal.',
    };
  if (databaseCode === '23505')
    return {
      databaseCode,
      category: 'DATABASE_UNIQUE_CONFLICT',
      hint: 'A reserva encontrou um registro fiscal duplicado ou uma chave de idempotência já usada.',
    };
  if (databaseCode === '23502')
    return {
      databaseCode,
      category: 'DATABASE_REQUIRED_VALUE_MISSING',
      hint: 'A reserva encontrou um campo obrigatório ausente no snapshot ou na sequência fiscal.',
    };
  if (databaseCode === '23503')
    return {
      databaseCode,
      category: 'DATABASE_REFERENCE_CONFLICT',
      hint: 'A reserva encontrou uma referência fiscal inexistente.',
    };
  if (databaseCode === '23514' || databaseCode === '22023')
    return {
      databaseCode,
      category: 'DATABASE_VALIDATION_REJECTED',
      hint: 'O banco rejeitou um parâmetro ou valor do snapshot fiscal.',
    };
  if (databaseCode.startsWith('08'))
    return {
      databaseCode,
      category: 'DATABASE_CONNECTION_FAILED',
      hint: 'O banco não conseguiu concluir a chamada de reserva.',
    };
  return {
    databaseCode,
    category: 'SNAPSHOT_RESERVATION_FAILED',
    hint: 'Consulte o log do servidor pelo identificador de diagnóstico para encontrar a causa.',
  };
}
