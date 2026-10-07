import { normalize } from './values';

const municipalitiesByUf = new Map<string, Promise<Array<{ id: number; nome: string }>>>();
export async function municipalityCode(
  city: string,
  uf = 'PR',
  existingCode?: string
): Promise<string> {
  if (existingCode && /^\d{7}$/.test(String(existingCode))) {
    return String(existingCode);
  }
  const normUf = uf.toUpperCase();
  let promise = municipalitiesByUf.get(normUf);
  if (!promise) {
    promise = fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normUf}/municipios`,
      { signal: AbortSignal.timeout(10000) }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`Consulta oficial IBGE indisponível para UF ${normUf}.`);
        const data = await response.json();
        if (
          !Array.isArray(data) ||
          data.some((item) => !Number.isInteger(item.id) || typeof item.nome !== 'string')
        )
          throw new Error('Resposta oficial IBGE inválida.');
        return data as Array<{ id: number; nome: string }>;
      })
      .catch((error) => {
        municipalitiesByUf.delete(normUf);
        throw error;
      });
    municipalitiesByUf.set(normUf, promise);
  }
  const list = await promise;
  const match = list.find((item) => normalize(item.nome) === normalize(city));
  if (!match)
    throw new Error(`Município do destinatário não encontrado na fonte oficial IBGE de ${normUf}.`);
  return String(match.id);
}
