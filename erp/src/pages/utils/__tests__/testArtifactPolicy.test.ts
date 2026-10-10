import { describe, expect, it } from 'vitest';
import {
  assertTestArtifactLinks, isIdentifiedTestArtifact, isTestArtifactVisibleAt,
  normalizeTestRunId, readTestArtifactIdentity, TEST_ARTIFACT_EXCLUDED_DESTINATIONS,
} from '../../../../../shared-utils/testArtifactPolicy';
import { testArtifactIdentityForAuthenticatedUser } from '../../../../../shared-utils/testArtifactContext';

const runId = '550e8400-e29b-41d4-a716-446655440000';
const ownerId = '550e8400-e29b-41d4-a716-446655440001';
const metadata = { is_test: true, runId, ownerId };
const order = { order_data: { is_test: true, testRunId: runId, testOwnerId: ownerId } };

describe('identificação dos artefatos no schema existente', () => {
  it.each(TEST_ARTIFACT_EXCLUDED_DESTINATIONS)('exclui teste de %s', destination => {
    expect(isTestArtifactVisibleAt(order, destination)).toBe(false);
    expect(isTestArtifactVisibleAt({ order_data: {} }, destination)).toBe(true);
  });
  it.each(['movements', 'map', 'sales', 'fiscal'])('preserva acesso em %s', destination => {
    expect(isTestArtifactVisibleAt(order, destination)).toBe(true);
  });
  it.each([
    { technical_specs: { testArtifact: metadata } },
    { technicalSpecs: { testArtifact: metadata } },
    { full_address: { testArtifact: metadata } },
    { fullAddress: { testArtifact: metadata } },
    { address: { testArtifact: metadata } },
    { attributes: { testArtifact: metadata } },
    { notes: JSON.stringify({ testArtifact: metadata, text: 'Teste financeiro' }) },
  ])('reconhece metadata no JSON existente: %j', artifact => {
    expect(readTestArtifactIdentity(artifact)).toEqual({ runId, ownerId });
    expect(assertTestArtifactLinks(order, [artifact], ownerId)).toEqual({ runId, ownerId });
  });
  it('aceita o identificador histórico sem torná-lo obrigatório', () => {
    expect(normalizeTestRunId(`TEST_AUT_${runId}`)).toBe(runId);
    expect(normalizeTestRunId(runId)).toBe(runId);
    expect(normalizeTestRunId('TEST_AUT_nome')).toBeNull();
  });
  it('não autoriza apenas por nome, número ou prefixo', () => {
    expect(isIdentifiedTestArtifact({ name: `TEST_AUT_${runId}`, orderIndex: 800001 })).toBe(false);
    expect(readTestArtifactIdentity({ is_test: true })).toBeNull();
    expect(() => assertTestArtifactLinks({ is_test: true }, [], ownerId)).toThrow('operador');
  });
  it('vincula somente a conta administradora autenticada e um runId UUID de desenvolvimento', () => {
    const input = {
      isDevelopment: true,
      runId,
      ownerId,
      email: ' MATHEUSMORANTE002@GMAIL.COM ',
      isAdministrator: true,
    };
    expect(testArtifactIdentityForAuthenticatedUser(input)).toEqual({ runId, ownerId });
    expect(testArtifactIdentityForAuthenticatedUser({ ...input, isDevelopment: false })).toBeNull();
    expect(testArtifactIdentityForAuthenticatedUser({ ...input, isAdministrator: false })).toBeNull();
    expect(testArtifactIdentityForAuthenticatedUser({ ...input, email: 'other@example.com' })).toBeNull();
    expect(testArtifactIdentityForAuthenticatedUser({ ...input, runId: 'TEST_AUT_anything' })).toBeNull();
  });
  it('recusa vínculo com produto operacional, outra execução ou outro operador', () => {
    for (const artifact of [{}, { ...metadata, runId: ownerId }, { ...metadata, ownerId: runId }])
      expect(() => assertTestArtifactLinks(order, [artifact], ownerId)).toThrow('mesma execução');
    expect(() => assertTestArtifactLinks(order, [metadata], runId)).toThrow('operador');
    expect(() => assertTestArtifactLinks({}, [metadata], ownerId)).toThrow('operacional');
  });
  it('preserva a classificação histórica sem aceitar string como autorização', () => {
    expect(isIdentifiedTestArtifact({ is_test: 'true' })).toBe(true);
    expect(readTestArtifactIdentity({ ...metadata, is_test: 'true' })).toBeNull();
    expect(readTestArtifactIdentity({ ...metadata, ownerId: `TEST_AUT_${ownerId}` })).toBeNull();
    expect(isIdentifiedTestArtifact({ is_test: true, testArtifact: {} })).toBe(true);
  });
});
