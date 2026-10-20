/**
 * Facade de predicados de domínio e normalizadores de valores para Especificações Técnicas.
 *
 * Módulos organizados em `./predicates/`:
 * - `normalization.ts`: Normalização de strings e verificações gerais de nomes.
 * - `dimensions.ts`: Predicados de medidas (largura, altura, profundidade, peso, etc.).
 * - `yesNo.ts`: Identificação e normalização de características binárias Sim/Não.
 * - `furniture.ts`: Regras de portas, gavetas e pés (quantidades e switches).
 * - `categories.ts`: Regras específicas de categorias (Pias, Colchões).
 * - `dependencies.ts`: Motor de resolução de dependências e bloqueios condicionais.
 */

export * from './predicates/index';
