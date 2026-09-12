import { describe, it, expect } from 'vitest';
import {
  evaluateDisconnectedState,
  DISCONNECT_THRESHOLD_MS,
  formatTeamMemberStatusLabel,
} from './teamLocationStatus';

describe('teamLocationStatus - Regras de Rastreamento de Equipe e Desconexão', () => {
  it('deve marcar como desconectado se o GPS não estiver ativo (isGpsActive = false)', () => {
    const recentIso = new Date().toISOString();
    expect(evaluateDisconnectedState(false, recentIso)).toBe(true);
  });

  it('deve marcar como desconectado se não houver timestamp de última visualização', () => {
    expect(evaluateDisconnectedState(true, '')).toBe(true);
  });

  it('deve manter como conectado se GPS estiver ativo e última atualização foi há menos de 3 minutos', () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(evaluateDisconnectedState(true, oneMinuteAgo)).toBe(false);
  });

  it('deve marcar como desconectado se a última atualização foi há mais de 3 minutos (aparelho desligado ou sinal perdido)', () => {
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    expect(evaluateDisconnectedState(true, fourMinutesAgo)).toBe(true);
  });

  it('garante que o threshold padrão é exatamente de 3 minutos (180.000 ms)', () => {
    expect(DISCONNECT_THRESHOLD_MS).toBe(180000);
  });

  it('deve formatar rótulos e textos explicativos de status para o modal/tooltip', () => {
    const activeLabel = formatTeamMemberStatusLabel(false, '2026-09-12T14:30:00Z');
    expect(activeLabel.badge).toBe('active');
    expect(activeLabel.title).toBe('GPS Ativo em Rota');

    const disconnectedLabel = formatTeamMemberStatusLabel(true, '2026-09-12T14:30:00Z');
    expect(disconnectedLabel.badge).toBe('disconnected');
    expect(disconnectedLabel.title).toBe('Sem sinal de GPS / Desligado');
    expect(disconnectedLabel.subtitle).toContain('Visto pela última vez às');
  });
});
