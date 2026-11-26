const TEST_OPERATOR_NAMES = new Set([
  'teste alt nfe html operador',
  'test aut nfe hml operator',
]);

const normalizeName = (value: unknown): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizeEmail = (value: unknown): string => String(value || '').trim().toLowerCase();

export const isTestOperator = (person: any): boolean =>
  TEST_OPERATOR_NAMES.has(normalizeName(person?.fullName || person?.full_name || person?.name));

export const isTestOperatorVisibleToUser = (
  person: any,
  currentUserEmail?: string | null
): boolean => {
  if (!isTestOperator(person)) return true;

  const operatorEmail = normalizeEmail(person?.email);
  const userEmail = normalizeEmail(currentUserEmail);
  return Boolean(operatorEmail && userEmail && operatorEmail === userEmail);
};
