import { EvalResult, EvalMetrics } from './types';

/**
 * FORMATADOR PROFISSIONAL DE RELATÓRIO E DIAGNÓSTICO DO AGENTE IA
 */
export class ReportFormatter {
  public static formatDiagnostic(result: EvalResult): string {
    if (result.passed) return '';

    const lines: string[] = [];
    lines.push('======================================================================');
    lines.push(`❌ [FALHA DE REGRESSÃO] Caso: ${result.testId} (${result.category})`);
    lines.push(`DESCRIÇÃO: ${result.description}`);
    lines.push('----------------------------------------------------------------------');
    lines.push(`CASO (MENSAGEM DO USUÁRIO):`);
    lines.push(`  "${result.inputSummary}"`);
    lines.push('----------------------------------------------------------------------');
    lines.push('ESPERADO:');
    lines.push(`  Intent: ${result.expected.intent}`);
    if (result.expected.expectedTools) {
      lines.push(`  Tools Esperadas: [${result.expected.expectedTools.join(', ')}]`);
    }
    if (result.expected.prohibitedTools) {
      lines.push(`  Tools Proibidas: [${result.expected.prohibitedTools.join(', ')}]`);
    }
    if (result.expected.expectedArgs) {
      lines.push(`  Argumentos Esperados: ${JSON.stringify(result.expected.expectedArgs)}`);
    }
    if (result.expected.mustAskUser) {
      lines.push(`  Deve Perguntar ao Usuário: SIM (Termos: ${result.expected.questionKeywords?.join(', ') || 'qualquer'})`);
    }
    if (result.expected.prohibitedInferences) {
      lines.push(`  Inferências Proibidas (Alucinações): [${result.expected.prohibitedInferences.join(', ')}]`);
    }
    lines.push('----------------------------------------------------------------------');
    lines.push('RECEBIDO:');
    lines.push(`  Tools Chamadas: [${result.received.calledTools.join(', ') || 'nenhuma'}]`);
    if (result.received.toolArgs.length > 0) {
      lines.push(`  Argumentos Passados: ${JSON.stringify(result.received.toolArgs)}`);
    }
    lines.push(`  Perguntou ao Usuário: ${result.received.askedUser ? 'SIM' : 'NÃO'}`);
    lines.push(`  Resposta do Agente: "${result.received.agentAnswer}"`);
    lines.push('----------------------------------------------------------------------');
    lines.push('DIFERENÇA (DIAGNÓSTICO DA FALHA):');
    for (const div of result.divergences) {
      lines.push(`  • ${div}`);
    }
    lines.push('======================================================================');

    return lines.join('\n');
  }

  public static formatSummary(metrics: EvalMetrics): string {
    const lines: string[] = [];
    lines.push('\n======================================================================');
    lines.push('📊 RELATÓRIO CONSOLIDADO DE AVALIAÇÃO DO AGENTE IA (SEU LIZANDRO)');
    lines.push('======================================================================');
    lines.push(`Total de Casos Avaliados : ${metrics.total}`);
    lines.push(`Aprovados                : ${metrics.passed} ✅`);
    lines.push(`Reprovados               : ${metrics.failed} ${metrics.failed > 0 ? '❌' : ''}`);
    lines.push(`Taxa de Sucesso Geral    : ${metrics.successRate.toFixed(1)}%`);
    lines.push(`Alucinações Detectadas   : ${metrics.hallucinationsDetected}`);
    lines.push(`Violações de Ferramentas : ${metrics.prohibitedToolViolations}`);
    lines.push(`Tempo Total de Execução  : ${metrics.durationMs}ms`);
    lines.push('----------------------------------------------------------------------');
    lines.push('DESEMPENHO POR CATEGORIA:');
    for (const [cat, data] of Object.entries(metrics.byCategory)) {
      const pct = data.total > 0 ? (data.passed / data.total) * 100 : 0;
      lines.push(`  - ${cat.padEnd(23)}: ${data.passed}/${data.total} (${pct.toFixed(0)}%)`);
    }
    lines.push('----------------------------------------------------------------------');
    lines.push('DESEMPENHO POR INTENÇÃO:');
    for (const [intent, data] of Object.entries(metrics.byIntent)) {
      const pct = data.total > 0 ? (data.passed / data.total) * 100 : 0;
      lines.push(`  - ${intent.padEnd(23)}: ${data.passed}/${data.total} (${pct.toFixed(0)}%)`);
    }
    lines.push('======================================================================\n');

    return lines.join('\n');
  }
}
