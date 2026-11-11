import type { AddressFreightEvaluation } from './types.js';

/**
 * Esta camada não consulta um serviço de geocodificação/rotas. CEP e bairro
 * não determinam a distância real do endereço até a loja, então o cálculo e a
 * promessa de frete devem ser confirmados por uma pessoa da equipe.
 */
export function evaluateAddressFreight(enderecoOuCep: string): AddressFreightEvaluation {
  const raw = String(enderecoOuCep || '').trim();
  if (!raw || raw.length < 3) {
    return { localizado: false, distanciaKm: 0, freteGratis: false };
  }

  return {
    localizado: false,
    distanciaKm: 0,
    freteGratis: false,
    enderecoNormalizado: raw,
  };
}
