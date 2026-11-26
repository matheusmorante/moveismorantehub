import { ecommerceSupabase as supabase } from '@/pages/utils/supabaseConfig';
import { toTitleCase } from '../textUtils';
import {
  variationFamilyAttributeSchema,
  VariationFamilyUnconfirmedError,
} from '../../../../../shared-utils/variationFamilyFormSchemas';
import { withTimeout } from '../../../../../shared-utils/core/withTimeout';
import { saveAttributeValueWithClient } from '../../../../../shared-utils/productAttributeValueService';
import { invalidateVariationsQueries } from './variationPersistenceService';

interface VariationFamilyAttributeLookup {
  index: number;
  attributeId: string | null;
  name: string | null;
  value: string | null;
}

interface RpcResponse<T> {
  data: T | null;
  error: unknown;
}

interface AttributeWriteResponse<T> {
  data: T | null;
  error: { code?: string } | null;
  status?: number;
}

const escapeRegexLiteral = (text: string): string =>
  `^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;

const waitForAttributeOperation = async <T>(
  promise: PromiseLike<T>,
  stillCurrent: () => boolean,
  write = false,
): Promise<T> => {
  if (!stillCurrent()) throw new Error('A mudança de família perdeu o contexto.');
  const result = await withTimeout(promise, 10000, null, 'mover-variacao:atributo');
  if (!result) {
    throw write
      ? new VariationFamilyUnconfirmedError(
          'O cadastro da característica não foi confirmado. Consulte as características antes de repetir.',
        )
      : new Error('A consulta da característica excedeu o prazo.');
  }
  if (!stillCurrent()) throw new Error('A mudança de família perdeu o contexto.');
  return result;
};

const insertAttributeRecord = async (
  normalizedName: string,
  stillCurrent: () => boolean,
): Promise<{ id: string; name: string }> => {
  let response: AttributeWriteResponse<{ id: string; name: string }>;
  try {
    response = await waitForAttributeOperation(
      supabase
        .from('attributes')
        .insert({ name: normalizedName, active: true })
        .select('id,name')
        .single() as unknown as PromiseLike<AttributeWriteResponse<{ id: string; name: string }>>,
      stillCurrent,
      true,
    );
  } catch (error) {
    throw error instanceof VariationFamilyUnconfirmedError
      ? error
      : new VariationFamilyUnconfirmedError();
  }
  if (response.error) {
    if (!response.error.code || response.status === 0 || (response.status ?? 0) >= 500) {
      throw new VariationFamilyUnconfirmedError();
    }
    throw response.error;
  }
  const attribute = response.data;
  if (
    !attribute?.id ||
    typeof attribute.name !== 'string' ||
    attribute.name.trim().toLocaleLowerCase('pt-BR') !== normalizedName.toLocaleLowerCase('pt-BR')
  ) {
    throw new VariationFamilyUnconfirmedError(
      'O cadastro da característica não foi confirmado. Consulte as características antes de repetir.',
    );
  }
  return attribute;
};

const insertAttributeValueRecord = async (
  attributeId: string,
  normalizedValue: string,
  stillCurrent: () => boolean,
): Promise<string> => {
  let response: AttributeWriteResponse<{ value: string }>;
  try {
    response = await waitForAttributeOperation(
      supabase
        .from('attribute_values')
        .insert({ attribute_id: attributeId, value: normalizedValue })
        .select('value')
        .single() as unknown as PromiseLike<AttributeWriteResponse<{ value: string }>>,
      stillCurrent,
      true,
    );
  } catch (error) {
    throw error instanceof VariationFamilyUnconfirmedError
      ? error
      : new VariationFamilyUnconfirmedError();
  }
  if (response.error) {
    if (!response.error.code || response.status === 0 || (response.status ?? 0) >= 500) {
      throw new VariationFamilyUnconfirmedError();
    }
    throw response.error;
  }
  const storedValue = response.data?.value;
  if (
    typeof storedValue !== 'string' ||
    storedValue.trim().toLocaleLowerCase('pt-BR') !== normalizedValue.toLocaleLowerCase('pt-BR')
  ) {
    throw new VariationFamilyUnconfirmedError(
      'O valor da característica não foi confirmado. Consulte as características antes de repetir.',
    );
  }
  return storedValue;
};

const validateConfirmedAttribute = (
  attribute: { id: string; name: string } | null,
  normalizedName: string,
): { id: string; name: string } | null => {
  if (!attribute) return null;
  if (
    !attribute.id ||
    typeof attribute.name !== 'string' ||
    attribute.name.trim().toLocaleLowerCase('pt-BR') !== normalizedName.toLocaleLowerCase('pt-BR')
  ) {
    throw new VariationFamilyUnconfirmedError(
      'O cadastro da característica não foi confirmado. Consulte as características antes de repetir.',
    );
  }
  return attribute;
};

const lookupVariationFamilyAttributes = async (
  attributes: readonly { name: string; value: string }[],
  stillCurrent: () => boolean,
): Promise<VariationFamilyAttributeLookup[]> => {
  if (!stillCurrent()) throw new Error('A mudança de família perdeu o contexto.');
  const rpcClient = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<RpcResponse<unknown[]>>;
  };
  const response = await withTimeout(
    rpcClient.rpc('lookup_variation_family_attributes', { p_attributes: attributes }),
    10000,
    null,
    'mover-variacao:atributos',
  );
  if (!response) throw new Error('A consulta de características excedeu o prazo.');
  if (!stillCurrent()) throw new Error('A mudança de família perdeu o contexto.');
  if (response.error) throw response.error;
  if (!Array.isArray(response.data) || response.data.length !== attributes.length) {
    throw new Error('Não foi possível confirmar a consulta das características.');
  }
  return response.data.map((rawEntry, index) => {
    const entry = rawEntry as Partial<VariationFamilyAttributeLookup> | null;
    if (
      !entry ||
      entry.index !== index ||
      (entry.attributeId !== null && typeof entry.attributeId !== 'string') ||
      (entry.name !== null && typeof entry.name !== 'string') ||
      (entry.value !== null && typeof entry.value !== 'string') ||
      ((entry.attributeId === null) !== (entry.name === null)) ||
      (entry.attributeId === null && entry.value !== null)
    ) {
      throw new Error('Não foi possível confirmar a consulta das características.');
    }
    return entry as VariationFamilyAttributeLookup;
  });
};

/** Confirma todos os nomes e valores em uma leitura; gravações continuam sequenciais. */
export const ensureAttributeValues = async (
  attributes: readonly { name: string; value: string }[],
  stillCurrent: () => boolean = () => true,
): Promise<Array<{ name: string; value: string }>> => {
  const normalizedAttributes = attributes.map((attribute) => {
    const input = variationFamilyAttributeSchema.parse(attribute);
    return { name: toTitleCase(input.name), value: toTitleCase(input.value) };
  });
  if (normalizedAttributes.length === 0) return [];

  const lookups = await lookupVariationFamilyAttributes(normalizedAttributes, stillCurrent);
  const canonicalAttributes: Array<{ name: string; value: string }> = [];

  for (let index = 0; index < normalizedAttributes.length; index += 1) {
    if (!stillCurrent()) throw new Error('A mudança de família perdeu o contexto.');
    const { name: normalizedName, value: normalizedValue } = normalizedAttributes[index];
    const lookup = lookups[index];
    const attribute =
      validateConfirmedAttribute(
        lookup.attributeId && lookup.name ? { id: lookup.attributeId, name: lookup.name } : null,
        normalizedName,
      ) ?? (await insertAttributeRecord(normalizedName, stillCurrent));

    let storedValue =
      lookup.attributeId === attribute.id && typeof lookup.value === 'string'
        ? lookup.value
        : undefined;
    if (typeof storedValue !== 'string') {
      const { data: values, error: valueError } = await waitForAttributeOperation(
        supabase
          .from('attribute_values')
          .select('value')
          .eq('attribute_id', attribute.id)
          .filter('value', 'imatch', escapeRegexLiteral(normalizedValue))
          .limit(1),
        stillCurrent,
      );
      if (valueError) throw valueError;
      if (!Array.isArray(values)) {
        throw new Error('Não foi possível confirmar a consulta do valor da característica.');
      }
      storedValue = typeof values[0]?.value === 'string' ? values[0].value : undefined;
    }
    if (typeof storedValue !== 'string') {
      storedValue = await insertAttributeValueRecord(attribute.id, normalizedValue, stillCurrent);
    } else if (
      storedValue.trim().toLocaleLowerCase('pt-BR') !== normalizedValue.toLocaleLowerCase('pt-BR')
    ) {
      throw new VariationFamilyUnconfirmedError(
        'O valor da característica não foi confirmado. Consulte as características antes de repetir.',
      );
    }

    invalidateVariationsQueries();
    canonicalAttributes.push(
      variationFamilyAttributeSchema.parse({ name: attribute.name, value: storedValue }),
    );
  }
  return canonicalAttributes;
};

/** Mantém o fluxo REST sequencial para consumidores de uma característica isolada. */
export const ensureAttributeValue = async (
  attributeName: string,
  value: string,
  stillCurrent: () => boolean = () => true,
): Promise<{ name: string; value: string }> => {
  const input = variationFamilyAttributeSchema.parse({ name: attributeName, value });
  const normalizedName = toTitleCase(input.name);
  const normalizedValue = toTitleCase(input.value);

  const { data: attributes, error: attributeError } = await waitForAttributeOperation(
    supabase
      .from('attributes')
      .select('id,name')
      .filter('name', 'imatch', escapeRegexLiteral(normalizedName))
      .limit(1),
    stillCurrent,
  );
  if (attributeError) throw attributeError;
  if (!Array.isArray(attributes)) {
    throw new Error('Não foi possível confirmar a consulta da característica.');
  }

  const attribute =
    validateConfirmedAttribute(
      (attributes[0] as { id: string; name: string } | undefined) ?? null,
      normalizedName,
    ) ?? (await insertAttributeRecord(normalizedName, stillCurrent));

  const { data: values, error: valueError } = await waitForAttributeOperation(
    supabase
      .from('attribute_values')
      .select('value')
      .eq('attribute_id', attribute.id)
      .filter('value', 'imatch', escapeRegexLiteral(normalizedValue))
      .limit(1),
    stillCurrent,
  );
  if (valueError) throw valueError;
  if (!Array.isArray(values)) {
    throw new Error('Não foi possível confirmar a consulta do valor da característica.');
  }

  const existingValue = typeof values[0]?.value === 'string' ? values[0].value : undefined;
  const storedValue =
    existingValue ?? (await insertAttributeValueRecord(attribute.id, normalizedValue, stillCurrent));
  if (
    storedValue.trim().toLocaleLowerCase('pt-BR') !== normalizedValue.toLocaleLowerCase('pt-BR')
  ) {
    throw new VariationFamilyUnconfirmedError(
      'O valor da característica não foi confirmado. Consulte as características antes de repetir.',
    );
  }
  invalidateVariationsQueries();
  return variationFamilyAttributeSchema.parse({ name: attribute.name, value: storedValue });
};

/** Salva um novo valor para uma característica existente, evitando duplicidades. */
export const saveAttributeValue = async (
  attributeId: string,
  value: string,
): Promise<{ id: string; attribute_id: string; value: string }> => {
  const saved = await saveAttributeValueWithClient(supabase, attributeId, value);
  invalidateVariationsQueries();
  return saved;
};
