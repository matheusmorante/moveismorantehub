/**
 * Ponto de entrada modular para o subsistema de Especificações Técnicas e Características.
 *
 * Arquitetura em camadas e princípios aplicados:
 * - SRP (Single Responsibility): Cada módulo lida com uma responsabilidade coesa (tipos, constantes, predicados, ordenação/agrupamento, validação, sobreposições, nomenclatura e seleção).
 * - OCP (Open/Closed): Regras de ordenação, tópicos e predicados podem ser estendidos sem afetar a lógica de resolução.
 * - Coesão alta e acoplamento fraco: Funções puras e sem efeitos colaterais.
 */

export * from './types';
export * from './constants';
export * from './predicates';
export * from './grouping';
export * from './validation';
export * from './overrides';
export * from './naming';
export * from './selection';
