import {
  isChairWeightCapacityCharacteristic,
  isShelfWeightCapacityCharacteristic,
} from '../../../../../shared-utils/productTechnicalFieldRules';
import { sortProductCharacteristicGroups } from '../../../../../shared-utils/productCharacteristicGroupOrder';
import { normalizeName } from './productCharacteristicAttributes';
import {
  CHARACTERISTIC_TOPICS,
  DIMENSIONS_SORT_ORDER,
  DOORS_SORT_ORDER,
  DRAWERS_SORT_ORDER,
  FEET_SORT_ORDER,
  SHELVES_SORT_ORDER,
  ACCESSORIES_SORT_ORDER,
  type ProductTechnicalField,
  type ProductTechnicalFieldGroup,
} from './productCharacteristicDefinitions';

export const getDimensionSortRank = (name: string): number => {
  const norm = normalizeName(name);
  return DIMENSIONS_SORT_ORDER[norm] ?? 99;
};

/** Agrupa os campos como no ERP e mantém a ordem canônica das dimensões. */
export const groupProductTechnicalFields = <T extends ProductTechnicalField>(
  fields: readonly T[]
): ProductTechnicalFieldGroup<T>[] => {
  const groups = new Map<string, T[]>();
  const persistedGroups = new Map<string, { title: string; fields: T[] }>();
  const otherFields: T[] = [];
  const isStructuralWeightCapacity = (name: string) =>
    isChairWeightCapacityCharacteristic(name);

  fields.forEach((field) => {
    const persistedGroupName = String(field.groupName ?? '').trim();
    if (persistedGroupName) {
      const key = field.groupId || normalizeName(persistedGroupName);
      const existingGroup = persistedGroups.get(key);
      if (existingGroup) existingGroup.fields.push(field);
      else persistedGroups.set(key, { title: persistedGroupName, fields: [field] });
      return;
    }
    if (
      (field.isCustom === true || field.is_custom === true) &&
      !isStructuralWeightCapacity(field.name) &&
      !isShelfWeightCapacityCharacteristic(field.name)
    ) {
      otherFields.push(field);
      return;
    }
    const topic = isShelfWeightCapacityCharacteristic(field.name)
      ? CHARACTERISTIC_TOPICS.find((candidate) => candidate.title === 'Prateleiras')
      : CHARACTERISTIC_TOPICS.find((candidate) => candidate.matches.test(field.name));
    if (!topic) {
      otherFields.push(field);
      return;
    }
    groups.set(topic.title, [...(groups.get(topic.title) || []), field]);
  });

  const legacyGroups = [
    ...CHARACTERISTIC_TOPICS.flatMap(({ title }) => {
      const groupedFields = groups.get(title);
      if (!groupedFields?.length) return [];
      if (title === 'Medidas e peso' || title === 'Dimensões e peso') {
        groupedFields.sort((left, right) => getDimensionSortRank(left.name) - getDimensionSortRank(right.name));
      } else if (title === 'Portas') {
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
      } else if (title === 'Prateleiras') {
        groupedFields.sort((a, b) => {
          const rankA = SHELVES_SORT_ORDER[a.name.trim().toLowerCase()] ?? 99;
          const rankB = SHELVES_SORT_ORDER[b.name.trim().toLowerCase()] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
      } else if (title === 'Pés') {
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
    ...(otherFields.length ? [{ title: 'Outras características', fields: otherFields }] : []),
  ];
  const orderedPersistedGroups = sortProductCharacteristicGroups(
    [...persistedGroups.entries()].map(([id, group]) => ({ id, name: group.title, ...group })),
  ).map(({ title, fields: groupedFields }) => ({ title, fields: groupedFields }));

  return [...legacyGroups, ...orderedPersistedGroups];
};
