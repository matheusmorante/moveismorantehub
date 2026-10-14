import type { FormHTMLAttributes } from 'react';
import type { FieldValues } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { z } from 'zod';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';

type Props<TSchema extends z.ZodType<FieldValues, FieldValues>> = FormHTMLAttributes<HTMLFormElement> & {
  schema: TSchema;
  values: z.input<TSchema>;
  onValid?: (values: z.output<TSchema>) => unknown | Promise<unknown>;
};
type SubmitEvent = Parameters<NonNullable<FormHTMLAttributes<HTMLFormElement>['onSubmit']>>[0];

/** Shared form boundary; schemas remain explicit domain contracts. */
export function ZodForm<TSchema extends z.ZodType<FieldValues, FieldValues>>({
  schema, values, onValid, onSubmit, children, ...props
}: Props<TSchema>) {
  const form = useZodForm(schema, values);
  return <FormProvider {...form}>
    <form {...props} noValidate onSubmit={form.submit(
      async (data, event) => { if (onValid) await onValid(data); else if (event) await onSubmit?.(event as SubmitEvent); },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira os campos do formulário.'),
    )}>{children}</form>
  </FormProvider>;
}
