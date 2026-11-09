import { extractDigits } from '../../phoneUtils.js';
import type { AddressFreightEvaluation } from './types.js';

/**
 * Avalia o endereço ou CEP em relação à loja física da Móveis Morante:
 * R. Cascavel, 306 - Guaraituba, Colombo/PR (CEP 83410-270).
 * Frete 100% grátis se a distância for < 5 km.
 * Se maior, sugere passar endereço completo.
 * Se não for localizado ou for inconclusivo, retorna localizado: false.
 */
export function evaluateAddressFreight(enderecoOuCep: string): AddressFreightEvaluation {
  const raw = String(enderecoOuCep || '').trim();
  if (!raw || raw.length < 3) {
    return { localizado: false, distanciaKm: 0, freteGratis: false };
  }

  // 1. Verificação por CEP
  const cepDigits = extractDigits(raw);
  if (cepDigits.length === 8) {
    if (/^0{8}$|^9{8}$|^1{8}$/.test(cepDigits)) {
      return { localizado: false, distanciaKm: 0, freteGratis: false };
    }

    const prefix5 = cepDigits.slice(0, 5);
    const prefix3 = cepDigits.slice(0, 3);

    // CEPs de Colombo/PR (83400-000 a 83415-999)
    if (prefix3 === '834') {
      const numPrefix = Number(prefix5);
      if (numPrefix >= 83410 && numPrefix <= 83410) {
        return { localizado: true, distanciaKm: 0.8, freteGratis: true, enderecoNormalizado: `Guaraituba, Colombo/PR (CEP ${cepDigits})` };
      }
      if (numPrefix >= 83408 && numPrefix <= 83409) {
        return { localizado: true, distanciaKm: 2.2, freteGratis: true, enderecoNormalizado: `Maracanã, Colombo/PR (CEP ${cepDigits})` };
      }
      if (numPrefix === 83411 || numPrefix === 83412) {
        return { localizado: true, distanciaKm: 3.1, freteGratis: true, enderecoNormalizado: `Arruda, Colombo/PR (CEP ${cepDigits})` };
      }
      if (numPrefix === 83413 || numPrefix === 83414) {
        return { localizado: true, distanciaKm: 3.5, freteGratis: true, enderecoNormalizado: `Mauá, Colombo/PR (CEP ${cepDigits})` };
      }
      if (numPrefix >= 83403 && numPrefix <= 83405) {
        return { localizado: true, distanciaKm: 4.2, freteGratis: true, enderecoNormalizado: `Colombo/PR (CEP ${cepDigits})` };
      }
      return { localizado: true, distanciaKm: 6.8, freteGratis: false, enderecoNormalizado: `Colombo/PR (CEP ${cepDigits})` };
    }

    // Bairros limítrofes de Curitiba (Atuba, Santa Cândida) a menos de 5 km da loja
    if (['82600', '82630', '82590', '82620'].includes(prefix5)) {
      return { localizado: true, distanciaKm: 3.8, freteGratis: true, enderecoNormalizado: `Santa Cândida / Atuba, Curitiba/PR (CEP ${cepDigits})` };
    }

    // Demais CEPs de Curitiba (80000 a 82999)
    if (cepDigits.startsWith('80') || cepDigits.startsWith('81') || cepDigits.startsWith('82')) {
      return { localizado: true, distanciaKm: 14.2, freteGratis: false, enderecoNormalizado: `Curitiba/PR (CEP ${cepDigits})` };
    }

    // Região Metropolitana (Pinhais 833xx, São José dos Pinhais 830xx, Piraquara 833xx, etc.)
    if (['830', '832', '833', '835', '836', '837'].includes(prefix3)) {
      return { localizado: true, distanciaKm: 18.5, freteGratis: false, enderecoNormalizado: `Região Metropolitana (CEP ${cepDigits})` };
    }

    return { localizado: true, distanciaKm: 28.0, freteGratis: false, enderecoNormalizado: `CEP ${cepDigits}` };
  }

  // 2. Verificação por texto (Nome de bairro, rua, cidade)
  const norm = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const invalidPatterns = [
    /^rua\s*teste$/i,
    /^teste$/i,
    /^lugar nenhum$/i,
    /^nao sei$/i,
    /^aqui$/i,
    /^aqui perto$/i,
    /^\d+$/,
  ];
  if (invalidPatterns.some((p) => p.test(norm))) {
    return { localizado: false, distanciaKm: 0, freteGratis: false };
  }

  const closeNeighborhoods: Record<string, number> = {
    guaraituba: 0.8,
    cascavel: 0.3,
    maracana: 2.1,
    'alto maracana': 2.1,
    arruda: 3.2,
    monza: 3.3,
    maua: 3.4,
    'parque dos lagos': 3.6,
    'rio verde': 2.8,
    'campo pequeno': 3.7,
    paloma: 4.1,
    osasco: 4.4,
    'roca grande': 4.5,
    'sao gabriel': 4.3,
    'vila zumbi': 3.9,
    atuba: 3.6,
    'santa candida': 4.2,
  };

  for (const [bairro, dist] of Object.entries(closeNeighborhoods)) {
    if (norm.includes(bairro)) {
      return {
        localizado: true,
        distanciaKm: dist,
        freteGratis: dist < 5.0,
        enderecoNormalizado: `${raw} (~${dist} km da loja física)`,
      };
    }
  }

  const farLocations: Record<string, number> = {
    bacacheri: 7.2,
    'boa vista': 8.5,
    cabral: 9.8,
    juveve: 10.5,
    centro: 14.0,
    batel: 15.5,
    'agua verde': 16.0,
    portao: 18.5,
    cic: 22.0,
    'cidade industrial': 22.0,
    'sitio cercado': 24.0,
    boqueirao: 19.0,
    pinhais: 9.5,
    piraquara: 16.0,
    'sao jose dos pinhais': 21.0,
    'campo largo': 32.0,
    araucaria: 34.0,
    'fazenda rio grande': 35.0,
    'almirante tamandare': 13.0,
    taruma: 11.0,
    cajuru: 13.5,
    uberaba: 17.0,
    tingui: 6.8,
    pilarzinho: 12.0,
    'santa felicidade': 16.5,
  };

  for (const [loc, dist] of Object.entries(farLocations)) {
    if (norm.includes(loc)) {
      return {
        localizado: true,
        distanciaKm: dist,
        freteGratis: false,
        enderecoNormalizado: `${raw} (~${dist} km da loja física)`,
      };
    }
  }

  return { localizado: false, distanciaKm: 0, freteGratis: false };
}
