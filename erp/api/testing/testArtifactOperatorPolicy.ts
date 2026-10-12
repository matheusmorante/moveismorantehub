type TestArtifactOperatorEnvironment = {
  MORANTE_ENV_SOURCE?: string;
  NFE_HML_TEST_OPERATOR_EMAIL?: string;
  NFE_ENVIRONMENT?: string;
  NFE_PRODUCTION_ENABLED?: string;
};

export function isTestArtifactOperatorRuntimeEnabled(
  environment: TestArtifactOperatorEnvironment,
): boolean {
  return environment.MORANTE_ENV_SOURCE === 'vercel-development'
    && environment.NFE_ENVIRONMENT === '2'
    && environment.NFE_PRODUCTION_ENABLED === 'false';
}

export function getConfiguredTestArtifactOperatorEmail(
  environment: TestArtifactOperatorEnvironment,
): string {
  if (environment.MORANTE_ENV_SOURCE !== 'vercel-development') return '';
  const configuredEmail = environment.NFE_HML_TEST_OPERATOR_EMAIL;
  return typeof configuredEmail === 'string' ? configuredEmail.trim().toLowerCase() : '';
}

export function isConfiguredTestArtifactOperator(input: {
  configuredEmail: unknown;
  authenticatedEmail: unknown;
  isAdministrator: boolean;
}): boolean {
  const configuredEmail = typeof input.configuredEmail === 'string'
    ? input.configuredEmail.trim().toLowerCase() : '';
  const authenticatedEmail = typeof input.authenticatedEmail === 'string'
    ? input.authenticatedEmail.trim().toLowerCase() : '';
  return Boolean(
    input.isAdministrator
    && configuredEmail
    && authenticatedEmail
    && configuredEmail === authenticatedEmail,
  );
}
