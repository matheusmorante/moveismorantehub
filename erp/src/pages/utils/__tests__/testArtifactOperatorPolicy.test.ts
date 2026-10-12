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
  it('requires the official Vercel Development launcher without fiscal environment flags', () => {
    expect(isTestArtifactOperatorRuntimeEnabled({
      MORANTE_ENV_SOURCE: 'vercel-development',
      VERCEL_ENV: 'development',
    })).toBe(true);
    expect(isTestArtifactOperatorRuntimeEnabled({
      MORANTE_ENV_SOURCE: 'other',
      VERCEL_ENV: 'development',
    })).toBe(false);
    expect(isTestArtifactOperatorRuntimeEnabled({
      MORANTE_ENV_SOURCE: 'vercel-development',
      VERCEL_ENV: 'production',
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

  it('uses only the canonical Vercel Development operator secret and fails closed elsewhere', () => {
    expect(getConfiguredTestArtifactOperatorEmail({
      MORANTE_ENV_SOURCE: 'vercel-development',
      VERCEL_ENV: 'development',
      NFE_HML_TEST_OPERATOR_EMAIL: ' Operator@Example.Invalid ',
    })).toBe('operator@example.invalid');
    expect(getConfiguredTestArtifactOperatorEmail({
      MORANTE_ENV_SOURCE: 'vercel-development',
      VERCEL_ENV: 'development',
    })).toBe('');
    expect(getConfiguredTestArtifactOperatorEmail({
      MORANTE_ENV_SOURCE: 'production',
      VERCEL_ENV: 'production',
      NFE_HML_TEST_OPERATOR_EMAIL: ' Operator@Example.Invalid ',
    })).toBe('');
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
