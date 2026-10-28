-- Rename the Boolean characteristic labels without changing their IDs, category
-- applications, dependencies, or option rows. Values keyed by the old labels are
-- re-keyed recursively while their stored values remain untouched.
create temporary table _boolean_characteristic_rename_bootstrap (placeholder boolean);
drop table _boolean_characteristic_rename_bootstrap;

create or replace function pg_temp.rename_characteristic_json_keys(
  p_value jsonb,
  p_name_map jsonb
)
returns jsonb
language plpgsql
immutable
as $function$
declare
  v_entry record;
  v_key text;
  v_result jsonb;
begin
  if p_value is null then
    return null;
  end if;

  if jsonb_typeof(p_value) = 'object' then
    v_result := '{}'::jsonb;
    for v_entry in select key, value from jsonb_each(p_value)
    loop
      v_key := coalesce(p_name_map ->> v_entry.key, v_entry.key);
      if v_result ? v_key then
        raise exception 'Renaming Boolean characteristic key would overwrite existing key "%"', v_key;
      end if;
      v_result := v_result || jsonb_build_object(
        v_key,
        pg_temp.rename_characteristic_json_keys(v_entry.value, p_name_map)
      );
    end loop;
    return v_result;
  end if;

  if jsonb_typeof(p_value) = 'array' then
    select coalesce(
      jsonb_agg(pg_temp.rename_characteristic_json_keys(value, p_name_map) order by ordinality),
      '[]'::jsonb
    )
    into v_result
    from jsonb_array_elements(p_value) with ordinality;
    return v_result;
  end if;

  return p_value;
end;
$function$;

do $migration$
declare
  v_name_map jsonb := jsonb_build_object(
    '100% MDF?', 'É 100% MDF?',
    'Acompanha colchão', 'Acompanha colchão?',
    'Acompanha pia / cuba', 'Acompanha pia / cuba?',
    'Acompanha sifão', 'Acompanha sifão?',
    'Acompanha tampo', 'Acompanha tampo?',
    'Acompanha válvula', 'Acompanha válvula?',
    'Berço 3 em 1', 'É um berço 3 em 1?',
    'Cadeira estofada', 'A cadeira é estofada?',
    'Calceiro', 'Possui calceiro?',
    'Canto arredondado', 'Possui canto arredondado?',
    'Concretada?', 'É concretada?',
    'Divisão ele e ela', 'Possui divisão ele e ela?',
    'Dupla face', 'É dupla face?',
    'É reclinável?', 'É reclinável?',
    'É retrátil?', 'É retrátil?',
    'Entrada USB', 'Possui USB?',
    'Estrado regulável', 'O estrado é regulável?',
    'Grades fixas', 'As grades são fixas?',
    'Maleiro', 'Possui maleiro?',
    'Passa fios', 'Possui passa-fios?',
    'Pés reguláveis', 'Os pés são reguláveis?',
    'Possui baú integrado?', 'Possui baú integrado?',
    'Possui cuba de inox?', 'Possui cuba de inox?',
    'Possui espelho', 'Possui espelho?',
    'Possui gavetas', 'Possui gavetas?',
    'Possui LED', 'Possui LED?',
    'Possui pés', 'Possui pés?',
    'Possui portas', 'Possui portas?',
    'Possui válvula?', 'Possui válvula?',
    'Rodízios', 'Possui rodízios?',
    'Slow motion / Fechamento suave', 'Possui fechamento suave (slow motion)?',
    'Superfície de vidro', 'Possui superfície de vidro?',
    'Vira mini cama', 'Transforma-se em mini cama?'
  );
  v_mapping_count integer;
  v_boolean_count integer;
  v_matched_count integer;
begin
  select count(*) into v_mapping_count from jsonb_each_text(v_name_map);
  select count(*) into v_boolean_count from public.attributes where data_type = 'boolean';
  select count(*) into v_matched_count
  from jsonb_each_text(v_name_map) mapping
  join public.attributes attribute
    on attribute.name = mapping.key
   and attribute.data_type = 'boolean';

  if v_boolean_count <> v_mapping_count or v_matched_count <> v_mapping_count then
    raise exception 'Expected % Boolean characteristics; found % Boolean rows and % matching names',
      v_mapping_count, v_boolean_count, v_matched_count;
  end if;

  if exists (
    select 1
    from jsonb_each_text(v_name_map) mapping
    join public.attributes source_attribute
      on source_attribute.name = mapping.key
     and source_attribute.data_type = 'boolean'
    join public.attributes target_attribute
      on target_attribute.name = mapping.value
     and target_attribute.id <> source_attribute.id
  ) then
    raise exception 'A target Boolean characteristic name already belongs to another characteristic';
  end if;

  update public.products product
  set technical_specs = pg_temp.rename_characteristic_json_keys(product.technical_specs, v_name_map)
  where product.technical_specs is not null
    and product.technical_specs is distinct from
      pg_temp.rename_characteristic_json_keys(product.technical_specs, v_name_map);

  update public.product_variations variation
  set attributes = pg_temp.rename_characteristic_json_keys(variation.attributes, v_name_map)
  where variation.attributes is not null
    and variation.attributes is distinct from
      pg_temp.rename_characteristic_json_keys(variation.attributes, v_name_map);

  update public.composition_variations variation
  set attributes = pg_temp.rename_characteristic_json_keys(variation.attributes, v_name_map)
  where variation.attributes is not null
    and variation.attributes is distinct from
      pg_temp.rename_characteristic_json_keys(variation.attributes, v_name_map);

  update public.attributes attribute
  set name = mapping.value
  from jsonb_each_text(v_name_map) mapping
  where attribute.name = mapping.key
    and attribute.data_type = 'boolean'
    and mapping.key <> mapping.value;
end;
$migration$;

drop function pg_temp.rename_characteristic_json_keys(jsonb, jsonb);
