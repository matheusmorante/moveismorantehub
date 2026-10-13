import { describe, expect, it } from 'vitest';
import {
  decideCancellationRecovery,
  decideOperationDraftRecovery,
  formatCancellationTimeRemaining,
  findRegisteredSefazCceEvent,
  getCancellationWindow,
  parseSefazCceEvent,
  parseSefazCancellationEvent,
  parseSefazNfeSituation,
  validateCancellationReason,
} from '../nfeEventRules';

describe('regras do evento de cancelamento NF-e', () => {
  it.each(['', 'nfe:'])('prioriza o cancelamento atual sobre o protocolo original, prefixo %s', (prefix) => {
    const xml = `<${prefix}retConsSitNFe><${prefix}cStat>101</${prefix}cStat><${prefix}xMotivo>Cancelada</${prefix}xMotivo><${prefix}protNFe><${prefix}infProt><${prefix}cStat>100</${prefix}cStat><${prefix}xMotivo>Autorizada</${prefix}xMotivo></${prefix}infProt></${prefix}protNFe></${prefix}retConsSitNFe>`;
    expect(parseSefazNfeSituation(xml)).toMatchObject({ state: 'cancelled', cStat: '101', xMotivo: 'Cancelada' });
  });

  it.each(['108', '109', '217'])('não confunde cStat %s da consulta com autorização histórica', (cStat) => {
    const xml = `<retConsSitNFe><cStat>${cStat}</cStat><protNFe><infProt><cStat>100</cStat></infProt></protNFe></retConsSitNFe>`;
    expect(parseSefazNfeSituation(xml)).toMatchObject({ cStat, state: cStat === '217' ? 'not_found' : 'unknown' });
  });

  it.each([['55', 168 * 60 * 60_000], ['65', 30 * 60_000]] as const)('aceita o limite exato de %s e expira no milissegundo seguinte', (model, limit) => {
    const authorizedAt = '2026-10-01T12:00:00-03:00';
    const deadline = Date.parse(authorizedAt) + limit;
    expect(getCancellationWindow(model, authorizedAt, deadline)).toMatchObject({ valid: true, expired: false, remainingMs: 0 });
    expect(getCancellationWindow(model, authorizedAt, deadline + 1).expired).toBe(true);
  });

  it('valida justificativa entre 15 e 255 caracteres', () => {
    expect(validateCancellationReason('Motivo válido para cancelar')).toBeNull();
    expect(validateCancellationReason('curto')).toContain('15');
    expect(validateCancellationReason('a'.repeat(256))).toContain('255');
  });

  it('só reconhece cancelamento confirmado pelos códigos de evento', () => {
    const confirmed = parseSefazCancellationEvent(
      '<retEnvEvento><retEvento><infEvento><cStat>135</cStat><xMotivo>Evento registrado</xMotivo><nProt>141260000000001</nProt><dhRegEvento>2026-09-26T12:00:00-03:00</dhRegEvento></infEvento></retEvento></retEnvEvento>'
    );
    expect(confirmed.registered).toBe(true);
    expect(confirmed.protocolNumber).toBe('141260000000001');
    expect(
      parseSefazCancellationEvent(
        '<retEnvEvento><retEvento><infEvento><cStat>573</cStat><xMotivo>Duplicidade</xMotivo></infEvento></retEvento></retEnvEvento>'
      ).registered
    ).toBe(false);
  });

  it.each(['valid', 'environment', 'key', 'type', 'sequence', 'protocol', 'duplicate'])('confere a identidade do cancelamento: %s', (scenario) => {
    const key = '4'.repeat(44);
    const event = `<retEvento><infEvento><tpAmb>${scenario === 'environment' ? 1 : 2}</tpAmb><chNFe>${scenario === 'key' ? '5'.repeat(44) : key}</chNFe><tpEvento>${scenario === 'type' ? '110110' : '110111'}</tpEvento><nSeqEvento>${scenario === 'sequence' ? 2 : 1}</nSeqEvento><cStat>135</cStat><nProt>${scenario === 'protocol' ? '' : '141260000000001'}</nProt></infEvento></retEvento>`;
    const result = parseSefazCancellationEvent(`<retEnvEvento>${event}${scenario === 'duplicate' ? event : ''}</retEnvEvento>`, { accessKey: key, environment: 2 });
    expect(result.registered).toBe(scenario === 'valid');
    expect(result.pending).toBe(scenario !== 'valid');
  });

  it('preserva situação pendente sem inferir rejeição/autorização do lote', () => {
    expect(
      parseSefazCancellationEvent(
        '<retEnvEvento><cStat>128</cStat><xMotivo>Lote processado</xMotivo></retEnvEvento>'
      ).pending
    ).toBe(true);
  });

  it.each(['', '<retEnvEvento/>', '<retEnvEvento><cStat>108</cStat></retEnvEvento>', '<retEnvEvento><retEvento><infEvento><cStat>573</cStat></infEvento></retEvento></retEnvEvento>', '<retConsSitNFe><cStat>101</cStat></retConsSitNFe>', '<retEnvEvento><cStat>135</cStat></retEnvEvento>'])('mantém retorno ausente, indisponibilidade ou duplicidade pendentes', (xml) => {
    expect(parseSefazCancellationEvent(xml)).toMatchObject({ registered: false, pending: true });
  });

  it('só confirma CC-e vinculada e sinaliza resposta incerta para reconciliação', () => {
    const registered = parseSefazCceEvent(
      '<retEnvEvento><retEvento><infEvento><cStat>135</cStat><xMotivo>CC-e registrada</xMotivo><nProt>141260000000002</nProt><dhRegEvento>2026-09-29T12:00:00-03:00</dhRegEvento></infEvento></retEvento></retEnvEvento>'
    );
    expect(registered.registered).toBe(true);
    expect(registered.protocolNumber).toBe('141260000000002');
    expect(
      parseSefazCceEvent(
        '<retEnvEvento><retEvento><infEvento><cStat>136</cStat><xMotivo>Evento sem vínculo</xMotivo></infEvento></retEvento></retEnvEvento>'
      ).pending
    ).toBe(true);
    expect(
      parseSefazCceEvent(
        '<retEnvEvento><cStat>128</cStat><xMotivo>Lote processado</xMotivo></retEnvEvento>'
      ).pending
    ).toBe(true);
  });

  it('reconhece CC-e na consulta de protocolo pela sequência correta', () => {
    const consultation =
      '<retConsSitNFe><procEventoNFe><evento><infEvento><tpEvento>110110</tpEvento><nSeqEvento>3</nSeqEvento></infEvento></evento><retEvento><infEvento><cStat>135</cStat><xMotivo>Evento registrado</xMotivo><nProt>141260000000003</nProt><dhRegEvento>2026-09-29T12:00:00-03:00</dhRegEvento></infEvento></retEvento></procEventoNFe></retConsSitNFe>';
    expect(findRegisteredSefazCceEvent(consultation, 3)?.registered).toBe(true);
    expect(findRegisteredSefazCceEvent(consultation, 2)).toBeNull();
  });

  it('calcula os prazos distintos paranaenses para NF-e e NFC-e', () => {
    const issuedAt = '2026-09-20T12:00:00.000Z';
    const now = new Date('2026-09-26T12:00:00.000Z').getTime();
    const nfe = getCancellationWindow('55', issuedAt, now);
    const nfce = getCancellationWindow('65', issuedAt, now);
    expect(nfe.remainingMs).toBe(24 * 60 * 60 * 1000);
    expect(nfce.expired).toBe(true);
    expect(formatCancellationTimeRemaining(nfe.remainingMs)).toBe('1 dia e 0 min');
  });

  it('interpreta consulta da chave sem confundir autorização com cancelamento', () => {
    expect(
      parseSefazNfeSituation(
        '<retConsSitNFe><cStat>100</cStat><xMotivo>Autorizado</xMotivo></retConsSitNFe>'
      ).state
    ).toBe('authorized');
    expect(
      parseSefazNfeSituation(
        '<retConsSitNFe><cStat>101</cStat><xMotivo>Cancelado</xMotivo></retConsSitNFe>'
      ).state
    ).toBe('cancelled');
    expect(parseSefazNfeSituation('<retConsSitNFe><cStat>217</cStat></retConsSitNFe>').state).toBe(
      'not_found'
    );
  });

  it('só permite recuperação após consulta confirmar estado autorizado', () => {
    expect(decideCancellationRecovery('unknown', 'unknown')).toBe('still_uncertain');
    expect(decideCancellationRecovery('unknown', 'authorized')).toBe(
      'retry_after_authorized_consult'
    );
    expect(decideCancellationRecovery('rejected', 'authorized')).toBe(
      'retry_after_authorized_consult'
    );
    expect(decideCancellationRecovery('unknown', 'cancelled')).toBe('already_cancelled');
    expect(decideCancellationRecovery('registered', 'authorized')).toBe('manual_reconciliation');
  });

  it('só libera repetição fiscal explícita quando a consulta confirma cStat 217', () => {
    expect(decideOperationDraftRecovery('100', 'authorized')).toBe('authorized');
    expect(decideOperationDraftRecovery('217', 'not_found')).toBe('confirmed_not_found');
    expect(decideOperationDraftRecovery('217', 'unknown')).toBe('still_uncertain');
    expect(decideOperationDraftRecovery('105', 'unknown')).toBe('still_uncertain');
    expect(decideOperationDraftRecovery(null, 'unknown')).toBe('still_uncertain');
  });
});
