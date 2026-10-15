'use client';
import type { FormHTMLAttributes } from 'react';
import type { FieldValues } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { z } from 'zod';
import { toast } from 'sonner';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';

type Props<TSchema extends z.ZodType<FieldValues, FieldValues>> = Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> & {
  schema: TSchema;
  values: z.input<TSchema>;
  onValid: (values: z.output<TSchema>) => unknown | Promise<unknown>;
};

/** Shared form boundary; schemas remain explicit domain contracts. */
export function ZodForm<TSchema extends z.ZodType<FieldValues, FieldValues>>({
  schema, values, onValid, children, ...props
}: Props<TSchema>) {
  const form = useZodForm(schema, values);
  return <FormProvider {...form}>
    <form {...props} noValidate onSubmit={form.submit(
      async (data) => {
        try { await onValid(data); }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a operação.'); }
      },
      (errors) => toast.error(Object.values(flattenFormErrors(errors))[0] || 'Confira os campos do formulário.'),
    )}>{children}</form>
  </FormProvider>;
}
