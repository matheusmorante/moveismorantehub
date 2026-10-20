/**
 * Testes unitários para o subsistema de Especificações Técnicas e Características.
 *
 * Suítes modulares organizadas em `./technicalValues/`:
 * - `overrides.test.ts`: Valores efetivos, detecção de overrides e nomenclatura de variações.
 * - `grouping.test.ts`: Agrupamento em tópicos canônicos e ordenação interna.
 * - `validation.test.ts`: Identificação e validação de características e dimensões obrigatórias.
 * - `selection.test.ts`: Aplicabilidade de campos por categoria e resolução de exclusividades.
 * - `furniture.test.ts`: Regras de portas, gavetas, pés e opções Sim/Não.
 * - `sink.test.ts`: Regras da categoria Pias, materiais, concretada, válvulas e cuba de inox.
 */

import './technicalValues/overrides.test';
import './technicalValues/grouping.test';
import './technicalValues/validation.test';
import './technicalValues/selection.test';
import './technicalValues/furniture.test';
import './technicalValues/sink.test';
