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
    // Buttons that finalize drafts choose their resulting status at submit time.
    // Reset synchronously so resolver validation sees that exact intent.
    try {
      reset(nextValues);
      let result: TResult | false = false;
      await handleSubmit(async (data) => { result = await onValid(data); }, onInvalid)();
      return result;
    } finally {
      submissionInFlight.current = false;
    }
  }, [reset, handleSubmit]);
  const submitControlledValues = useCallback((
    onValid: SubmitHandler<Output>, onInvalid?: SubmitErrorHandler<Input>,
  ) => async (event?: React.BaseSyntheticEvent) => {
    event?.preventDefault();
    event?.persist?.();
    await validateAndRun(currentValues.current,
      (data) => onValid(data, event),
      (errors) => onInvalid?.(errors, event));
  }, [validateAndRun]);
  // Using useForm.values would reset again during async validation when a button
  // supplies a different status/number. RHF cancels that pending submission.
  return { ...form, handleSubmit: submitControlledValues, validateAndRun };
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
