export async function verifyConfiguredTestArtifactOperator(
  accessToken: unknown,
): Promise<boolean> {
  if (typeof accessToken !== 'string' || !accessToken.trim()) return false;
  try {
    const response = await fetch('/api/testing/test-artifact-operator', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
