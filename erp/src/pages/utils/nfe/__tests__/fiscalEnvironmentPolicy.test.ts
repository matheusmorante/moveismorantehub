import { describe, expect, it } from 'vitest';
import {
  getNfeAuthorizationEndpoint,
  getNfeServiceEndpoint,
} from '../../../../../../api/nfe/fiscalEnvironmentPolicy';

describe('fiscal environment policy', () => {
  it.each([
    ['55', 1, 'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4'],
    ['65', 1, 'https://nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4'],
    ['55', 2, 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4'],
    ['65', 2, 'https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4'],
  ] as const)('resolves model %s in environment %s', (model, environment, expected) => {
    expect(getNfeAuthorizationEndpoint(model, environment)).toBe(expected);
  });

  it('rejects unsupported models and environments instead of falling back', () => {
    expect(() => getNfeAuthorizationEndpoint('66', 1)).toThrow('Unsupported NF-e model.');
    expect(() => getNfeAuthorizationEndpoint('65', 3)).toThrow('Unsupported fiscal environment.');
  });

  it('uses the same environment policy for consultation and event services', () => {
    expect(getNfeServiceEndpoint('65', 1, 'NFeConsultaProtocolo4')).toBe(
      'https://nfce.sefa.pr.gov.br/nfce/NFeConsultaProtocolo4'
    );
    expect(getNfeServiceEndpoint('55', 2, 'NFeRecepcaoEvento4')).toBe(
      'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4'
    );
    expect(() => getNfeServiceEndpoint('55', 2, 'NFeConsultaCadastro4')).toThrow(
      'Unsupported SEFA/PR fiscal service.'
    );
  });
});
