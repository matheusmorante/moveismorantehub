import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';
import type Shipping from '../../../../types/Shipping.type';
import {
  extractScheduleTimes,
  normalizeScheduleDate,
} from '../../../../../../../shared-utils/commercialOrderRules';
import {
  buildSchedulingSignature,
  deriveSchedulingSessionMemory,
  type SchedulingSessionMemory,
} from './agendamentoSessionMemory';

export const useSchedulingMemoryHydration = (
  activeMemoryRef: MutableRefObject<SchedulingSessionMemory | null>,
  activeScheduling: Shipping['scheduling']
) => {
  if (!activeMemoryRef.current || !activeMemoryRef.current.initialized) {
    activeMemoryRef.current = deriveSchedulingSessionMemory(activeScheduling);
  }

  const [, setRenderTick] = useState(0);
  const forceRender = () => setRenderTick((prev) => prev + 1);

  const currentSignature = buildSchedulingSignature(activeScheduling);

  useEffect(() => {
    const mem = activeMemoryRef.current;
    if (!mem) return;

    if (mem.lastHydratedSignature !== currentSignature) {
      const hasExternalData = Boolean(
        normalizeScheduleDate(activeScheduling?.date) ||
          normalizeScheduleDate(activeScheduling?.endDate) ||
          extractScheduleTimes(activeScheduling || {}).startTime ||
          extractScheduleTimes(activeScheduling || {}).endTime
      );
      if (hasExternalData && mem.dateMode === null && mem.timeMode === null) {
        activeMemoryRef.current = deriveSchedulingSessionMemory(activeScheduling);
        forceRender();
      } else {
        mem.lastHydratedSignature = currentSignature;
      }
    }
  }, [currentSignature, activeScheduling, activeMemoryRef]);

  return forceRender;
};
