import { z } from 'zod';
import { bulkAttributeFormSchema } from './catalogFormSchemas';
import { withTimeout } from './withTimeout';

type AttributeLookupResponse = { data: unknown; error: unknown } | null;

const attributeValueSchema = z.object({
  id: z.string().trim().min(1),
  attribute_id: z.string().trim().min(1),
  value: z.string(),
});

const unconfirmed = () => Object.assign(
  new Error('Não foi possível confirmar o cadastro do valor. Consulte a característica antes de repetir.'),
  { uncertain: true }
);

/** Shared contract for registering a value on an existing attribute. */
export async function saveAttributeValueWithClient(
  client: any,
  attributeId: string,
  value: string
): Promise<z.output<typeof attributeValueSchema>> {
  const values = bulkAttributeFormSchema.parse({ name: attributeId, value });
  const lookup = await withTimeout<AttributeLookupResponse>(
    client
      .from('attribute_values')
      .select('id, attribute_id, value')
      .eq('attribute_id', values.name)
      .ilike('value', values.value)
      .maybeSingle(),
    15_000,
    null,
    'produtos:consultar-valor-atributo'
  );
  if (!lookup) throw new Error('A consulta do valor demorou demais. Tente novamente.');
  if (lookup.error) throw lookup.error;
  if (lookup.data) return attributeValueSchema.parse(lookup.data);

  const insert = await withTimeout<AttributeLookupResponse>(
    client
      .from('attribute_values')
      .insert({ attribute_id: values.name, value: values.value })
      .select('id, attribute_id, value')
      .single(),
    15_000,
    null,
    'produtos:cadastrar-valor-atributo'
  );
  if (!insert) throw unconfirmed();
  if (insert.error) throw insert.error;
  try {
    return attributeValueSchema.parse(insert.data);
  } catch {
    throw unconfirmed();
  }
}
