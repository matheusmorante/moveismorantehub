/**
 * whatsappAiAgentTools.ts
 *
 * Fachada pública e registro de ferramentas seguras do Agente de IA Comercial (Móveis Morante).
 * Modularizado segundo os princípios de Single Responsibility (SRP), Open/Closed (OCP) e DRY:
 * - `./tools/types.js`: Tipagens e contratos de ferramentas e avaliação de frete
 * - `./tools/declarations.js`: Declarações de ferramentas para OpenAI
 * - `./tools/freightEvaluator.js`: Cálculo determinístico de distância e frete grátis (< 5 km)
 * - `./tools/handoffService.js`: Serviço compartilhado de escalonamento humano e notas internas
 * - `./tools/catalogTools.js`: Busca e detalhes de produtos e categorias
 * - `./tools/commercialTools.js`: Informações comerciais oficiais da loja
 * - `./tools/orderTools.js`: Consulta segura de pedidos do cliente
 * - `./tools/freightTools.js`: Ferramenta de frete com escalonamento silencioso
 * - `./tools/handoffTool.js`: Ferramenta de encaminhamento para atendimento humano
 * - `./tools/toolRegistry.js`: Registro Strategy Pattern e despachante executeSafeTool
 */

export * from './tools/index.js';
