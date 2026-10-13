-- Catalog and pure-function checks after authorized application of 20261013123000.
-- No fixtures or business writes. Does not prove reservation/rollback/concurrency.
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;
SELECT plan(24);
WITH expected_functions(signature, definer, path, client_execute) AS (VALUES
  ('public.apply_nfe_snapshot_recipient_tax_id(jsonb,uuid,text)', true, 'search_path=""', false),
  ('public.is_nfe_hml_number_conflict(text,text)', false, 'search_path=""', false),
  ('public.prepare_nfe_operation_draft(text,uuid,text,smallint,text,uuid)', true, 'search_path=public', false),
  ('public.reserve_nfe_outbound_emission(text,character varying,integer,uuid,character varying,text,integer,character varying)', true, 'search_path=public', false),
  ('public.persist_authorized_nfe_operation_draft(uuid,uuid,integer,text,character varying,text,text,text,timestamp with time zone,text,text,jsonb)', true, 'search_path=public', false),
  ('public.peek_nfe_outbound_number(text,text,integer,text,integer)', false, 'search_path=""', false),
  ('public.prepare_nfe_outbound_attempt(jsonb,text,text,jsonb,uuid,uuid,integer)', false, 'search_path=""', false),
  ('public.reserve_hml_nfe_outbound(text,uuid,character varying,text,integer,character varying,jsonb,uuid)', false, 'search_path=""', true)
),
expected_constraints(table_name,constraint_name) AS (VALUES
  ('public.nfe_operation_drafts', 'nfe_operation_drafts_original_access_key_check'),
  ('public.nfe_establishment_sequences', 'nfe_establishment_sequences_issuer_cnpj_check'),
  ('public.nfe_legacy_sequence_scope', 'nfe_legacy_sequence_scope_issuer_cnpj_check'),
  ('public.nfe_outbound_attempts', 'nfe_outbound_attempts_issuer_cnpj_check'),
  ('public.nfe_outbound_attempts', 'nfe_outbound_attempts_access_key_check')
)
SELECT unnest(ARRAY[ok(coalesce(position('[A-Z0-9]{12}' in pg_get_functiondef(to_regprocedure(signature)))>0,false), signature || ': accepts alphanumeric identity'),
  ok(coalesce((SELECT p.prosecdef=definer AND path=ANY(p.proconfig)
    AND has_function_privilege('service_role',p.oid,'EXECUTE')
    AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
    AND has_function_privilege('authenticated',p.oid,'EXECUTE')=client_execute
    FROM pg_proc p WHERE p.oid=to_regprocedure(signature)),false), signature || ': preserves security and ACL')]) AS result
FROM expected_functions
UNION ALL
SELECT ok(coalesce((SELECT position('[A-Z0-9]{12}' in pg_get_constraintdef(oid))>0
  FROM pg_constraint WHERE conrelid=to_regclass(table_name) AND conname=constraint_name),false), constraint_name || ': expanded')
FROM expected_constraints
UNION ALL
SELECT ok(position('[./[:space:]-]' in pg_get_indexdef('public.uq_nfe_snapshot_establishment_sequence'::regclass))>0,
  'unique sequence index preserves letters')
UNION ALL
SELECT ok(public.is_nfe_hml_number_conflict(
  '<retEnviNFe><cStat>539</cStat><xMotivo>Duplicidade [chNFe:41261012ABC34501DE35550010000001061705367144]</xMotivo></retEnviNFe>',
  '41261012ABC34501DE35550010000001061705367136'::text), '539 recognizes same alphanumeric establishment and number')
UNION ALL
SELECT ok(NOT public.is_nfe_hml_number_conflict(
  '<retEnviNFe><cStat>539</cStat><xMotivo>Duplicidade [chNFe:41261012345678000195550010000001061705367136]</xMotivo></retEnviNFe>',
  '41261012ABC34501DE35550010000001061705367136'::text), '539 does not conflate numeric and alphanumeric issuers');
SELECT * FROM finish();
ROLLBACK;
