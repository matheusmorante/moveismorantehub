import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { templateLibraryFilterSchema, type TemplateLibraryFilters } from './imageTemplateListFilters';

export function TemplateListFilters({ filters, onApply }: {
  filters: TemplateLibraryFilters; onApply: (filters: TemplateLibraryFilters) => void;
}) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<TemplateLibraryFilters>({
    defaultValues: filters, resolver: zodResolver(templateLibraryFilterSchema),
  });
  const [search, period, from, through] = useWatch({ control, name: ['search', 'period', 'from', 'through'] });
  const apply = handleSubmit(onApply);

  useEffect(() => {
    const timer = window.setTimeout(() => void handleSubmit(onApply)(), 300);
    return () => window.clearTimeout(timer);
  }, [search, period, from, through, handleSubmit, onApply]);

  return <form aria-label="Filtrar modelos de imagem" className="ct-library-filters" noValidate onSubmit={apply}>
    <label className="ct-field ct-library-search">
      <span className="sr-only">Pesquisar modelos</span><i className="bi bi-search" aria-hidden="true" />
      <input type="search" placeholder="Pesquisar por nome, descrição ou ID" maxLength={160} {...register('search')} />
    </label>
    <label className="ct-field"><span className="sr-only">Data de criação</span><select {...register('period')}>
      <option value="all">Todas as datas</option>
      <option value="today">Hoje</option>
      <option value="last7">Últimos 7 dias</option>
      <option value="last30">Últimos 30 dias</option>
      <option value="custom">Período personalizado</option>
    </select></label>
    {period === 'custom' && <>
      <label className="ct-field"><span className="sr-only">Data inicial</span><input type="date" {...register('from')} /></label>
      <label className="ct-field"><span className="sr-only">Data final</span><input type="date" min={from || undefined}
        aria-invalid={!!errors.through} aria-describedby={errors.through ? 'ct-date-error' : undefined} {...register('through')} /></label>
    </>}
    {(errors.search || errors.from || errors.through) && <p id="ct-date-error" role="alert" className="ct-error">
      {errors.search?.message ?? (errors.through?.type === 'custom' ? errors.through.message : 'Informe uma data válida.')}
    </p>}
  </form>;
}
