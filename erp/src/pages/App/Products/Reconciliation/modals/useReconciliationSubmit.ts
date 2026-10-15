import { useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import type { FieldValues } from 'react-hook-form';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type { ReconciliationConfirmation } from '../../../../../../../shared-utils/reconciliationFormSchemas';

/** The four reconciliation dialogs share one submission lifecycle. */
export function useReconciliationSubmit<TSchema extends z.ZodType<FieldValues, FieldValues>>(
  schema: TSchema, values: z.input<TSchema>, isOpen: boolean,
  onConfirm: (values: z.output<TSchema>) => Promise<ReconciliationConfirmation>, onClose: () => void,
) {
  const form = useZodForm(schema, values);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const session = useRef(0);
  const opened = useRef(isOpen); opened.current = isOpen;
  useEffect(() => {
    session.current += 1; setError(''); setUncertain(false);
    return () => { session.current += 1; };
  }, [isOpen]);
  const handleConfirm = async () => {
    if (!opened.current || uncertain || form.formState.isSubmitting) return;
    const revision = session.current;
    const current = () => revision === session.current && opened.current;
    setError('');
    await form.validateAndRun(values, async (data) => {
      if (!current()) return;
      try {
        const response = await withTimeout(onConfirm(data).then((result) => ({ result })), 30_000, null, 'reconciliacao:confirmar');
        if (!current()) return;
        if (!response || (typeof response.result === 'object' && response.result?.uncertain)) {
          setUncertain(true); setError('Não foi possível confirmar a gravação. Confira os produtos antes de repetir.'); return;
        }
        if (response.result === false || (typeof response.result === 'object' && !response.result.success)) {
          setError(typeof response.result === 'object' && response.result.error || 'Não foi possível salvar. Revise os produtos e tente novamente.'); return;
        }
        onClose();
      } catch (cause) {
        if (current()) setError(cause instanceof Error ? cause.message : 'Não foi possível salvar as alterações.');
      }
    }, (errors) => { if (current()) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados informados.'); });
  };
  return { handleConfirm, isSubmitting: form.formState.isSubmitting, error, uncertain };
}
