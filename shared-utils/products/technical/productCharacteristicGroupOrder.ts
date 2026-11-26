export const CHARACTERISTIC_GROUP_ORDER = [
  'Identificação e aparência',
  'Dimensões',
  'Materiais e estrutura',
  'Portas, gavetas e ferragens',
  'Compartimentos e organização',
  'Pés e mobilidade',
  'Assentos e estofamento',
  'Colchões e descanso',
  'Berços e camas',
  'Cozinha, pias e hidráulica',
  'Espelhos, tampos e vidro',
  'Elétrica, iluminação e TV',
  'Peso e capacidade',
] as const;

/** Sorts persisted characteristic groups with the canonical ERP order. */
export function sortProductCharacteristicGroups<T extends { name: string }>(
  groups: readonly T[],
): T[] {
  const canonicalOrder = new Map<string, number>(
    CHARACTERISTIC_GROUP_ORDER.map((name, index) => [name, index] as const),
  );

  return [...groups].sort((left, right) => {
    const leftRank = canonicalOrder.get(left.name);
    const rightRank = canonicalOrder.get(right.name);
    if (leftRank !== undefined || rightRank !== undefined) {
      if (leftRank === undefined) return 1;
      if (rightRank === undefined) return -1;
      return leftRank - rightRank;
    }
    return left.name.localeCompare(right.name, 'pt-BR');
  });
}
