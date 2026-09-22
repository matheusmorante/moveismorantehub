-- Métricas agregadas do Dashboard.
-- A tabela é derivada de orders; nunca deve ser editada diretamente pelo frontend.
create table if not exists public.dashboard_daily_metrics (
  metric_date date primary key,
  revenue numeric(14,2) not null default 0,
  orders integer not null default 0,
  cost numeric(14,2) not null default 0,
  profit numeric(14,2) not null default 0,
  items_without_cost integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists dashboard_daily_metrics_date_idx
  on public.dashboard_daily_metrics (metric_date desc);

create or replace function public.refresh_dashboard_metric_day(p_day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revenue numeric(14,2) := 0;
  v_cost numeric(14,2) := 0;
  v_orders integer := 0;
  v_without_cost integer := 0;
begin
  with normalized as (
    select
      o.id,
      lower(coalesce(o.status, o.order_data->>'status', '')) as status,
      lower(coalesce(o.order_data->>'orderType', 'sale')) as order_type,
      coalesce(nullif(o.order_data->>'date', '')::timestamptz, o.created_at)::date as metric_date,
      coalesce(
        nullif(o.order_data #>> '{paymentsSummary,totalOrderValue}', '')::numeric,
        coalesce(o.total_amount, 0)
      ) as order_value,
      coalesce(o.order_data->'items', '[]'::jsonb) as items,
      coalesce(o.deleted, false) as deleted
    from public.orders o
  ), eligible as (
    select *,
      case
        when status in ('scheduled', 'fulfilled') and order_type in ('sale', 'showroom') then 1
        when status = 'fulfilled' and order_type = 'return' then -1
        else 0
      end as revenue_factor
    from normalized
    where not deleted and metric_date = p_day
  ), item_costs as (
    select
      e.id,
      e.revenue_factor,
      coalesce(sum(
        coalesce(nullif(item->>'quantity', '')::numeric, 0) *
        coalesce(nullif(coalesce(item->>'unitCost', item->>'costPrice'), '')::numeric, 0)
      ) filter (where coalesce(item->>'isTemporaryProduct', 'false') <> 'true' and item->>'productId' is not null), 0) as order_cost,
      count(*) filter (
        where coalesce(item->>'isTemporaryProduct', 'false') <> 'true'
          and item->>'productId' is not null
          and coalesce(item->>'unitCost', item->>'costPrice') is null
      ) as missing_cost
    from eligible e
    left join lateral jsonb_array_elements(e.items) item on true
    where e.revenue_factor <> 0
    group by e.id, e.revenue_factor
  )
  select
    coalesce(sum(e.order_value * e.revenue_factor), 0),
    coalesce(sum(c.order_cost * e.revenue_factor), 0),
    count(*) filter (where e.revenue_factor = 1),
    coalesce(sum(c.missing_cost), 0)
  into v_revenue, v_cost, v_orders, v_without_cost
  from eligible e
  left join item_costs c on c.id = e.id
  where e.revenue_factor <> 0;

  insert into public.dashboard_daily_metrics(metric_date, revenue, orders, cost, profit, items_without_cost, updated_at)
  values (p_day, v_revenue, v_orders, v_cost, v_revenue - v_cost, v_without_cost, now())
  on conflict (metric_date) do update set
    revenue = excluded.revenue,
    orders = excluded.orders,
    cost = excluded.cost,
    profit = excluded.profit,
    items_without_cost = excluded.items_without_cost,
    updated_at = now();
end;
$$;

create or replace function public.refresh_dashboard_metrics_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.refresh_dashboard_metric_day(
      coalesce(nullif(old.order_data->>'date', '')::timestamptz, old.created_at)::date
    );
  end if;
  if tg_op <> 'DELETE' then
    perform public.refresh_dashboard_metric_day(
      coalesce(nullif(new.order_data->>'date', '')::timestamptz, new.created_at)::date
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists orders_dashboard_metrics_refresh on public.orders;
create trigger orders_dashboard_metrics_refresh
after insert or update or delete on public.orders
for each row execute function public.refresh_dashboard_metrics_trigger();

create or replace function public.get_dashboard_daily_metrics(p_start date, p_end date)
returns table(metric_date date, revenue numeric, orders integer, cost numeric, profit numeric, items_without_cost integer)
language sql
security invoker
set search_path = public
as $$
  select metric_date, revenue, orders, cost, profit, items_without_cost
  from public.dashboard_daily_metrics
  where metric_date between p_start and p_end
  order by metric_date;
$$;

alter table public.dashboard_daily_metrics enable row level security;
drop policy if exists dashboard_daily_metrics_read_authenticated on public.dashboard_daily_metrics;
create policy dashboard_daily_metrics_read_authenticated
  on public.dashboard_daily_metrics for select to authenticated using (true);

-- Backfill inicial; alterações futuras são mantidas pelo trigger.
do $$
declare d date;
begin
  for d in select distinct coalesce(nullif(order_data->>'date', '')::timestamptz, created_at)::date from public.orders loop
    perform public.refresh_dashboard_metric_day(d);
  end loop;
end;
$$;
