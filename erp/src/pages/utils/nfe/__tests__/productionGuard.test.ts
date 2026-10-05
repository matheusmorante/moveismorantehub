import { afterEach, expect, it, vi } from 'vitest';
import { isNfeProductionEnabled } from '../../../../../../api/nfe/productionGuard';
afterEach(() => vi.unstubAllEnvs());
it.each(['development', 'preview'])(
  'bloqueia produção no runtime %s mesmo com flag true',
  (runtime) => {
    expect(isNfeProductionEnabled('true', runtime)).toBe(false);
  }
);
it('bloqueia o launcher local mesmo sem VERCEL_ENV', () => {
  vi.stubEnv('MORANTE_ENV_SOURCE', 'vercel-development');
  expect(isNfeProductionEnabled('true', 'production')).toBe(false);
});
it.each([undefined, '', 'false', '1', 'yes'])('exige habilitação explícita (%s)', (value) => {
  expect(isNfeProductionEnabled(value, 'production')).toBe(false);
});
it('aceita a flag explícita somente em runtime elegível', () => {
  expect(isNfeProductionEnabled('true', 'production')).toBe(true);
});
