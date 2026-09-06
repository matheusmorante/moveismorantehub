/**
 * postOfficialAssetConstants.ts — Constantes e regras canônicas de Assets Oficiais.
 *
 * REGRA:
 * - REFERENCE: serve apenas para ensinar estilo/direção visual.
 * - OFFICIAL_ASSET: arquivo gráfico pronto que DEVE ser utilizado como arquivo real,
 *   preservado fielmente, sem redesenho, recriação ou estilização pela IA.
 */

export const OFFICIAL_MORANTE_LOGO_URL = 'https://www.moveismorante.com.br/logo-morante.png';

export const OFFICIAL_QUEIMA_BADGE_URL =
  'https://hkoxhourxwlddgsfdgws.supabase.co/storage/v1/object/public/products/marketing/seals/9d8bedae-b366-4f8c-ac49-74b85b882bde-1787790409290.png';

export const OFFICIAL_ASSET_MASTER_RULE = `OFFICIAL_ASSET não é inspiração visual.
É um arquivo gráfico oficial que deve ser utilizado fielmente.
Não gere uma versão semelhante.
Não redesenhe.
Não recrie por aproximação.
Se a ferramenta de geração não conseguir incorporar o asset com fidelidade,
não substitua por uma versão inventada. É preferível deixar reservado o espaço do que inventar uma nova marca ou selo.`;

export const OFFICIAL_LOGO_STRICT_INSTRUCTIONS = `LOGO OFICIAL DA MÓVEIS MORANTE

Arquivo:
${OFFICIAL_MORANTE_LOGO_URL}

REGRA OBRIGATÓRIA:
Utilize o arquivo oficial fornecido.

NÃO:
- redesenhar;
- recriar;
- reinterpretar;
- trocar tipografia;
- alterar símbolo;
- alterar proporções;
- alterar cores;
- inventar slogan;
- gerar uma marca "parecida";
- substituir por uma versão estilizada.

O logo deve ser tratado como um asset gráfico pronto.
Se a IA/ferramenta utilizada não conseguir inserir o asset fielmente, é preferível deixar reservado o espaço do logo do que inventar uma nova marca.`;

export function buildOfficialBadgeStrictInstructions(badgeUrl: string, opportunityName = 'Oportunidade'): string {
  return `SELO OFICIAL (${opportunityName.toUpperCase()}):
${badgeUrl}

REGRA:
Utilizar o arquivo oficial fornecido sem recriação.

NÃO:
- refazer o texto;
- refazer as chamas;
- alterar cores;
- mudar tipografia;
- trocar formato;
- aproximar visualmente;
- gerar uma versão semelhante.

O selo é um asset gráfico pronto e só deve ser utilizado quando a oportunidade for aplicável.`;
}

/**
 * Normaliza qualquer URL de logo ou selo para garantir HTTPS público e absoluto,
 * convertendo referências legadas (/images/logo-morante.png, /assets/queima...)
 * para as URLs públicas ativas.
 */
export function normalizeOfficialAssetUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();

  // Caso específico do logo Morante
  if (trimmed.includes('logo-morante.png') || trimmed.endsWith('/logo.png')) {
    return OFFICIAL_MORANTE_LOGO_URL;
  }

  // Caso específico do selo Queima dos Salvados legado
  if (trimmed.includes('queima-salvados-original.png')) {
    return OFFICIAL_QUEIMA_BADGE_URL;
  }

  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('http://')) return trimmed.replace(/^http:\/\//, 'https://');
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `https://www.moveismorante.com.br${trimmed}`;

  return trimmed;
}
