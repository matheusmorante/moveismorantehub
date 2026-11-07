import type { FiscalIssueResult } from './fiscalIssueResultDetails';

export function getFiscalIssueCode(result: FiscalIssueResult): string {
  return result.technicalDetails?.apiCode || result.apiCode || result.code || '';
}

export function getFiscalTransportCode(result: FiscalIssueResult): string {
  return result.technicalDetails?.transportCode || result.transportDiagnostic?.code || '';
}

export function getFiscalCStat(result: FiscalIssueResult): string {
  const candidate = result.cStat || result.technicalDetails?.sefazCode || '';
  if (candidate) return candidate;
  const match = (result.sefazMessage || result.xMotivo || '').match(/^\s*(\d{3})\s*[:–-]/);
  return match?.[1] || '';
}
