import { useCallback, useRef } from 'react';
import { useForm, type DefaultValues, type FieldErrors, type FieldValues, type Resolver, type SubmitErrorHandler, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

/** Migrates controlled ERP forms without changing draft/autosave ownership.
 * Every submit runs the real RHF resolver; callers receive the parsed values.
 */
export function useZodForm<TSchema extends z.ZodType<FieldValues, FieldValues>>(
  schema: TSchema,
  values: z.input<TSchema>,
) {
  type Input = z.input<TSchema>;
  type Output = z.output<TSchema>;
  const currentValues = useRef(values);
  const submissionInFlight = useRef(false);
  const validationQueue = useRef<Promise<void>>(Promise.resolve());
  const activeCompletion = useRef<Promise<void> | null>(null);
  currentValues.current = values;
  const form = useForm<Input, unknown, Output>({
    defaultValues: values as DefaultValues<Input>,
    resolver: zodResolver(schema) as unknown as Resolver<Input, unknown, Output>,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const { reset, handleSubmit } = form;
  const validateAndRun = useCallback(async <TResult,>(
    nextValues: Input,
    onValid: (data: Output) => TResult | Promise<TResult>,
    onInvalid?: (errors: FieldErrors<Input>) => void,
  ): Promise<TResult | false> => {
    if (submissionInFlight.current) return false;
    submissionInFlight.current = true;
    let complete!: () => void;
    activeCompletion.current = new Promise<void>((resolve) => { complete = resolve; });
    // Buttons that finalize drafts choose their resulting status at submit time.
    // Reset synchronously so resolver validation sees that exact intent.
    try {
      reset(nextValues);
      let result: TResult | false = false;
      await handleSubmit(async (data) => { result = await onValid(data); }, onInvalid)();
      return result;
    } finally {
      submissionInFlight.current = false;
      activeCompletion.current = null;
      complete();
    }
  }, [reset, handleSubmit]);
  // Autosave queues each snapshot; ordinary submits retain duplicate protection.
  const enqueueAndRun = useCallback(<TResult,>(nextValues: Input, onValid: (data: Output) => TResult | Promise<TResult>, onInvalid?: (errors: FieldErrors<Input>) => void): Promise<TResult | false> => {
    const pending = validationQueue.current.then(async () => {
      while (activeCompletion.current) await activeCompletion.current;
      return validateAndRun(nextValues, onValid, onInvalid);
    });
    validationQueue.current = pending.then(() => undefined, () => undefined);
    return pending;
  }, [validateAndRun]);
  // Queries serialize validation only and release the form before I/O.
  const validateValues = useCallback((nextValues: Input, onInvalid?: (errors: FieldErrors<Input>) => void): Promise<Output | false> => enqueueAndRun(nextValues, (data) => data, onInvalid), [enqueueAndRun]);
  const submitControlledValues = useCallback(<TResult,>(
    onValid: SubmitHandler<Output, TResult>, onInvalid?: SubmitErrorHandler<Input>, queued = false,
  ) => async (event?: React.BaseSyntheticEvent): Promise<Awaited<TResult> | undefined> => {
    event?.preventDefault();
    event?.persist?.();
    let outcome: Awaited<TResult> | undefined;
    await (queued ? enqueueAndRun : validateAndRun)(currentValues.current,
      async (data) => { outcome = await onValid(data, event); },
      (errors) => onInvalid?.(errors, event));
    return outcome;
  }, [validateAndRun, enqueueAndRun]);
  // Using useForm.values would reset again during async validation when a button
  // supplies a different status/number. RHF cancels that pending submission.
  return { ...form, submit: submitControlledValues, validateAndRun, validateValues, enqueueAndRun };
}

export function flattenFormErrors(errors: FieldErrors, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (!value || key === 'ref') continue;
    const path = prefix ? `${prefix}_${key}` : key;
    if (typeof value.message === 'string') result[path] = value.message;
    else Object.assign(result, flattenFormErrors(value as FieldErrors, path));
  }
  return result;
}
