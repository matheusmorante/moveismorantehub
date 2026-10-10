import { assertTestArtifactLinks, readTestArtifactIdentity, testArtifactMetadata,
  normalizeTestRunId, type TestArtifactIdentity } from './testArtifactPolicy';

/** Contains only artifact IDs. Credentials and authentication state never go here. */
export const TEST_ARTIFACT_CONTEXT_KEY = 'morante:test-artifact-context';
export const TEST_ARTIFACT_OPERATOR_EMAIL = 'matheusmorante002@gmail.com';

export function testArtifactIdentityForAuthenticatedUser(input: {
  isDevelopment: boolean;
  runId: unknown;
  ownerId: unknown;
  email: unknown;
  isAdministrator: boolean;
}): TestArtifactIdentity | null {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const runId = normalizeTestRunId(input.runId);
  const ownerId = normalizeTestRunId(input.ownerId);
  if (
    !input.isDevelopment || !input.isAdministrator ||
    email !== TEST_ARTIFACT_OPERATOR_EMAIL || !runId || !ownerId
  ) return null;
  return { runId, ownerId };
}

export function getTestArtifactContext(): TestArtifactIdentity | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(TEST_ARTIFACT_CONTEXT_KEY);
    if (!stored) return null;
    return readTestArtifactIdentity({ is_test: true, ...JSON.parse(stored) });
  } catch { return null; }
}

export function bindTestArtifactContext(identity: TestArtifactIdentity): void {
  const metadata = testArtifactMetadata(identity);
  if (typeof sessionStorage === 'undefined') throw new Error('Contexto de teste exige uma sessão do navegador.');
  sessionStorage.setItem(TEST_ARTIFACT_CONTEXT_KEY, JSON.stringify({ runId: metadata.runId, ownerId: metadata.ownerId }));
}

export function clearTestArtifactContext(): void {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(TEST_ARTIFACT_CONTEXT_KEY);
}

export function stampTestArtifact<T extends object>(
  value: T, jsonField: string, identity = getTestArtifactContext(),
): T {
  if (!identity) return value;
  const row = value as Record<string, unknown>;
  const original = row[jsonField];
  const data = original && typeof original === 'object' && !Array.isArray(original)
    ? original as Record<string, unknown> : {};
  return { ...value, [jsonField]: { ...data, testArtifact: testArtifactMetadata(identity) } };
}

export function stampTestOrder<T extends object>(value: T, identity = getTestArtifactContext()): T {
  if (!identity) return value;
  return { ...value, is_test: true, testArtifact: testArtifactMetadata(identity) };
}

export function assertOwnedByTestContext(value: unknown): void {
  const identity = getTestArtifactContext();
  if (!identity) return;
  assertTestArtifactLinks({ is_test: true, ...identity }, [value], identity.ownerId);
}
