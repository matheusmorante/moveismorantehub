import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export type MobileMoveVariationConflictState = 'idle' | 'checking' | 'clear' | 'conflict' | 'error';

interface MobileMoveVariationConfirmationCountdownOptions {
  visible: boolean;
  targetFamilyId: string;
  conflictState: MobileMoveVariationConflictState;
  saving: boolean;
  countdown: number;
  setCountdown: Dispatch<SetStateAction<number>>;
}

export function useMobileMoveVariationConfirmationCountdown({
  visible,
  targetFamilyId,
  conflictState,
  saving,
  countdown,
  setCountdown,
}: MobileMoveVariationConfirmationCountdownOptions) {
  useEffect(() => {
    if (!visible || !targetFamilyId || conflictState !== 'clear' || saving) {
      setCountdown(5);
      return;
    }
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, targetFamilyId, conflictState, saving, countdown]);
}
