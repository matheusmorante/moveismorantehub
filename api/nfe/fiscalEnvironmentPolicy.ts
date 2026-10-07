export type FiscalEnvironment = 1 | 2;
export type NfeModel = '55' | '65';
export type NfeServiceName = 'NFeAutorizacao4' | 'NFeConsultaProtocolo4' | 'NFeRecepcaoEvento4';

/** Resolves a SEFA/PR service from model and tpAmb without environment fallbacks. */
export function getNfeServiceEndpoint(model: string, environment: number, service: string): string {
  if (model !== '55' && model !== '65') throw new Error('Unsupported NF-e model.');
  if (environment !== 1 && environment !== 2) throw new Error('Unsupported fiscal environment.');
  if (
    service !== 'NFeAutorizacao4' &&
    service !== 'NFeConsultaProtocolo4' &&
    service !== 'NFeRecepcaoEvento4'
  )
    throw new Error('Unsupported SEFA/PR fiscal service.');
  const prefix = model === '65' ? 'nfce' : 'nfe';
  const host = environment === 2 ? `homologacao.${prefix}` : prefix;
  return `https://${host}.sefa.pr.gov.br/${prefix}/${service}`;
}

export const getNfeAuthorizationEndpoint = (model: string, environment: number) =>
  getNfeServiceEndpoint(model, environment, 'NFeAutorizacao4');
