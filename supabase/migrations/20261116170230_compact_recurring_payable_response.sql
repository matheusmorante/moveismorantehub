-- Preserve the existing RPC contract for any external callers while giving
-- the ERP form a compact confirmation instead of twelve UUIDs.
create function public.create_recurring_payable_expense_compact(
  p_request_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
set lock_timeout = '5s'
set idle_in_transaction_session_timeout = '60s'
as $$
declare
  v_result jsonb;
  v_payable_ids jsonb;
  v_already_applied jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_result := public.create_recurring_payable_expense(p_request_id, p_payload);
  if jsonb_typeof(v_result) is distinct from 'object' then
    raise exception 'Recurring series requires reconciliation' using errcode = '22023';
  end if;

  v_payable_ids := v_result -> 'payable_ids';
  v_already_applied := v_result -> 'already_applied';
  if v_result ->> 'recurring_expense_id' is distinct from p_request_id::text
    or jsonb_typeof(v_payable_ids) is distinct from 'array'
    or jsonb_typeof(v_already_applied) is distinct from 'boolean' then
    raise exception 'Recurring series requires reconciliation' using errcode = '22023';
  end if;
  if jsonb_array_length(v_payable_ids) <> 12 then
    raise exception 'Recurring series requires reconciliation' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'recurring_expense_id', p_request_id,
    'payable_count', 12,
    'already_applied', (v_already_applied #>> '{}')::boolean
  );
end;
$$;

revoke all on function public.create_recurring_payable_expense_compact(uuid, jsonb)
  from public, anon, service_role;
grant execute on function public.create_recurring_payable_expense_compact(uuid, jsonb)
  to authenticated;
