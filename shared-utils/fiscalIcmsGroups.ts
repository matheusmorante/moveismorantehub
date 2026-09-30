/** MOC Anexo I, grupo N10d: these CSOSNs share ICMSSN102 (orig + CSOSN).
 * Structural XML mapping only; this does not choose a default or approve an operation.
 */
export const ZERO_OWN_ICMS_CSOSNS: readonly string[] = ['102', '103', '300', '400'];
export const CSOSN_CODES = ['101', '102', '103', '201', '202', '203', '300', '400', '500', '900'] as const;
export function zeroOwnIcmsGroup(csosn: string): 'ICMSSN102' {
  if (!ZERO_OWN_ICMS_CSOSNS.includes(csosn))
    throw new Error(`CSOSN ${csosn || 'não informado'} exige determinação e grupo tributário específicos.`);
  return 'ICMSSN102';
}
