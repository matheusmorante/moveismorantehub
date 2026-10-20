/**
 * MoranteHub Commercial Scheduling Rules & Resolution Engine
 *
 * Princípios aplicados:
 * - Single Responsibility: Módulos especializados divididos por responsabilidade em ./commercialScheduling
 * - Timezone Utils: Lógica de fuso horário oficial (America/Sao_Paulo) e turnos comerciais
 * - Formatting & Normalization: Normalizadores de datas (ISO / BR) e horários
 * - Validation Rules: Validação de schemas e invariantes contra duplicatas e rascunhos
 * - Resolution Engine: Motor determinístico de resolução efetiva e reposicionamento automático
 */

export * from './commercialScheduling';
