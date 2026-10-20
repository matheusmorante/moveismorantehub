-- Migration: 20261019220000_fix_order_edit_reversal_confirmed_retry
-- Problema: is_order_edit_reversal_confirmed verifica draft.id=r.operation_draft_id.
-- Quando o operador reinicia uma tentativa de estorno rejeitada, um novo draft é criado
-- (novo UUID) e autorizado pela SEFAZ, mas a coluna operation_draft_id continua apontando
-- para o draft rejeitado original. Logo a função retorna false mesmo o estorno estando
-- autorizado, bloqueando guard_order_fiscal_edit e finalize_fiscal_order_edit.
--
-- Solução: Para o ramo 'estorno', substituir a verificação estrita draft.id=r.operation_draft_id
-- por uma busca de qualquer draft autorizado com operation_kind='estorno',
-- original_document_id=d.id e ambiente=d.ambiente — comprovado pelo documento fiscal emitido.
-- Isso é seguro porque a existência do nfe_documents.document_type='estorno' com
-- status=autorizada/homologada, numero_protocolo e xml_nfe não-nulos já garante integridade.

CREATE OR REPLACE FUNCTION public.is_order_edit_reversal_confirmed(p_original_document_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT 1 FROM public.nfe_order_edit_replacements r
 JOIN public.nfe_documents d ON d.id=r.original_document_id AND d.order_id=r.order_id AND d.ambiente=r.environment
 WHERE r.original_document_id=p_original_document_id AND (
   r.reversal_kind='cancel' AND d.status='cancelada' AND EXISTS (
     SELECT 1 FROM public.nfe_document_events e WHERE e.document_id=d.id AND e.environment=d.ambiente
     AND e.event_type='110111' AND e.status='registered' AND e.protocol_number IS NOT NULL)
   OR r.reversal_kind='estorno' AND EXISTS (
     -- Aceita qualquer draft de estorno autorizado para este documento original, independente
     -- de qual draft está registrado em operation_draft_id (cobre o caso de retry com novo draft).
     SELECT 1 FROM public.nfe_operation_drafts draft
     JOIN public.nfe_documents reverse ON reverse.id=draft.document_id
     WHERE draft.original_document_id=d.id AND draft.environment=d.ambiente
     AND draft.operation_kind='estorno' AND draft.status='authorized'
     AND reverse.original_document_id=d.id AND reverse.ambiente=d.ambiente AND reverse.modelo='55'
     AND reverse.document_type='estorno' AND reverse.status=CASE WHEN d.ambiente=1 THEN 'autorizada' ELSE 'homologada' END
     AND reverse.numero_protocolo IS NOT NULL AND reverse.xml_nfe IS NOT NULL
   )
 ));
$$;
REVOKE ALL ON FUNCTION public.is_order_edit_reversal_confirmed(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_order_edit_reversal_confirmed(uuid) TO service_role;
