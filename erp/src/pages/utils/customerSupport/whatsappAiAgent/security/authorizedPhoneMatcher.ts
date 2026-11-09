import { extractDigits, getPhoneLookupCandidates } from '../../phoneUtils.js';

/**
 * Validação rigorosa do número de teste: normaliza e compara candidatos do telefone
 * recebido contra a lista de números autorizados nas configurações.
 */
export function isPhoneNumberAuthorizedForTesting(
  rawPhone: string,
  rawContactPhoneE164: string,
  authorizedList?: string[]
): boolean {
  if (!Array.isArray(authorizedList) || authorizedList.length === 0) {
    return false;
  }

  const incomingDigits = extractDigits(rawPhone);
  const incomingE164Digits = extractDigits(rawContactPhoneE164);
  const incomingCandidates = new Set([
    incomingDigits,
    incomingE164Digits,
    ...getPhoneLookupCandidates(rawPhone),
    ...getPhoneLookupCandidates(rawContactPhoneE164),
  ]);

  for (const authorizedItem of authorizedList) {
    if (!authorizedItem || typeof authorizedItem !== 'string') continue;
    const authDigits = extractDigits(authorizedItem);
    if (!authDigits) continue;

    // Se bater dígitos diretos
    if (incomingDigits === authDigits || incomingE164Digits === authDigits) {
      return true;
    }

    // Se bater com qualquer candidato normalizado
    const authCandidates = getPhoneLookupCandidates(authorizedItem);
    authCandidates.push(authDigits);
    for (const cand of authCandidates) {
      const candDigits = extractDigits(cand);
      if (incomingCandidates.has(cand) || incomingCandidates.has(candDigits)) {
        return true;
      }
    }
  }

  return false;
}
