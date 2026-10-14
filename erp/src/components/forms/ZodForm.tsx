import type { FormEvent, FormHTMLAttributes } from 'react';
import type { FieldValues } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { z } from 'zod';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';

type Props<TSchema extends z.ZodType<FieldValues, FieldValues>> = FormHTMLAttributes<HTMLFormElement> & {
  schema: TSchema;
  values: z.input<TSchema>;
};

/** Shared form boundary; schemas remain explicit domain contracts. */
export function ZodForm<TSchema extends z.ZodType<FieldValues, FieldValues>>({
  schema, values, onSubmit, children, ...props
}: Props<TSchema>) {
  const form = useZodForm(schema, values);
  return <FormProvider {...form}>
    <form {...props} noValidate onSubmit={form.handleSubmit(
      async (_data, event) => { if (event) await onSubmit?.(event as FormEvent<HTMLFormElement>); },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira os campos do formulário.'),
    )}>{children}</form>
  </FormProvider>;
}
