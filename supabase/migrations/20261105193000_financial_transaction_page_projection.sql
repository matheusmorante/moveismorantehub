-- Keep only fields consumed by the ERP transaction table and its detail/edit
-- dialogs in the network response. created_at remains available internally for
-- deterministic ordering but is not returned to the client.
create or replace function public.get_financial_transaction_page(
  p_start_date date default null,
  p_end_date date default null,
  p_type text default 'all',
  p_category_id text default null,
  p_payment_method text default null,
  p_account_id text default null,
  p_created_by text default null,
  p_search text default null,
  p_limit integer default 15,
  p_offset integer default 0
) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
with search_terms as (
  select array(
    select split_tokens.token
    from pg_catalog.regexp_split_to_table(
      public.immutable_unaccent(pg_catalog.lower(pg_catalog.btrim(coalesce(p_search, '')))),
      '\s+'
    ) as split_tokens(token)
    where split_tokens.token <> ''
  ) as tokens
),
filtered as (
  select
    t.id,
    t.type,
    t.amount,
    t.date,
    t.description,
    t.payment_method,
    t.category_id,
    coalesce(t.category_name, c.name) as category_name,
    t.result_nature,
    t.purpose,
    t.transaction_time,
    t.account_id,
    t.counterparty,
    t.collaborator_id,
    t.collaborator_name,
    t.vehicle_id,
    t.origin,
    t.created_by,
    t.status,
    t.notes,
    t.created_at
  from public.financial_transactions t
  left join public.financial_categories c on c.id::text = t.category_id
  cross join search_terms s
  where (p_start_date is null or t.date >= p_start_date)
    and (p_end_date is null or t.date <= p_end_date)
    and (p_type is null or p_type = 'all' or t.type::text = p_type)
    and (p_category_id is null or t.category_id = p_category_id)
    and (p_payment_method is null or t.payment_method = p_payment_method)
    and (p_account_id is null or t.account_id = p_account_id)
    and (p_created_by is null or t.created_by = p_created_by)
    and not exists (
      select 1
      from pg_catalog.unnest(s.tokens) as search_token(value)
      where pg_catalog.strpos(
        public.immutable_unaccent(pg_catalog.lower(pg_catalog.concat_ws(
          ' ', t.description, coalesce(t.category_name, c.name), t.counterparty,
          t.collaborator_name, t.notes
        ))),
        search_token.value
      ) = 0
    )
),
summary as (
  select
    pg_catalog.count(*)::integer as total_count,
    coalesce(pg_catalog.sum(amount) filter (
      where type::text = 'income'
        and coalesce(status::text, 'ACTIVE') not in ('PENDING', 'REVERSED', 'CANCELLED')
    ), 0) as income_total,
    coalesce(pg_catalog.sum(amount) filter (
      where type::text = 'expense'
        and coalesce(status::text, 'ACTIVE') not in ('PENDING', 'REVERSED', 'CANCELLED')
    ), 0) as expense_total
  from filtered
),
page as (
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', selected_row.id,
        'type', selected_row.type,
        'amount', selected_row.amount,
        'date', selected_row.date,
        'description', selected_row.description,
        'payment_method', selected_row.payment_method,
        'category_id', selected_row.category_id,
        'category_name', selected_row.category_name,
        'result_nature', selected_row.result_nature,
        'purpose', selected_row.purpose,
        'transaction_time', selected_row.transaction_time,
        'account_id', selected_row.account_id,
        'counterparty', selected_row.counterparty,
        'collaborator_id', selected_row.collaborator_id,
        'collaborator_name', selected_row.collaborator_name,
        'vehicle_id', selected_row.vehicle_id,
        'origin', selected_row.origin,
        'created_by', selected_row.created_by,
        'status', selected_row.status,
        'notes', selected_row.notes
      )
      order by selected_row.date desc, selected_row.created_at desc nulls last, selected_row.id asc
    ),
    '[]'::jsonb
  ) as rows
  from (
    select *
    from filtered
    order by date desc, created_at desc nulls last, id asc
    limit least(greatest(coalesce(p_limit, 15), 1), 15)
    offset greatest(coalesce(p_offset, 0), 0)
  ) selected_row
)
select pg_catalog.jsonb_build_object(
  'rows', page.rows,
  'total_count', summary.total_count,
  'income_total', summary.income_total,
  'expense_total', summary.expense_total
)
from summary cross join page;
$$;
