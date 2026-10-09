export const TEST_ARTIFACT_EXCLUDED_DESTINATIONS = [
  'reports', 'agenda', 'schedule', 'assemblies', 'dashboard', 'notifications',
] as const;

export type TestArtifactIdentity = { runId: string; ownerId: string };
type RecordValue = Record<string, unknown>;

const record = (value: unknown): RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue : {};

/** UUID is the identity; TEST_AUT_ is accepted only for historical compatibility. */
export function normalizeTestRunId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const uuid = value.replace(/^TEST_AUT_/i, '').toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid)
    ? uuid : null;
}

function artifactData(value: unknown): RecordValue {
  const row = record(value);
  const data = record(row.order_data ?? row.orderData ?? value);
  let metadata = data.testArtifact
    ?? record(data.technical_specs ?? data.technicalSpecs).testArtifact
    ?? record(data.full_address ?? data.fullAddress).testArtifact
    ?? record(data.address).testArtifact
    ?? record(data.attributes).testArtifact;
  if (metadata === undefined) {
    for (const note of [data.notes, data.observation]) {
      if (typeof note !== 'string') continue;
      try { metadata = record(JSON.parse(note)).testArtifact; } catch { /* Ordinary text. */ }
      if (metadata !== undefined) break;
    }
  }
  return metadata === undefined ? data : record(metadata);
}

/** Read-side classification accepts historical flags; it never authorizes a write. */
export function isIdentifiedTestArtifact(value: unknown): boolean {
  const data = artifactData(value);
  const row = record(value);
  const root = record(row.order_data ?? row.orderData ?? value);
  if (root.is_test === true || root.is_test === 'true' || root.isTest === true || root.isTest === 'true') return true;
  return data.is_test === true || data.is_test === 'true'
    || data.isTest === true || data.isTest === 'true';
}

export function readTestArtifactIdentity(value: unknown): TestArtifactIdentity | null {
  const data = artifactData(value);
  if (data.is_test !== true) return null;
  const runId = normalizeTestRunId(data.runId ?? data.testRunId ?? data.test_run_id);
  const owner = data.ownerId ?? data.testOwnerId;
  const ownerId = typeof owner === 'string' && !/^TEST_AUT_/i.test(owner) ? normalizeTestRunId(owner) : null;
  return runId && ownerId ? { runId, ownerId } : null;
}

export function isTestArtifactVisibleAt(value: unknown, destination: string): boolean {
  return !isIdentifiedTestArtifact(value)
    || !(TEST_ARTIFACT_EXCLUDED_DESTINATIONS as readonly string[]).includes(destination);
}

/** Runs before a write in the harness/API; the database enforces the same links. */
export function assertTestArtifactLinks(
  source: unknown, artifacts: readonly unknown[], authenticatedUserId: string,
): TestArtifactIdentity | null {
  if (!isIdentifiedTestArtifact(source)) {
    if (artifacts.some(isIdentifiedTestArtifact))
      throw new Error('Uma operação operacional não pode utilizar artefatos de teste.');
    return null;
  }
  const identity = readTestArtifactIdentity(source);
  if (!identity || identity.ownerId !== authenticatedUserId.toLowerCase())
    throw new Error('Artefato de teste exige execução e operador autenticado correspondentes.');
  for (const artifact of artifacts) {
    const linked = readTestArtifactIdentity(artifact);
    if (!linked || linked.runId !== identity.runId || linked.ownerId !== identity.ownerId)
      throw new Error('Todos os artefatos devem pertencer à mesma execução e operador.');
  }
  return identity;
}

export function testArtifactMetadata(identity: TestArtifactIdentity): RecordValue {
  if (
    !normalizeTestRunId(identity.runId) ||
    /^TEST_AUT_/i.test(identity.ownerId) ||
    !normalizeTestRunId(identity.ownerId)
  )
    throw new Error('Identificador de execução ou operador inválido.');
  return { is_test: true, runId: identity.runId, ownerId: identity.ownerId };
}
