import { describe, expect, it } from 'vitest';
import { decideCancellationRecovery, decideOperationDraftRecovery, formatCancellationTimeRemaining, getCancellationWindow, parseSefazCancellationEvent, parseSefazNfeSituation, validateCancellationReason } from '../nfeEventRules';

describe('regras do evento de cancelamento NF-e', () => {
    it('valida justificativa entre 15 e 255 caracteres', () => {
        expect(validateCancellationReason('Motivo válido para cancelar')).toBeNull();
        expect(validateCancellationReason('curto')).toContain('15');
        expect(validateCancellationReason('a'.repeat(256))).toContain('255');
    });

    it('só reconhece cancelamento confirmado pelos códigos de evento', () => {
        const confirmed = parseSefazCancellationEvent('<retEnvEvento><retEvento><infEvento><cStat>135</cStat><xMotivo>Evento registrado</xMotivo><nProt>141260000000001</nProt><dhRegEvento>2026-09-26T12:00:00-03:00</dhRegEvento></infEvento></retEvento></retEnvEvento>');
        expect(confirmed.registered).toBe(true);
        expect(confirmed.protocolNumber).toBe('141260000000001');
        expect(parseSefazCancellationEvent('<retEnvEvento><retEvento><infEvento><cStat>573</cStat><xMotivo>Duplicidade</xMotivo></infEvento></retEvento></retEnvEvento>').registered).toBe(false);
    });

    it('preserva situação pendente sem inferir rejeição/autorização do lote', () => {
        expect(parseSefazCancellationEvent('<retEnvEvento><cStat>128</cStat><xMotivo>Lote processado</xMotivo></retEnvEvento>').pending).toBe(true);
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
        expect(parseSefazNfeSituation('<retConsSitNFe><cStat>100</cStat><xMotivo>Autorizado</xMotivo></retConsSitNFe>').state).toBe('authorized');
        expect(parseSefazNfeSituation('<retConsSitNFe><cStat>101</cStat><xMotivo>Cancelado</xMotivo></retConsSitNFe>').state).toBe('cancelled');
        expect(parseSefazNfeSituation('<retConsSitNFe><cStat>217</cStat></retConsSitNFe>').state).toBe('unknown');
    });

    it('só permite recuperação após consulta confirmar estado autorizado', () => {
        expect(decideCancellationRecovery('unknown', 'unknown')).toBe('still_uncertain');
        expect(decideCancellationRecovery('unknown', 'authorized')).toBe('retry_after_authorized_consult');
        expect(decideCancellationRecovery('rejected', 'authorized')).toBe('retry_after_authorized_consult');
        expect(decideCancellationRecovery('unknown', 'cancelled')).toBe('already_cancelled');
        expect(decideCancellationRecovery('registered', 'authorized')).toBe('manual_reconciliation');
    });

    it('só libera repetição fiscal explícita quando a consulta confirma cStat 217', () => {
        expect(decideOperationDraftRecovery('100', 'authorized')).toBe('authorized');
        expect(decideOperationDraftRecovery('217', 'unknown')).toBe('confirmed_not_found');
        expect(decideOperationDraftRecovery('105', 'unknown')).toBe('still_uncertain');
        expect(decideOperationDraftRecovery(null, 'unknown')).toBe('still_uncertain');
    });
});
