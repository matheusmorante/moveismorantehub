import React from 'react';
import {
  recordNfeEmissionReadiness,
  withNfeEmissionStage,
} from '../../../../../../../../src/telemetry/nfeEmissionPerformance';

export interface UseNfeEmissionTelemetryProps {
  isOpen: boolean;
  orderId?: string;
  environment: 1 | 2;
  emissionOpenedAt?: number;
}

export function useNfeEmissionTelemetry({
  isOpen,
  orderId,
  environment,
  emissionOpenedAt,
}: UseNfeEmissionTelemetryProps) {
  const emissionStartedAtRef = React.useRef<number | null>(null);
  const readinessRecordedForRef = React.useRef<number | null>(null);

  const handleTransmissionEnabled = React.useCallback(() => {
    const startedAt = emissionStartedAtRef.current;
    if (startedAt === null || readinessRecordedForRef.current === startedAt) return;

    readinessRecordedForRef.current = startedAt;
    recordNfeEmissionReadiness(startedAt, { environment });
  }, [environment]);

  React.useLayoutEffect(() => {
    if (!isOpen || orderId == null) {
      emissionStartedAtRef.current = null;
      readinessRecordedForRef.current = null;
      return;
    }

    const startedAt =
      emissionOpenedAt ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    emissionStartedAtRef.current = startedAt;
    readinessRecordedForRef.current = null;

    let frameId: number | undefined;
    let finishTiming: (() => void) | undefined;
    const visibleFrame = new Promise<void>((resolve) => {
      finishTiming = resolve;
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        frameId = window.requestAnimationFrame(() => resolve());
      } else {
        resolve();
      }
    });
    void withNfeEmissionStage('modal_open', () => visibleFrame);

    return () => {
      if (frameId !== undefined && typeof window !== 'undefined') {
        window.cancelAnimationFrame(frameId);
      }
      finishTiming?.();
    };
  }, [isOpen, orderId, emissionOpenedAt]);

  return { handleTransmissionEnabled };
}
