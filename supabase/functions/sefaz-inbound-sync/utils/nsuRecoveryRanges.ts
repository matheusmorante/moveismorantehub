type MissingNsuRange = { startNsu: string; endNsu: string };

export function normalizeNsu(value: string): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits || digits.length > 15) return null;
  return digits.replace(/^0+(?=\d)/, "");
}

export function findMissingNsuRanges(
  requestedNsu: string,
  entries: Array<{ nsu: string }>,
  returnedUltNsu: string,
): MissingNsuRange[] {
  if (!entries.length) return [];

  const knownNsus = entries
    .map((entry) => normalizeNsu(entry.nsu))
    .filter((nsu): nsu is string => nsu !== null)
    .map((nsu) => BigInt(nsu))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (!knownNsus.length) return [];

  const ranges: MissingNsuRange[] = [];
  let previousNsu = BigInt(normalizeNsu(requestedNsu) || "0");
  let hasKnownPreviousNsu = previousNsu > 0n;
  for (const receivedNsu of knownNsus) {
    if (hasKnownPreviousNsu && receivedNsu > previousNsu + 1n) {
      ranges.push({
        startNsu: (previousNsu + 1n).toString(),
        endNsu: (receivedNsu - 1n).toString(),
      });
    }
    if (receivedNsu > previousNsu) previousNsu = receivedNsu;
    hasKnownPreviousNsu = true;
  }

  const returnedNsu = normalizeNsu(returnedUltNsu);
  if (returnedNsu) {
    const returnedNsuBigInt = BigInt(returnedNsu);
    if (returnedNsuBigInt > previousNsu) {
      ranges.push({
        startNsu: (previousNsu + 1n).toString(),
        endNsu: returnedNsuBigInt.toString(),
      });
    }
  }

  return ranges;
}
