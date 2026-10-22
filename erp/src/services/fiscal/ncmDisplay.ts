export function formatNcmSubtitle(
  officialDescription?: string | null,
  internalDescription?: string | null
): string {
  const official = (officialDescription || '').trim().replace(/^(?:[-–—]\s*)+/, '');
  const internal = (internalDescription || '').trim();
  if (!official) return internal;
  return internal ? `${official} — ${internal}` : official;
}
