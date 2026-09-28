/** Production transmission stays disabled unless explicitly enabled on the server. */
export function isNfeProductionEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}
