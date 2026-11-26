import { assertTestArtifactLinks, readTestArtifactIdentity, testArtifactMetadata,
  normalizeTestArtifactScenarioKey, normalizeTestRunId, type TestArtifactIdentity } from './testArtifactPolicy';

/** Contains only artifact IDs. Credentials and authentication state never go here. */
export const TEST_ARTIFACT_CONTEXT_KEY = 'morante:test-artifact-context';

export function testArtifactIdentityForAuthenticatedUser(input: {
  isDevelopment: boolean;
  runId: unknown;
  scenarioKey?: unknown;
  ownerId: unknown;
  isAdministrator: boolean;
  configuredOperatorAuthorized: boolean;
}): TestArtifactIdentity | null {
  const runId = normalizeTestRunId(input.runId);
  const rawScenarioKey = input.scenarioKey;
  const scenarioKey = rawScenarioKey === undefined || rawScenarioKey === null || rawScenarioKey === ''
    ? null : normalizeTestArtifactScenarioKey(rawScenarioKey);
  const ownerId = normalizeTestRunId(input.ownerId);
  if (
    !input.isDevelopment || !input.isAdministrator ||
    !input.configuredOperatorAuthorized || !runId || !ownerId ||
    (rawScenarioKey !== undefined && rawScenarioKey !== null && rawScenarioKey !== '' && !scenarioKey)
  ) return null;
  return { runId, ownerId, ...(scenarioKey ? { scenarioKey } : {}) };
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
  sessionStorage.setItem(TEST_ARTIFACT_CONTEXT_KEY, JSON.stringify({
    runId: metadata.runId,
    ownerId: metadata.ownerId,
    ...(metadata.scenarioKey ? { scenarioKey: metadata.scenarioKey } : {}),
  }));
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

/** The form owns the current choice; saving must not restore a removed marker. */
export function setTestArtifactMode<T extends object>(
  value: T, jsonField: string, enabled: boolean, identity = getTestArtifactContext(),
): T {
  if (enabled) {
    if (!identity) throw new Error('O modo de teste exige operador autorizado nesta execução.');
    return stampTestArtifact(value, jsonField, identity);
  }
  const row = value as Record<string, unknown>;
  const original = row[jsonField];
  if (!original || typeof original !== 'object' || Array.isArray(original)) return value;
  const data = { ...original } as Record<string, unknown>;
  delete data.testArtifact;
  return { ...value, [jsonField]: data };
}

export function assertOwnedByTestContext(value: unknown): void {
  const identity = getTestArtifactContext();
  if (!identity) return;
  assertTestArtifactLinks({ is_test: true, ...identity }, [value], identity.ownerId);
}
