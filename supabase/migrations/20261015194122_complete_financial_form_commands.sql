-- Expand the financial contract without rewriting historical business rows.
-- Application requires specific authorization for the operational project.
set lock_timeout = '5s';
set idle_in_transaction_session_timeout = '60s';

alter table public.financial_transactions
  add column if not exists result_nature text
  constraint financial_transactions_result_nature_check
  check (result_nature in ('RECEITA', 'DESPESA', 'NAO_AFETA_RESULTADO'));
alter table public.financial_categories
  add column if not exists result_nature text
  constraint financial_categories_result_nature_check
  check (result_nature in ('RECEITA', 'DESPESA', 'NAO_AFETA_RESULTADO'));
alter table public.financial_transactions
  add column if not exists purpose text constraint financial_transactions_purpose_check
  check (purpose in ('BUSINESS', 'PERSONAL'));

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null check (length(btrim(description)) > 0),
  amount numeric not null check (amount > 0 and amount::text not in ('NaN', 'Infinity', '-Infinity') and amount = round(amount, 2)),
  category_id uuid references public.financial_categories(id),
  frequency text not null check (frequency in ('monthly', 'yearly')),
  due_day integer not null check (due_day between 1 and 31),
  start_date date not null,
  end_date date check (end_date >= start_date),
  active boolean not null default true,
  last_processed_date date,
  created_by uuid not null default auth.uid() references auth.users(id),
  creation_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recurring_expenses_category_id_idx on public.recurring_expenses(category_id);
create index recurring_expenses_created_by_idx on public.recurring_expenses(created_by);
alter table public.recurring_expenses enable row level security;
revoke all on public.recurring_expenses from public, anon;
grant select, insert, update on public.recurring_expenses to authenticated;
grant all on public.recurring_expenses to service_role;
create policy recurring_expenses_read on public.recurring_expenses for select to authenticated using (true);
create policy recurring_expenses_create on public.recurring_expenses for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy recurring_expenses_update on public.recurring_expenses for update to authenticated
  using ((select public.is_administrator())) with check ((select public.is_administrator()));

alter table public.accounts_payable add column recurring_expense_id uuid references public.recurring_expenses(id);
create index accounts_payable_recurring_expense_id_idx on public.accounts_payable(recurring_expense_id);

-- Same fallback classification used by financeService.determineResultNature.
create function public.financial_result_nature(p_name text, p_type text) returns text
language sql immutable security invoker set search_path = '' as $$
  select case when lower(coalesce(p_name, '')) like any (array[
    '%aporte%', '%empréstimo%', '%emprestimo%', '%financiamento%', '%saldo inicial%',
    '%devolução%', '%devolucao%', '%retirada de sócio%', '%distribuição de lucros%',
    '%distribuicao de lucros%', '%amortização%', '%amortizacao%', '%compra de estoque%',
    '%compra de mercadoria%'
  ]) then 'NAO_AFETA_RESULTADO' when p_type = 'income' then 'RECEITA' else 'DESPESA' end;
$$;

-- Row locks serialize concurrent settlement of the same account. The ledger
-- and paid status commit together. No network call occurs in this transaction.
create function public.settle_financial_account(
  p_kind text, p_account_id text, p_payment_date date, p_expected jsonb
) returns jsonb language plpgsql security invoker
set search_path = '' set lock_timeout = '5s' set idle_in_transaction_session_timeout = '60s' as $$
declare
  v_account jsonb;
  v_amount numeric;
  v_category text;
  v_type text;
  v_description text;
  v_method text;
  v_key text;
  v_transaction public.financial_transactions%rowtype;
  v_existing integer;
  v_updated integer;
  v_nature text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('payable', 'receivable') or nullif(btrim(p_account_id), '') is null
    or p_payment_date is null or not isfinite(p_payment_date)
    or jsonb_typeof(p_expected) is distinct from 'object'
    or not (p_expected ?& array['description', 'amount', 'category_id'])
    or jsonb_typeof(p_expected->'description') is distinct from 'string'
    or jsonb_typeof(p_expected->'amount') is distinct from 'number'
    or jsonb_typeof(p_expected->'category_id') not in ('null', 'string') then
    raise exception 'Invalid settlement command' using errcode = '22023';
  end if;
  if p_kind = 'payable' then
    select to_jsonb(a) into v_account from public.accounts_payable a where a.id = p_account_id::uuid for update;
    v_type := 'expense'; v_method := 'Manual';
  else
    select to_jsonb(a) into v_account from public.accounts_receivable a where a.id = p_account_id for update;
    v_type := 'income'; v_method := 'Manual/Outros';
  end if;
  if v_account is null then raise exception 'Account unavailable' using errcode = '42501'; end if;
  v_amount := (v_account->>'amount')::numeric;
  v_category := nullif(v_account->>'category_id', '');
  v_description := case when p_kind = 'payable' then 'Pagamento: ' else 'Recebimento: ' end || btrim(v_account->>'description');
  v_key := 'finance:settlement:' || p_kind || ':' || p_account_id;
  if v_amount <= 0 or v_amount::text in ('NaN', 'Infinity', '-Infinity') or v_amount <> round(v_amount, 2)
    or btrim(v_account->>'description') is distinct from p_expected->>'description'
    or v_amount is distinct from (p_expected->>'amount')::numeric
    or v_category is distinct from nullif(p_expected->>'category_id', '') then
    raise exception 'Account changed; reload before settlement' using errcode = '22023';
  end if;
  select count(*) into v_existing from public.financial_transactions t
    where (p_kind = 'payable' and t.payable_id = p_account_id)
       or (p_kind = 'receivable' and t.receivable_id = p_account_id)
       or t.idempotency_key = v_key;
  if v_account->>'status' = 'paid' and v_existing = 1 then
    select t.* into v_transaction from public.financial_transactions t where t.idempotency_key = v_key;
    if v_transaction.id is not null and v_transaction.amount = v_amount and v_transaction.type = v_type
      and v_transaction.date = p_payment_date and v_account->>'payment_date' = p_payment_date::text
      and v_transaction.description = v_description and v_transaction.payment_method = v_method
      and nullif(v_transaction.category_id, '') is not distinct from v_category
      and (case when p_kind = 'payable' then v_transaction.payable_id else v_transaction.receivable_id end) = p_account_id then
      return jsonb_build_object('id', p_account_id, 'status', 'paid', 'payment_date', p_payment_date,
        'transaction_id', v_transaction.id, 'already_applied', true);
    end if;
  end if;
  if v_account->>'status' not in ('pending', 'overdue') or v_existing <> 0 then
    raise exception 'Account requires reconciliation before settlement' using errcode = '22023';
  end if;
  if v_category is not null then
    select coalesce(c.result_nature, public.financial_result_nature(c.name, v_type)) into v_nature
      from public.financial_categories c where c.id::text = v_category and c.type = v_type;
    if not found then raise exception 'Category unavailable' using errcode = '22023'; end if;
  else v_nature := public.financial_result_nature(null, v_type);
  end if;
  insert into public.financial_transactions
    (id, description, amount, type, date, category_id, payment_method, payable_id, receivable_id, idempotency_key, result_nature)
  values (gen_random_uuid()::text, v_description, v_amount, v_type, p_payment_date, v_category, v_method,
    case when p_kind = 'payable' then p_account_id end,
    case when p_kind = 'receivable' then p_account_id end, v_key, v_nature) returning * into v_transaction;
  if p_kind = 'payable' then
    update public.accounts_payable set status = 'paid', payment_date = p_payment_date, updated_at = now() where id = p_account_id::uuid;
  else
    update public.accounts_receivable set status = 'paid', payment_date = p_payment_date, updated_at = now() where id = p_account_id;
  end if;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Account update denied' using errcode = '42501'; end if;
  return jsonb_build_object('id', p_account_id, 'status', 'paid', 'payment_date', p_payment_date,
    'transaction_id', v_transaction.id, 'already_applied', false);
end;
$$;

-- A request UUID belongs to one operator and one immutable creation payload.
-- A retry acknowledges the existing series; it never creates twelve more rows.
create function public.create_recurring_payable_expense(p_request_id uuid, p_payload jsonb)
returns jsonb language plpgsql security invoker
set search_path = '' set lock_timeout = '5s' set idle_in_transaction_session_timeout = '60s' as $$
declare
  v_payable jsonb := p_payload->'payable';
  v_start date;
  v_amount numeric;
  v_frequency text := p_payload->>'frequency';
  v_existing public.recurring_expenses%rowtype;
  v_ids jsonb;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_request_id is null or jsonb_typeof(p_payload) is distinct from 'object'
    or jsonb_typeof(v_payable) is distinct from 'object' or v_frequency is null or v_frequency not in ('monthly', 'yearly')
    or v_payable->>'status' is distinct from 'pending' or nullif(btrim(v_payable->>'description'), '') is null
    or nullif(v_payable->>'category_id', '') is null
    or jsonb_typeof(v_payable->'amount') is distinct from 'number'
    or coalesce(v_payable->>'due_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or jsonb_typeof(v_payable->'supplier_name') is distinct from 'string'
    or jsonb_typeof(v_payable->'notes') is distinct from 'string' then
    raise exception 'Invalid recurring expense command' using errcode = '22023';
  end if;
  v_start := (v_payable->>'due_date')::date;
  v_amount := (v_payable->>'amount')::numeric;
  if v_amount <= 0 or v_amount::text in ('NaN', 'Infinity', '-Infinity') or v_amount <> round(v_amount, 2) then
    raise exception 'Invalid recurring amount' using errcode = '22023';
  end if;
  perform 1 from public.financial_categories where id::text = v_payable->>'category_id' and type = 'expense';
  if not found then raise exception 'Expense category unavailable' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('finance:recurring:' || p_request_id::text, 0));
  -- The advisory lock already serializes this request. FOR UPDATE here would
  -- also apply the administrator-only UPDATE policy to an owner's replay.
  select * into v_existing from public.recurring_expenses where id = p_request_id;
  if found then
    if v_existing.created_by is distinct from auth.uid() or v_existing.creation_payload is distinct from p_payload then
      raise exception 'Recurring request conflict' using errcode = '22023';
    end if;
    select count(*), jsonb_agg(id order by due_date, id) into v_count, v_ids
      from public.accounts_payable where recurring_expense_id = p_request_id;
    if v_count <> 12 then raise exception 'Recurring series requires reconciliation' using errcode = '22023'; end if;
    return jsonb_build_object('recurring_expense_id', p_request_id, 'payable_ids', v_ids, 'already_applied', true);
  end if;
  insert into public.recurring_expenses (id, description, amount, category_id, frequency, due_day, start_date, creation_payload)
    values (p_request_id, btrim(v_payable->>'description'), v_amount, (v_payable->>'category_id')::uuid,
      v_frequency, extract(day from v_start)::integer, v_start, p_payload);
  with inserted as (
    insert into public.accounts_payable
      (description, amount, due_date, status, category_id, supplier_name, notes, recurring_expense_id)
    select btrim(v_payable->>'description') || ' (Auto)', v_amount,
      (v_start + make_interval(months => n * case when v_frequency = 'monthly' then 1 else 12 end))::date,
      'pending', (v_payable->>'category_id')::uuid, v_payable->>'supplier_name', v_payable->>'notes', p_request_id
    from generate_series(0, 11) n returning id, due_date
  ) select jsonb_agg(id order by due_date, id) into v_ids from inserted;
  return jsonb_build_object('recurring_expense_id', p_request_id, 'payable_ids', v_ids, 'already_applied', false);
end;
$$;

revoke all on function public.financial_result_nature(text, text) from public, anon;
revoke all on function public.settle_financial_account(text, text, date, jsonb) from public, anon;
revoke all on function public.create_recurring_payable_expense(uuid, jsonb) from public, anon;
grant execute on function public.financial_result_nature(text, text) to authenticated, service_role;
grant execute on function public.settle_financial_account(text, text, date, jsonb) to authenticated, service_role;
grant execute on function public.create_recurring_payable_expense(uuid, jsonb) to authenticated, service_role;

-- Correct the observed permissive policy only on the integration settings.
-- No credential values are selected or rewritten by this migration.
alter table public.rede_config enable row level security;
alter policy "Admins can manage rede_config" on public.rede_config to authenticated
  using ((select public.is_administrator())) with check ((select public.is_administrator()));
revoke all on public.rede_config from public, anon;
revoke truncate, references, trigger on public.rede_config from authenticated;
grant select, insert, update, delete on public.rede_config to authenticated;
