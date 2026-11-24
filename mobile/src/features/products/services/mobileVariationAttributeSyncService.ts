import { toTitleCase } from '../../../../../shared-utils/productText';
import {
  VariationFamilyUnconfirmedError,
  variationFamilyAttributeSchema,
} from '../../../../../shared-utils/variationFamilyFormSchemas';
import { withTimeout } from '../../../../../shared-utils/withTimeout';
import { supabase } from '../../../services/supabaseClient';
import type { MobileVariationAttribute } from '../domain/variationActionsDomain';
import {
  ensureQueryIsCurrent,
  lookupMobileVariationFamilyAttributes,
  VARIATION_FAMILY_QUERY_TIMEOUT_MS,
  type MobileVariationFamilyAttributeLookup,
} from './mobileVariationFamilyQueryService';

const escapeRegexLiteral = (text: string): string =>
  `^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;

async function waitForAttributeStep<T>(
  query: PromiseLike<T>,
  stillCurrent: () => boolean,
  write = false
): Promise<T> {
  ensureQueryIsCurrent(stillCurrent);
  let result: T | null;
  try {
    result = await withTimeout(query, VARIATION_FAMILY_QUERY_TIMEOUT_MS, null, 'mover-variacao:atributo');
  } catch (error) {
    if (write) {
      throw new VariationFamilyUnconfirmedError(
        'O cadastro da característica pode ter sido gravado. Consulte as características antes de repetir.'
      );
    }
    throw error;
  }
  if (result === null) {
    if (write) {
      throw new VariationFamilyUnconfirmedError(
        'O cadastro da característica não foi confirmado. Consulte as características antes de repetir.'
      );
    }
    throw new Error('A consulta de características excedeu o prazo.');
  }
  if (!stillCurrent()) {
    if (write) {
      throw new VariationFamilyUnconfirmedError(
        'O cadastro da característica pode ter sido gravado. Consulte as características antes de repetir.'
      );
    }
    ensureQueryIsCurrent(stillCurrent);
  }
  return result;
}

function throwAttributeWriteError(
  error: { code?: string; message?: string; status?: number } | null | undefined
): void {
  if (!error) return;
  if (!error.code || error.status === 0 || (error.status ?? 0) >= 500) {
    throw new VariationFamilyUnconfirmedError(
      'O cadastro da característica pode ter sido gravado. Consulte as características antes de repetir.'
    );
  }
  throw new Error(
    error.message || 'Não foi possível cadastrar a característica. Confira os dados e as permissões.'
  );
}

async function ensureSingleAttributeAndValue(
  normalizedName: string,
  normalizedValue: string,
  stillCurrent: () => boolean,
  precomputedLookup?: MobileVariationFamilyAttributeLookup
): Promise<MobileVariationAttribute> {
  let attribute =
    precomputedLookup?.attributeId && precomputedLookup.name
      ? { id: precomputedLookup.attributeId, name: precomputedLookup.name }
      : null;

  if (!attribute && !precomputedLookup) {
    const attributeResult = await waitForAttributeStep(
      supabase
        .from('attributes')
        .select('id, name')
        .filter('name', 'imatch', escapeRegexLiteral(normalizedName))
        .limit(1),
      stillCurrent
    );
    if (attributeResult.error) throw attributeResult.error;
    if (!Array.isArray(attributeResult.data)) {
      throw new Error('Não foi possível confirmar a consulta da característica.');
    }
    attribute = attributeResult.data[0] ?? null;
  }

  if (!attribute) {
    const response = await waitForAttributeStep(
      supabase.from('attributes').insert({ name: normalizedName, active: true }).select('id, name').single(),
      stillCurrent,
      true
    );
    throwAttributeWriteError(response.error);
    if (!response.data) {
      throw new VariationFamilyUnconfirmedError(
        'O cadastro da característica não foi confirmado. Consulte as características antes de repetir.'
      );
    }
    attribute = response.data;
  }

  if (
    !attribute?.id ||
    typeof attribute.name !== 'string' ||
    attribute.name.trim().toLocaleLowerCase('pt-BR') !== normalizedName.toLocaleLowerCase('pt-BR')
  ) {
    throw new VariationFamilyUnconfirmedError(
      'O cadastro da característica não foi confirmado. Consulte as características antes de repetir.'
    );
  }

  let canonicalValue =
    precomputedLookup?.attributeId === attribute.id && typeof precomputedLookup.value === 'string'
      ? precomputedLookup.value
      : undefined;

  if (typeof canonicalValue !== 'string') {
    const valueResult = await waitForAttributeStep(
      supabase
        .from('attribute_values')
        .select('value')
        .eq('attribute_id', attribute.id)
        .filter('value', 'imatch', escapeRegexLiteral(normalizedValue))
        .limit(1),
      stillCurrent
    );
    if (valueResult.error) throw valueResult.error;
    if (!Array.isArray(valueResult.data)) {
      throw new Error('Não foi possível confirmar a consulta do valor da característica.');
    }
    canonicalValue = valueResult.data[0]?.value;
  }

  if (typeof canonicalValue !== 'string') {
    const response = await waitForAttributeStep(
      supabase
        .from('attribute_values')
        .insert({ attribute_id: attribute.id, value: normalizedValue })
        .select('value')
        .single(),
      stillCurrent,
      true
    );
    throwAttributeWriteError(response.error);
    canonicalValue = response.data?.value;
  }

  if (
    typeof canonicalValue !== 'string' ||
    canonicalValue.trim().toLocaleLowerCase('pt-BR') !== normalizedValue.toLocaleLowerCase('pt-BR')
  ) {
    throw new VariationFamilyUnconfirmedError(
      'O valor da característica não foi confirmado. Consulte as características antes de repetir.'
    );
  }

  return variationFamilyAttributeSchema.parse({ name: attribute.name, value: canonicalValue });
}

export const ensureMobileAttributeValues = async (
  attributes: readonly { name: string; value: string }[],
  stillCurrent: () => boolean = () => true
): Promise<MobileVariationAttribute[]> => {
  const normalizedAttributes = attributes.map((attribute) => {
    const input = variationFamilyAttributeSchema.parse(attribute);
    return { name: toTitleCase(input.name), value: toTitleCase(input.value) };
  });
  if (normalizedAttributes.length === 0) return [];

  const lookups = await lookupMobileVariationFamilyAttributes(normalizedAttributes, stillCurrent);
  const canonicalAttributes: MobileVariationAttribute[] = [];
  for (let index = 0; index < normalizedAttributes.length; index += 1) {
    ensureQueryIsCurrent(stillCurrent);
    const { name, value } = normalizedAttributes[index];
    canonicalAttributes.push(
      await ensureSingleAttributeAndValue(name, value, stillCurrent, lookups[index])
    );
  }
  return canonicalAttributes;
};

export const ensureMobileAttributeValue = async (
  name: string,
  value: string,
  stillCurrent: () => boolean = () => true
): Promise<MobileVariationAttribute> => {
  const input = variationFamilyAttributeSchema.parse({ name, value });
  return ensureSingleAttributeAndValue(
    toTitleCase(input.name),
    toTitleCase(input.value),
    stillCurrent
  );
};
