-- Bring the shared financial tables up to the manual-entry contract already
-- used by the mobile app, and add the requested expense-category hierarchy.
-- Existing transactions and category IDs are preserved.
set lock_timeout = '5s';
set idle_in_transaction_session_timeout = '60s';

alter table public.financial_categories
  add column if not exists parent_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.financial_categories'::regclass
      and conname = 'financial_categories_parent_id_fkey'
  ) then
    alter table public.financial_categories
      add constraint financial_categories_parent_id_fkey
      foreign key (parent_id) references public.financial_categories(id) on delete set null;
  end if;
end;
$$;

create index if not exists financial_categories_parent_id_idx
  on public.financial_categories(parent_id);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.financial_categories
  where type = 'expense' and lower(btrim(name)) = 'despesas operacionais';

  if v_count > 1 then
    raise exception 'Há mais de uma categoria de saída chamada Despesas Operacionais.';
  elsif v_count = 0 then
    insert into public.financial_categories (name, type, result_nature)
    values ('Despesas Operacionais', 'expense', 'DESPESA');
  else
    update public.financial_categories
      set result_nature = coalesce(result_nature, 'DESPESA')
      where type = 'expense' and lower(btrim(name)) = 'despesas operacionais';
  end if;
end;
$$;

update public.financial_categories child
set parent_id = parent.id
from public.financial_categories parent
where parent.type = 'expense'
  and lower(btrim(parent.name)) = 'despesas operacionais'
  and child.type = 'expense'
  and child.id <> parent.id
  and child.name not ilike 'Compra de Mercadorias%'
  and child.parent_id is distinct from parent.id;

-- These nullable/defaulted fields are already consumed by the mobile app. Adding
-- them here prevents its legacy "retry with fewer fields" path from losing data.
alter table public.financial_transactions
  add column if not exists transaction_time text,
  add column if not exists category_name text,
  add column if not exists account_id text default 'Caixa Geral',
  add column if not exists counterparty text,
  add column if not exists collaborator_id text,
  add column if not exists collaborator_name text,
  add column if not exists vehicle_id text,
  add column if not exists due_date date,
  add column if not exists due_day integer,
  add column if not exists is_recurring boolean not null default false,
  add column if not exists installments_total integer,
  add column if not exists installment_number integer,
  add column if not exists origin text not null default 'MANUAL',
  add column if not exists created_by text,
  add column if not exists status text not null default 'ACTIVE';

alter table public.financial_transactions
  drop constraint if exists financial_transactions_purpose_check;
alter table public.financial_transactions
  add constraint financial_transactions_purpose_check
  check (purpose in ('BUSINESS', 'PERSONAL', 'PERSONAL_PARTNER'));
