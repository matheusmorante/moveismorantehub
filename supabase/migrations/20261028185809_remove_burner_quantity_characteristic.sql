-- Remove the unused characteristic definition; product values are not rewritten.
do $migration$
declare
  v_attribute_id uuid;
  v_match_count integer;
  v_dependent_count integer;
  v_alternative_reference_count integer;
  v_application_count integer;
  v_deleted_count integer;
begin
  select count(*) into v_match_count
  from public.attributes
  where name = 'Quantidade de bocas';

  if v_match_count <> 1 then
    raise exception 'Expected one Quantidade de bocas characteristic; found %', v_match_count;
  end if;

  select id into v_attribute_id
  from public.attributes
  where name = 'Quantidade de bocas';

  select count(*) into v_dependent_count
  from public.attributes
  where dependency_attribute_id = v_attribute_id;

  select count(*) into v_alternative_reference_count
  from public.attribute_dependency_alternatives
  where attribute_id = v_attribute_id
     or reference_attribute_id = v_attribute_id;

  select count(*) into v_application_count
  from public.attribute_category_applications
  where attribute_id = v_attribute_id;

  if v_dependent_count <> 0 or v_alternative_reference_count <> 0
    or v_application_count <> 38 then
    raise exception 'Quantidade de bocas has unexpected dependent rules or category configuration';
  end if;

  delete from public.attributes
  where id = v_attribute_id;

  get diagnostics v_deleted_count = row_count;
  if v_deleted_count <> 1 then
    raise exception 'Expected to remove one characteristic; removed %', v_deleted_count;
  end if;

  if exists (select 1 from public.attributes where id = v_attribute_id)
    or exists (select 1 from public.attribute_values where attribute_id = v_attribute_id)
    or exists (select 1 from public.attribute_category_applications where attribute_id = v_attribute_id)
    or exists (select 1 from public.category_attributes where attribute_id = v_attribute_id) then
    raise exception 'Quantidade de bocas definition or linked configuration remains';
  end if;
end;
$migration$;
