/**
 * whatsappAiAgentService.ts
 *
 * Fachada pública e ponto de entrada para o Agente de IA Comercial do WhatsApp (Lizandro).
 * Modularizado seguindo princípios de arquitetura limpa e separação de responsabilidades (SRP):
 * - `./whatsappAiAgent/whatsappAiAgentTypes.ts`: Tipagens e contratos de execução
 * - `./whatsappAiAgent/whatsappAiAgentSecurity.ts`: Deduplicação de requisições e validação de números autorizados
 * - `./whatsappAiAgent/whatsappAiAgentHistory.ts`: Formatação do histórico da conversa para OpenAI
 * - `./whatsappAiAgent/whatsappAiAgentTools.ts`: Declarações e execução segura das 6 ferramentas comerciais
 * - `./whatsappAiAgent/whatsappAiAgentOrchestrator.ts`: Orquestração de turnos, Function Calling e integração com Meta API
 */

export * from './whatsappAiAgent/index.js';
