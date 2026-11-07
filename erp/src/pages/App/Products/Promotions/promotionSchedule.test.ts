import { describe, expect, it } from 'vitest';
import { shouldConfirmImmediateActivation } from './promotionSchedule';

describe('shouldConfirmImmediateActivation', () => {
  const now = new Date('2026-11-06T12:00:00.000Z');
  const campaign = {
    status: 'scheduled',
    startsOn: '2026-11-05',
    endsOn: '2026-11-10',
    timezoneName: 'America/Sao_Paulo',
  };

  it('confirms when the campaign period already includes today', () => {
    expect(shouldConfirmImmediateActivation(campaign, now)).toBe(true);
  });

  it('does not confirm for a future or ended period, or for a draft', () => {
    expect(shouldConfirmImmediateActivation({ ...campaign, startsOn: '2026-11-07' }, now)).toBe(false);
    expect(shouldConfirmImmediateActivation({ ...campaign, endsOn: '2026-11-05' }, now)).toBe(false);
    expect(shouldConfirmImmediateActivation({ ...campaign, status: 'draft' }, now)).toBe(false);
  });

  it('uses the campaign timezone when determining today', () => {
    const beforeMidnightInSaoPaulo = new Date('2026-11-06T02:30:00.000Z');
    expect(shouldConfirmImmediateActivation({
      ...campaign,
      startsOn: '2026-11-05',
      endsOn: '2026-11-05',
    }, beforeMidnightInSaoPaulo)).toBe(true);
  });
});
