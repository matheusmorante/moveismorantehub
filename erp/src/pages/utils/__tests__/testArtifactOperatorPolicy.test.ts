import { describe, expect, it } from 'vitest';
import {
  getConfiguredTestArtifactOperatorEmail,
  isConfiguredTestArtifactOperator,
  isTestArtifactOperatorRuntimeEnabled,
} from '../../../../api/testing/testArtifactOperatorPolicy';
import { testArtifactIdentityForAuthenticatedUser } from '../../../../../shared-utils/testArtifactContext';

const runId = '550e8400-e29b-41d4-a716-446655440001';
const ownerId = '550e8400-e29b-41d4-a716-446655440002';

describe('test artifact operator authorization', () => {
  it('requires the official Vercel Development launcher, HML and production disabled', () => {
    expect(isTestArtifactOperatorRuntimeEnabled({
      MORANTE_ENV_SOURCE: 'vercel-development',
      NFE_ENVIRONMENT: '2',
      NFE_PRODUCTION_ENABLED: 'false',
    })).toBe(true);
    expect(isTestArtifactOperatorRuntimeEnabled({
      MORANTE_ENV_SOURCE: 'other',
      NFE_ENVIRONMENT: '2',
      NFE_PRODUCTION_ENABLED: 'false',
    })).toBe(false);
    expect(isTestArtifactOperatorRuntimeEnabled({
      NFE_ENVIRONMENT: '2',
      NFE_PRODUCTION_ENABLED: 'false',
    })).toBe(false);
  });

  it('matches the runtime configured identity without exposing it to the browser', () => {
    expect(isConfiguredTestArtifactOperator({
      configuredEmail: ' Operator@Example.Invalid ',
      authenticatedEmail: 'operator@example.invalid',
      isAdministrator: true,
    })).toBe(true);
    expect(isConfiguredTestArtifactOperator({
      configuredEmail: 'operator@example.invalid',
      authenticatedEmail: 'another@example.invalid',
      isAdministrator: true,
    })).toBe(false);
    expect(isConfiguredTestArtifactOperator({
      configuredEmail: 'operator@example.invalid',
      authenticatedEmail: 'operator@example.invalid',
      isAdministrator: false,
    })).toBe(false);
  });

  it('uses the explicit Vercel Development operator alias and fails closed if absent', () => {
    expect(getConfiguredTestArtifactOperatorEmail({
      MORANTE_ENV_SOURCE: 'vercel-development',
      MORANTE_HML_TEST_OPERATOR_EMAIL: ' Operator@Example.Invalid ',
      NFE_HML_TEST_OPERATOR_EMAIL: 'stale@example.invalid',
    })).toBe('operator@example.invalid');
    expect(getConfiguredTestArtifactOperatorEmail({
      MORANTE_ENV_SOURCE: 'vercel-development',
      NFE_HML_TEST_OPERATOR_EMAIL: 'stale@example.invalid',
    })).toBe('');
    expect(getConfiguredTestArtifactOperatorEmail({
      MORANTE_ENV_SOURCE: 'production',
      NFE_HML_TEST_OPERATOR_EMAIL: ' Operator@Example.Invalid ',
    })).toBe('operator@example.invalid');
  });

  it('binds fixture metadata only after the backend authorization succeeds', () => {
    const base = {
      isDevelopment: true,
      runId,
      ownerId,
      isAdministrator: true,
    };
    expect(testArtifactIdentityForAuthenticatedUser({
      ...base,
      configuredOperatorAuthorized: true,
    })).toEqual({ runId, ownerId });
    expect(testArtifactIdentityForAuthenticatedUser({
      ...base,
      configuredOperatorAuthorized: false,
    })).toBeNull();
  });
});
