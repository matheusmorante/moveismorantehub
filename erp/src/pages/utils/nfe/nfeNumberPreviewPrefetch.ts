import { getSettings } from '@/pages/utils/settingsService';
import { getNextNfeNumberPreview } from '@/pages/utils/nfe/nfeService';
import { resolveNfeSequenceSettings } from '@/pages/utils/nfe/nfeSequenceSettings';

/** Warm the read-only sequence preview before the user opens the emission modal. */
export async function prefetchNfeNumberPreviews(): Promise<void> {
  const settings = getSettings();
  if (!String(settings.companyCnpj || '').replace(/\D/g, '')) return;

  const requests: Promise<number>[] = [];
  for (const environment of [1, 2] as const) {
    for (const model of ['55', '65'] as const) {
      try {
        const sequence = resolveNfeSequenceSettings(settings, model, environment);
        requests.push(
          getNextNfeNumberPreview(model, environment, sequence.series, sequence.minimumNumber)
        );
      } catch {
        // Warmup is best effort. The emission modal presents sequence configuration errors.
      }
    }
  }

  await Promise.allSettled(requests);
}
