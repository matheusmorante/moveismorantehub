/**
 * Facade de Especificações Técnicas e Características de Produtos.
 *
 * Este arquivo foi refatorado aplicando os princípios de Clean Code, SOLID e Modularização de Arquivos:
 * - Single Responsibility Principle (SRP): Módulos separados para Tipos, Constantes, Predicados, Agrupamento, Validação, Overrides, Nomenclatura e Seleção.
 * - Backwards Compatibility: Mantém todas as exportações e contratos de tipos originais intactos.
 *
 * Módulos em `./technicalValues/`:
 * - `types.ts`: Definições de tipos, contratos e interfaces.
 * - `constants.ts`: Constantes de ordenação, tópicos e identificadores padrão.
 * - `predicates.ts`: Normalizadores de strings e funções de verificação (isHeight, isDefined, etc.).
 * - `grouping.ts`: Algoritmos de ordenação canônica e agrupamento de características em tópicos.
 * - `validation.ts`: Regras de campos obrigatórios e checagem de dimensões ausentes.
 * - `overrides.ts`: Resolução de valores efetivos, herança e overrides entre pai e variações.
 * - `naming.ts`: Formatação de valores e composição de títulos de variações.
 * - `selection.ts`: Lógica de aplicabilidade e seleção de campos no formulário.
 */

export * from './technicalValues';
