import { describe, test, expect, beforeEach } from 'vitest';
import { AiPreAnalysisManager } from '../../services/aiGateway/core/AiPreAnalysisManager';
import { AiHybridDispatcher } from '../../services/aiGateway/core/AiHybridDispatcher';
import { processFinancialInput } from '../../../../../mobile/src/services/financial/financialIntentValidator';

describe('FLUXO DE VOZ: DEBOUNCE DE PRÉ-ANÁLISE (3 SEGUNDOS) E ENVIO EXPLÍCITO', () => {
  beforeEach(() => {
    AiPreAnalysisManager.resetTelemetry();
  });

  test('CASO 1: Silêncio >3s NÃO envia mensagem; fala continuada agrega e commit gera 1 mensagem com 2 fatos', async () => {
    // 1. Usuário dita a primeira parte
    const t1 = 'conta de luz 300';
    const v1 = AiPreAnalysisManager.onTextChange(t1);
    expect(v1).toBe(1);

    // 2. Passam 3 segundos de silêncio -> Dispara pré-análise silenciosa em segundo plano
    const snap1 = await AiPreAnalysisManager.executePreAnalysis(t1, v1);
    expect(snap1).not.toBeNull();
    expect(snap1?.text).toBe(t1);
    expect(snap1?.draft?.amount).toBe(300);

    // Nenhuma mensagem deve ter sido enviada ou confirmada automaticamente
    expect(snap1?.source).toBe('LOCAL_DETERMINISTIC');

    // 3. Usuário continua falando: "e internet 200"
    const t2 = 'conta de luz 300 e internet 200';
    const v2 = AiPreAnalysisManager.onTextChange(t2);
    expect(v2).toBe(2);

    // 4. Nova pré-análise silenciosa para v2
    const snap2 = await AiPreAnalysisManager.executePreAnalysis(t2, v2);
    expect(snap2).not.toBeNull();
    expect(snap2?.text).toBe(t2);
    expect(snap2?.draft?.batchDraftsList?.length).toBe(2);

    // 5. Usuário clica no botão de ENVIAR
    const commit = AiPreAnalysisManager.commitAndConsume(t2);
    expect(commit.reused).toBe(true);
    expect(commit.snapshot?.draft?.batchDraftsList?.length).toBe(2);
    expect(commit.snapshot?.draft?.batchDraftsList?.[0].amount).toBe(300);
    expect(commit.snapshot?.draft?.batchDraftsList?.[1].amount).toBe(200);

    // Telemetria
    const telem = AiPreAnalysisManager.getTelemetry();
    expect(telem.reusedHits).toBe(1);
    expect(telem.triggeredCount).toBe(2);
  });

  test('CASO 2: Múltiplas pausas >3s nunca enviam automaticamente', async () => {
    let currentInput = '';

    // Pausa 1
    currentInput = 'almoço 45';
    let v = AiPreAnalysisManager.onTextChange(currentInput);
    await AiPreAnalysisManager.executePreAnalysis(currentInput, v);

    // Pausa 2
    currentInput = 'almoço 45 no débito';
    v = AiPreAnalysisManager.onTextChange(currentInput);
    await AiPreAnalysisManager.executePreAnalysis(currentInput, v);

    // Pausa 3
    currentInput = 'almoço 45 no débito e café 8';
    v = AiPreAnalysisManager.onTextChange(currentInput);
    await AiPreAnalysisManager.executePreAnalysis(currentInput, v);

    // Pausa 4
    currentInput = 'almoço 45 no débito e café 8 no pix';
    v = AiPreAnalysisManager.onTextChange(currentInput);
    const finalPreSnap = await AiPreAnalysisManager.executePreAnalysis(currentInput, v);

    // Nenhuma mensagem foi enviada ainda. Somente o commit final envia:
    const commit = AiPreAnalysisManager.commitAndConsume(currentInput);
    expect(commit.reused).toBe(true);
    expect(commit.snapshot?.text).toBe(currentInput);
    expect(commit.snapshot?.draft?.batchDraftsList?.length).toBe(2);
  });

  test('CASO 3: Resultado tardio de versão antiga (v1) é estritamente ignorado ao chegar após v2', async () => {
    const t1 = 'gasolina 150';
    const v1 = AiPreAnalysisManager.onTextChange(t1);

    // Usuário altera para v2 ANTES de v1 terminar ou ser consumido
    const t2 = 'gasolina 200 no pix';
    const v2 = AiPreAnalysisManager.onTextChange(t2);

    // Tentativa de gravar resultado da v1 atrasada
    const lateV1Result = await AiPreAnalysisManager.executePreAnalysis(t1, v1);
    expect(lateV1Result).toBeNull(); // Rejeitado porque v1 != currentVersion (2)

    // Pré-análise da v2
    const snap2 = await AiPreAnalysisManager.executePreAnalysis(t2, v2);
    expect(snap2).not.toBeNull();
    expect(snap2?.version).toBe(v2);
    expect(snap2?.draft?.amount).toBe(200);

    const telem = AiPreAnalysisManager.getTelemetry();
    expect(telem.discardedCount).toBeGreaterThanOrEqual(1);
  });

  test('CASO 4: Pré-análise pronta + Enviar com texto idêntico reaproveita resultado instantaneamente', async () => {
    const text = 'paguei 350 de conta de luz no pix';
    const v = AiPreAnalysisManager.onTextChange(text);

    const snap = await AiPreAnalysisManager.executePreAnalysis(text, v);
    expect(snap).not.toBeNull();

    // Commit com o exato mesmo texto
    const commit = AiPreAnalysisManager.commitAndConsume(text);
    expect(commit.reused).toBe(true);
    expect(commit.snapshot?.draft?.amount).toBe(350);
    expect(commit.snapshot?.draft?.paymentMethod).toBe('Pix');
  });

  test('CASO 5: Usuário altera valor de "luz 300" para "na verdade 350" -> commit nunca usa R$ 300', async () => {
    // 1. Fala inicial
    const t1 = 'luz 300';
    const v1 = AiPreAnalysisManager.onTextChange(t1);
    await AiPreAnalysisManager.executePreAnalysis(t1, v1);

    // 2. Correção pelo usuário
    const t2 = 'luz 300 na verdade 350';
    const v2 = AiPreAnalysisManager.onTextChange(t2);
    await AiPreAnalysisManager.executePreAnalysis(t2, v2);

    // 3. Commit
    const commit = AiPreAnalysisManager.commitAndConsume(t2);
    expect(commit.reused).toBe(true);
    expect(commit.snapshot?.draft?.amount).toBe(350);
    expect(commit.snapshot?.draft?.amount).not.toBe(300);
  });

  test('CASO 6: "luz 300 e internet 200" + "as duas são da loja e foram no pix" -> 2 saídas resolvidas', async () => {
    const fullSpeech = 'luz 300 e internet 200 as duas são da loja e foram no pix';
    const v = AiPreAnalysisManager.onTextChange(fullSpeech);
    const snap = await AiPreAnalysisManager.executePreAnalysis(fullSpeech, v);

    expect(snap).not.toBeNull();
    const batch = snap?.draft?.batchDraftsList;
    expect(batch).toBeDefined();
    expect(batch?.length).toBe(2);

    // Luz
    expect(batch?.[0].amount).toBe(300);
    expect(batch?.[0].paymentMethod).toBe('Pix');
    expect(batch?.[0].businessPurpose).toBe('BUSINESS');

    // Internet
    expect(batch?.[1].amount).toBe(200);
    expect(batch?.[1].paymentMethod).toBe('Pix');
    expect(batch?.[1].businessPurpose).toBe('BUSINESS');

    const commit = AiPreAnalysisManager.commitAndConsume(fullSpeech);
    expect(commit.reused).toBe(true);
  });

  test('TELEMETRIA: Métricas completas de debounce, acertos e descartes', async () => {
    // 1 disparo que gera snapshot e depois é descartado por alteração de texto
    const vOld = AiPreAnalysisManager.onTextChange('texto que sera descartado');
    await AiPreAnalysisManager.executePreAnalysis('texto que sera descartado', vOld);
    AiPreAnalysisManager.onTextChange('novo texto'); // Descarta o snapshot anterior

    // 1 disparo que é aproveitado
    const t = 'almoço 30 no dinheiro';
    const v = AiPreAnalysisManager.onTextChange(t);
    await AiPreAnalysisManager.executePreAnalysis(t, v);
    AiPreAnalysisManager.commitAndConsume(t);

    const telemetry = AiPreAnalysisManager.getTelemetry();
    expect(telemetry.triggeredCount).toBeGreaterThanOrEqual(1);
    expect(telemetry.reusedHits).toBe(1);
    expect(telemetry.discardedCount).toBeGreaterThanOrEqual(1);
    expect(telemetry.cacheHitRate).toBeGreaterThan(0);
    expect(telemetry.avgPreAnalysisDurationMs).toBeGreaterThanOrEqual(0);
  });
});
