/** Production transmission stays disabled unless explicitly enabled on the server. */
export function isNfeProductionEnabled(
  value: string | undefined,
  runtimeEnvironment = process.env.VERCEL_ENV
): boolean {
  if (
    process.env.MORANTE_ENV_SOURCE === 'vercel-development' ||
    runtimeEnvironment === 'development' ||
    runtimeEnvironment === 'preview'
  )
    return false;
  return value?.trim().toLowerCase() === 'true';
}
