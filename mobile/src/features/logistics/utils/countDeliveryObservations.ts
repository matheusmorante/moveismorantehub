const countObservationEntries = (value: unknown): number => {
  if (Array.isArray(value)) {
    return value.reduce((total, entry) => total + countObservationEntries(entry), 0);
  }

  if (typeof value !== 'string') return 0;

  const separator = value.includes('\n') ? /\r?\n/ : ';';
  return value.split(separator).filter((entry) => entry.trim().length > 0).length;
};

/**
 * Conta os avisos operacionais do pedido. Pedidos antigos usam ponto e vírgula;
 * os novos usam uma observação por linha.
 */
export const countDeliveryObservations = (values: readonly unknown[]): number =>
  values.reduce<number>((total, value) => total + countObservationEntries(value), 0);
