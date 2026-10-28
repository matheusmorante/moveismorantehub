/**
 * Facade de sincronização e preenchimento de especificações técnicas do produto.
 *
 * Módulos organizados em `./sync/`:
 * - `variationSync.ts`: Sincronização entre produto pai e suas variações filhas.
 * - `dependentCleanup.ts`: Limpeza atômica de características dependentes quando o mestre é desativado.
 * - `valueChange.ts`: Aplicação de alterações de valor e sincronização de dimensões.
 * - `initialPopulation.ts`: População inicial de medidas e compatibilização de cadastros legados.
 */

export * from './sync';
