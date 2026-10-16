-- Read-only catalog and pure-function checks; no commercial fixtures/writes.
-- Run only on the authorized operational project after its named migration.
with commands as (
  select p.* from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('settle_financial_account', 'create_recurring_payable_expense')
), checks as (
  select '01_result_nature_columns' as test, (select count(*) = 2 from information_schema.columns
    where table_schema = 'public' and table_name in ('financial_categories','financial_transactions') and column_name = 'result_nature') as passed
  union all select '02_purpose_column', exists(select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'financial_transactions' and column_name = 'purpose')
  union all select '03_recurring_rls', (select relrowsecurity from pg_class where oid = 'public.recurring_expenses'::regclass)
  union all select '04_series_fk', exists(select 1 from pg_constraint where contype = 'f'
    and conrelid = 'public.accounts_payable'::regclass and confrelid = 'public.recurring_expenses'::regclass)
  union all select '05_series_index', exists(select 1 from pg_indexes where schemaname = 'public'
    and tablename = 'accounts_payable' and indexname = 'accounts_payable_recurring_expense_id_idx')
  union all select '06_two_invoker_commands', (select count(*) = 2 and bool_and(not prosecdef) from commands)
  union all select '07_command_timeouts', (select bool_and(proconfig @> array['lock_timeout=5s', 'idle_in_transaction_session_timeout=60s']) from commands)
  union all select '08_command_search_path', (select bool_and(proconfig @> array['search_path=""']) from commands)
  union all select '09_no_anon_command_access', not has_function_privilege('anon','public.settle_financial_account(text,text,date,jsonb)','execute')
    and not has_function_privilege('anon','public.create_recurring_payable_expense(uuid,jsonb)','execute')
  union all select '10_authenticated_command_access', has_function_privilege('authenticated','public.settle_financial_account(text,text,date,jsonb)','execute')
    and has_function_privilege('authenticated','public.create_recurring_payable_expense(uuid,jsonb)','execute')
  union all select '11_unique_transaction_intent', exists(select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'public.financial_transactions'::regclass and i.indisunique
      and pg_get_indexdef(c.oid) like '%(idempotency_key)%' and pg_get_expr(i.indpred,i.indrelid) like '%IS NOT NULL%')
  union all select '12_no_anon_rede_access', not has_table_privilege('anon','public.rede_config','select')
    and not has_table_privilege('anon','public.rede_config','insert') and not has_table_privilege('anon','public.rede_config','update')
    and not has_table_privilege('anon','public.rede_config','delete')
  union all select '13_rede_admin_policy', (select count(*) = 1 and bool_and(roles = array['authenticated']::name[]
    and qual like '%is_administrator%' and with_check like '%is_administrator%')
    from pg_policies where schemaname = 'public' and tablename = 'rede_config')
  union all select '14_classification_fallback', public.financial_result_nature('Compra de mercadorias','expense') = 'NAO_AFETA_RESULTADO'
    and public.financial_result_nature('Empréstimo','income') = 'NAO_AFETA_RESULTADO'
    and public.financial_result_nature('Venda','income') = 'RECEITA'
    and public.financial_result_nature(null,'expense') = 'DESPESA'
  union all select '15_civil_month_clamping', (date '2026-01-31' + make_interval(months => 1))::date = date '2026-02-28'
    and (date '2026-01-31' + make_interval(months => 2))::date = date '2026-03-31'
    and (date '2024-02-29' + make_interval(months => 12))::date = date '2025-02-28'
)
select test, coalesce(passed, false) as passed from checks order by test;
