/** Kits montáveis = menor estoque inteiro possível entre os componentes. */
export const calculateCompositionAvailability = (
  components: { currentStock: number; quantityNeeded: number }[]
): number => {
  if (!components || components.length === 0) return 0;

  let minAvailability = Infinity;
  for (const component of components) {
    if (component.quantityNeeded <= 0) continue;

    const itemAvailability = Math.floor(
      Math.max(0, component.currentStock) / component.quantityNeeded
    );
    if (itemAvailability < minAvailability) minAvailability = itemAvailability;
  }

  return minAvailability === Infinity ? 0 : Math.max(0, minAvailability);
};
