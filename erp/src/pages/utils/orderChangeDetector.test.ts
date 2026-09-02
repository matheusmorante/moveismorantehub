import { describe, expect, it } from 'vitest';
import { shouldNotifyOrderChange } from './orderChangeDetector';

describe('order alteration notification policy', () => {
  it('does not notify changes to drafts', () => {
    expect(shouldNotifyOrderChange('draft')).toBe(false);
  });

  it('notifies changes to scheduled orders', () => {
    expect(shouldNotifyOrderChange('scheduled')).toBe(true);
  });

  it.each(['fulfilled', 'cancelled', undefined])('does not notify %s orders', (status) => {
    expect(shouldNotifyOrderChange(status)).toBe(false);
  });
});
