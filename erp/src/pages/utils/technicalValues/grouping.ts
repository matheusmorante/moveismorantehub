/**
 * Ordenação canônica e agrupamento de características por tópicos de apresentação.
 */

import {
  CHARACTERISTIC_TOPICS,
  CHARACTERISTIC_GROUP_ORDER,
  REQUIRED_CHARACTERISTICS_TOPIC,
  DIMENSIONS_SORT_ORDER,
  DOORS_SORT_ORDER,
  DRAWERS_SORT_ORDER,
  SHELVES_SORT_ORDER,
  FEET_SORT_ORDER,
  ACCESSORIES_SORT_ORDER,
} from './constants';
import {
  normalizeCharacteristicName,
  isPrimaryCharacteristicName,
  isChairWeightCapacityCharacteristic,
  isShelfWeightCapacityCharacteristic,
} from './predicates';
import type { CharacteristicGroup } from './types';

export const getDimensionSortRank = (name: string): number => {
  const norm = normalizeCharacteristicName(name);
  return DIMENSIONS_SORT_ORDER[norm] ?? 99;
};

const getCanonicalGroupRank = (title: string): number =>
  CHARACTERISTIC_GROUP_ORDER.indexOf(
    title as (typeof CHARACTERISTIC_GROUP_ORDER)[number]
  );

/** Organiza características por tópicos de apresentação, sem alterar valores ou identificadores persistidos. */
export const groupCharacteristicsByTopic = <
  T extends { name: string; groupName?: string; isCustom?: boolean; isRequired?: boolean },
>(
  fields: readonly T[]
): CharacteristicGroup<T>[] => {
  const groups = new Map<string, T[]>();
  const requiredCharacteristicFields: T[] = [];
  const otherFields: T[] = [];
  const isStructuralWeightCapacity = (name: string) =>
    isChairWeightCapacityCharacteristic(name) ||
    /\bpeso\b(?!.*\b(?:prateleira|gaveta)\b).*\bsuportad[oa]\b/i.test(name);

  fields.forEach((field) => {
    const persistedGroupName = field.groupName?.trim();
    if (persistedGroupName) {
      const groupedFields = groups.get(persistedGroupName) || [];
      groupedFields.push(field);
      groups.set(persistedGroupName, groupedFields);
      return;
    }

    if (
      field.isCustom &&
      !isStructuralWeightCapacity(field.name) &&
      !isShelfWeightCapacityCharacteristic(field.name)
    ) {
      otherFields.push(field);
      return;
    }

    const topic = isShelfWeightCapacityCharacteristic(field.name)
      ? CHARACTERISTIC_TOPICS.find((candidate) => candidate.title === 'Prateleiras')
      : CHARACTERISTIC_TOPICS.find((candidate) => candidate.matches.test(field.name));
    if (topic) {
      const groupedFields = groups.get(topic.title) || [];
      groupedFields.push(field);
      groups.set(topic.title, groupedFields);
      return;
    }

    if (field.isRequired === true || isPrimaryCharacteristicName(field.name)) {
      requiredCharacteristicFields.push(field);
      return;
    }

    otherFields.push(field);
  });

  return [
    ...(requiredCharacteristicFields.length > 0
      ? [{ title: REQUIRED_CHARACTERISTICS_TOPIC, fields: requiredCharacteristicFields }]
      : []),
    ...Array.from(groups.entries())
      .sort(([left], [right]) => {
        const leftCanonicalRank = getCanonicalGroupRank(left);
        const rightCanonicalRank = getCanonicalGroupRank(right);
        if (leftCanonicalRank >= 0 || rightCanonicalRank >= 0) {
          if (leftCanonicalRank < 0) return 1;
          if (rightCanonicalRank < 0) return -1;
          return leftCanonicalRank - rightCanonicalRank;
        }
        const leftLegacyRank = CHARACTERISTIC_TOPICS.findIndex((topic) => topic.title === left);
        const rightLegacyRank = CHARACTERISTIC_TOPICS.findIndex((topic) => topic.title === right);
        if (leftLegacyRank >= 0 || rightLegacyRank >= 0) {
          if (leftLegacyRank < 0) return 1;
          if (rightLegacyRank < 0) return -1;
          return leftLegacyRank - rightLegacyRank;
        }
        return left.localeCompare(right, 'pt-BR');
      })
      .flatMap(([title, groupedFields]) => {
      if (!groupedFields.length) return [];

      if (title === 'Dimensões' || title === 'Dimensões e Peso') {
        groupedFields.sort((a, b) => getDimensionSortRank(a.name) - getDimensionSortRank(b.name));
      } else if (title === 'Portas' || title === 'Portas, gavetas e ferragens') {
        groupedFields.sort((a, b) => {
          const rankA = DOORS_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = DOORS_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      } else if (title === 'Gavetas') {
        groupedFields.sort((a, b) => {
          const rankA = DRAWERS_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = DRAWERS_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      } else if (title === 'Prateleiras' || title === 'Compartimentos e organização') {
        groupedFields.sort((a, b) => {
          const rankA = SHELVES_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = SHELVES_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      } else if (title === 'Pés' || title === 'Pés e mobilidade') {
        groupedFields.sort((a, b) => {
          const rankA = FEET_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = FEET_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      } else if (title === 'Acessórios') {
        groupedFields.sort((a, b) => {
          const rankA = ACCESSORIES_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = ACCESSORIES_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      }

      return [{ title, fields: groupedFields }];
    }),
    ...(otherFields.length > 0 ? [{ title: 'Outras características', fields: otherFields }] : []),
  ];
};

/** Mescla grupos com o mesmo título, preservando a ordenação canônica interna */
export const mergeCharacteristicGroups = <T extends { name: string }>(
  groups: CharacteristicGroup<T>[]
): CharacteristicGroup<T>[] => {
  const mergedMap = new Map<string, CharacteristicGroup<T>>();
  for (const group of groups) {
    const existing = mergedMap.get(group.title);
    if (!existing) {
      mergedMap.set(group.title, { title: group.title, fields: [...group.fields] });
    } else {
      const existingNames = new Set(existing.fields.map((f) => f.name.toLowerCase().trim()));
      for (const field of group.fields) {
        if (!existingNames.has(field.name.toLowerCase().trim())) {
          existing.fields.push(field);
          existingNames.add(field.name.toLowerCase().trim());
        }
      }
    }
  }

  const result = Array.from(mergedMap.values());
  for (const group of result) {
    if (group.title === 'Portas') {
      group.fields.sort((a, b) => {
        const rankA = DOORS_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
        const rankB = DOORS_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    } else if (group.title === 'Gavetas') {
      group.fields.sort((a, b) => {
        const rankA = DRAWERS_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
        const rankB = DRAWERS_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    }
  }

  return result;
};

/** Agrupa as características para manter a mesma organização no pai e nas variações. */
export const groupTechnicalFields = <T extends { name: string; groupName?: string; isCustom?: boolean }>(
  fields: readonly T[]
): CharacteristicGroup<T>[] => groupCharacteristicsByTopic(fields);

