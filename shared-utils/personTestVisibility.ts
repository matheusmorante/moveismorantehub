import { isIdentifiedTestArtifact } from './testArtifactPolicy';
import { isTestOperator } from './testOperatorVisibility';

/** Mantém pessoas de teste fora dos diretórios operacionais de pessoas. */
export const isTestPerson = (person: any): boolean => {
  if (!person) return false;
  if (isTestOperator(person)) return false;
  if (isIdentifiedTestArtifact(person)) return true;
  const name = person.fullName || person.tradeName || person.name || '';
  if (/\[?\s*HML\s*NF\s*TEST\b/i.test(name)) return true;
  if (/^\s*(?:TEST_AUT_|playwright\.test)/i.test(name)) return true;
  if (/^\s*TEST_AUT_/i.test(String(person.id || ''))) return true;
  return false;
};
