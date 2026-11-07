import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { getSettings } from '@/pages/utils/settingsService';
import { requestConfirmation } from '@/components/shared/confirmationService';
import {
  PAGE_SIZE,
  fetchPromotion,
  fetchPromotionFilterOptions,
  getPromotionErrorMessage,
  mutatePromotion,
  searchPromotionParticipants,
  type PromotionParticipant,
} from './promotionsService';
import { shouldConfirmImmediateActivation } from './promotionSchedule';

const participantSchema = z.object({
  productId: z.string().uuid(),
  variationId: z.string().uuid().nullable(),
  productName: z.string(),
  variationName: z.string().nullable(),
  code: z.string().nullable(),
  sku: z.string().nullable(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  regularPrice: z.number(),
  currentPrice: z.number(),
  discountPercent: z.string(),
});

const promotionFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da campanha.').max(120),
  description: z.string().max(3000),
  conditions: z.string().max(2000),
  discountMode: z.enum(['general', 'per_variation']),
  generalDiscountPercent: z.string(),
  startsOn: z.string(),
  endsOn: z.string(),
  timezoneName: z.string().min(1),
  status: z.enum(['draft', 'scheduled']),
  items: z.array(participantSchema),
}).superRefine((values, context) => {
  const percent = Number(values.generalDiscountPercent);
  if (values.generalDiscountPercent && (!Number.isFinite(percent) || percent < 0.01 || percent > 100)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['generalDiscountPercent'], message: 'Use um percentual entre 0,01% e 100%.' });
  }
  if (values.startsOn && values.endsOn && values.startsOn > values.endsOn) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsOn'], message: 'A data final deve ser igual ou posterior à data inicial.' });
  }
  values.items.forEach((item, index) => {
    if (!item.discountPercent) return;
    const itemPercent = Number(item.discountPercent);
    if (!Number.isFinite(itemPercent) || itemPercent < 0.01 || itemPercent > 100) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'discountPercent'], message: 'Use um percentual entre 0,01% e 100%.' });
    }
  });
  if (values.status === 'scheduled') {
    if (!values.startsOn) context.addIssue({ code: z.ZodIssueCode.custom, path: ['startsOn'], message: 'Informe a data de início.' });
    if (!values.endsOn) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsOn'], message: 'Informe a data de término.' });
    if (values.items.length === 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Selecione ao menos um produto ou uma variação.' });
    if (values.discountMode === 'general' && (!Number.isFinite(percent) || percent < 0.01 || percent > 100)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['generalDiscountPercent'], message: 'Informe um percentual entre 0,01% e 100%.' });
    }
    if (values.discountMode === 'per_variation') {
      values.items.forEach((item, index) => {
        const itemPercent = Number(item.discountPercent);
        if (!item.discountPercent || !Number.isFinite(itemPercent) || itemPercent < 0.01 || itemPercent > 100) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'discountPercent'], message: 'Informe um percentual entre 0,01% e 100%.' });
        }
      });
    }
  }
});

type PromotionFormValues = z.infer<typeof promotionFormSchema>;

function useDebouncedValue(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), 300);
    return () => window.clearTimeout(timer);
  }, [value]);
  return debounced;
}

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export default function PromotionEditor({ promotionId, readOnly }: { promotionId: string | null; readOnly: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storeTimezone = getSettings().operatingHours.timezone || 'America/Sao_Paulo';
  const defaults = useMemo<PromotionFormValues>(() => ({
    name: '', description: '', conditions: '', discountMode: 'general', generalDiscountPercent: '',
    startsOn: '', endsOn: '', timezoneName: storeTimezone, status: 'draft', items: [],
  }), [storeTimezone]);
  const form = useForm<PromotionFormValues>({ resolver: zodResolver(promotionFormSchema), defaultValues: defaults, mode: 'onSubmit' });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const selectedItemKeys = [...new Set(fields.map((item) => `${item.productId}:${item.variationId || ''}`))].sort();
  const selectedKeys = new Set(selectedItemKeys);
  const [hydratedPromotionId, setHydratedPromotionId] = useState<string | null>(null);
  const { watch, register, reset, setValue, handleSubmit, formState: { errors } } = form;
  const discountMode = watch('discountMode');
  const generalPercent = Number(watch('generalDiscountPercent')) || 0;
  const { data: currentPromotion, isLoading: isLoadingPromotion, error: promotionLoadError } = useQuery({
    queryKey: ['promotion', promotionId],
    queryFn: () => fetchPromotion(promotionId as string),
    enabled: Boolean(promotionId),
  });
  const { data: filterOptions } = useQuery({
    queryKey: ['promotion-filter-options'],
    queryFn: fetchPromotionFilterOptions,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!currentPromotion) return;
    reset({
      name: currentPromotion.name,
      description: currentPromotion.description || '',
      conditions: currentPromotion.conditions || '',
      discountMode: currentPromotion.discount_mode,
      generalDiscountPercent: currentPromotion.general_discount_percent == null ? '' : String(currentPromotion.general_discount_percent),
      startsOn: currentPromotion.starts_on || '',
      endsOn: currentPromotion.ends_on || '',
      timezoneName: currentPromotion.timezone_name || storeTimezone,
      status: currentPromotion.status === 'scheduled' ? 'scheduled' : 'draft',
      items: currentPromotion.items,
    });
    setHydratedPromotionId(currentPromotion.id);
  }, [currentPromotion, reset, storeTimezone]);

  const [pickerSearch, setPickerSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [pickerPage, setPickerPage] = useState(1);
  const debouncedPickerSearch = useDebouncedValue(pickerSearch);
  const { data: pickerRows, isLoading: isLoadingPicker, isError: isPickerError, refetch: refetchPicker } = useQuery({
    queryKey: ['promotion-participants', debouncedPickerSearch, categoryId, supplierId, selectedItemKeys, pickerPage],
    queryFn: () => searchPromotionParticipants({ search: debouncedPickerSearch, categoryId, supplierId, selectedKeys: selectedItemKeys, page: pickerPage }),
    enabled: !promotionId || hydratedPromotionId === promotionId,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: PromotionFormValues) => {
      const id = await mutatePromotion('save', promotionId, {
        name: values.name,
        description: values.description,
        conditions: values.conditions,
        discount_mode: values.discountMode,
        general_discount_percent: values.discountMode === 'general' ? Number(values.generalDiscountPercent) : null,
        starts_on: values.startsOn || null,
        ends_on: values.endsOn || null,
        timezone_name: values.timezoneName,
        status: values.status,
        items: values.items.map((item) => ({
          product_id: item.productId,
          variation_id: item.variationId,
          discount_percent: values.discountMode === 'per_variation' ? Number(item.discountPercent) : null,
        })),
      });
      return { id, status: values.status };
    },
    onSuccess: async ({ id, status }) => {
      await queryClient.invalidateQueries({ queryKey: ['promotions'] });
      await queryClient.invalidateQueries({ queryKey: ['promotion', id] });
      toast.success(status === 'scheduled' ? 'Campanha programada.' : 'Rascunho salvo.');
      navigate(`/products/campaigns/${id}/edit`);
    },
    onError: (error) => toast.error(getPromotionErrorMessage(error)),
  });

  const addParticipant = (participant: PromotionParticipant) => {
    const key = `${participant.productId}:${participant.variationId || ''}`;
    if (selectedKeys.has(key)) return;
    append({ ...participant, discountPercent: '' });
  };
  const addCurrentPage = () => {
    const additions = (pickerRows || [])
      .filter((item) => !selectedKeys.has(`${item.productId}:${item.variationId || ''}`))
      .map((item) => ({ ...item, discountPercent: '' }));
    if (additions.length) append(additions);
  };

  const updateFilter = (update: () => void) => {
    setPickerPage(1);
    update();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (shouldConfirmImmediateActivation(values)) {
      const confirmed = await requestConfirmation({
        title: 'A campanha será ativada agora',
        message: 'O período de vigência já começou. Se confirmar, a campanha ficará ativa imediatamente. Deseja continuar?',
        confirmLabel: 'Confirmar',
        cancelLabel: 'Cancelar',
        type: 'warning',
      });
      if (!confirmed) return;
    }

    saveMutation.mutate(values);
  });

  if (promotionId && isLoadingPromotion) return <div className="p-10 text-center text-sm text-slate-500">Carregando campanha…</div>;
  if (promotionLoadError) return <div className="p-8 text-center text-sm text-red-700">Não foi possível carregar esta campanha. <Link to="/products/campaigns" className="font-bold underline">Voltar à lista</Link></div>;

  return (
    <main className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <form onSubmit={onSubmit} className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/products/campaigns" className="text-xs font-semibold text-blue-600 hover:underline">← Campanhas</Link>
            <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{readOnly ? 'Visualizar campanha' : promotionId ? 'Editar campanha' : 'Nova campanha'}</h1>
            <p className="mt-1 text-sm text-slate-500">Defina a campanha, o período e os produtos participantes.</p>
          </div>
          {readOnly ? <button type="button" onClick={() => navigate('/products/campaigns')} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white">Voltar</button> : null}
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-black text-slate-900 dark:text-white">Informações gerais</h2>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Nome da campanha
                  <input {...register('name')} disabled={readOnly} maxLength={120} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950" placeholder="Ex.: Black Friday 2026" />
                  {errors.name ? <span className="mt-1 block text-xs text-red-600">{errors.name.message}</span> : null}
                </label>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Descrição
                  <textarea {...register('description')} disabled={readOnly} maxLength={3000} rows={2} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-blue-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950" placeholder="Resumo da campanha" />
                </label>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Condições e informações da campanha
                  <textarea {...register('conditions')} disabled={readOnly} maxLength={2000} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-blue-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950" placeholder="Texto informativo para consulta. Não altera as regras de pagamento." />
                  <span className="mt-1 block text-xs font-normal text-slate-400">Este texto é informativo; não restringe automaticamente meios de pagamento.</span>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-black text-slate-900 dark:text-white">Período de vigência</h2>
              <p className="mt-1 text-xs text-slate-500">A campanha começa às 00:00 e termina às 23:59:59 no fuso da loja ({watch('timezoneName')}).</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Data de início
                  <input type="date" {...register('startsOn')} disabled={readOnly} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal dark:border-slate-700 dark:bg-slate-950" />
                  {errors.startsOn ? <span className="mt-1 block text-xs text-red-600">{errors.startsOn.message}</span> : null}
                </label>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Data de término
                  <input type="date" {...register('endsOn')} disabled={readOnly} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal dark:border-slate-700 dark:bg-slate-950" />
                  {errors.endsOn ? <span className="mt-1 block text-xs text-red-600">{errors.endsOn.message}</span> : null}
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-black text-slate-900 dark:text-white">Configuração de descontos</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${discountMode === 'general' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                  <input type="radio" value="general" {...register('discountMode')} disabled={readOnly} className="mt-1 accent-blue-600" />
                  <span><strong className="block text-sm">Desconto geral</strong><small className="text-xs text-slate-500">O mesmo percentual para todos os participantes.</small></span>
                </label>
                <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${discountMode === 'per_variation' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                  <input type="radio" value="per_variation" {...register('discountMode')} disabled={readOnly} className="mt-1 accent-blue-600" />
                  <span><strong className="block text-sm">Desconto por item</strong><small className="text-xs text-slate-500">Informe o percentual em cada item selecionado.</small></span>
                </label>
              </div>
              {discountMode === 'general' ? <label className="mt-4 block max-w-xs text-sm font-semibold text-slate-700 dark:text-slate-200">Desconto da campanha (%)
                <div className="mt-1.5 flex h-11 items-center rounded-xl border border-slate-200 pr-3 dark:border-slate-700"><input type="number" min="0.01" max="100" step="0.01" {...register('generalDiscountPercent')} disabled={readOnly} className="w-full bg-transparent px-3 font-normal outline-none" placeholder="Ex.: 20" /><span className="text-slate-400">%</span></div>
                {errors.generalDiscountPercent ? <span className="mt-1 block text-xs text-red-600">{errors.generalDiscountPercent.message}</span> : null}
              </label> : null}
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-black text-slate-900 dark:text-white">Produtos participantes</h2><p className="mt-1 text-xs text-slate-500">A seleção e os filtros são aplicados no servidor.</p></div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{fields.length} adicionados</span>
            </div>

            {!readOnly ? <div className="mt-4 space-y-3">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><i className="bi bi-search text-slate-400" aria-hidden="true" /><input value={pickerSearch} onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }} onChange={(event) => updateFilter(() => setPickerSearch(event.target.value))} placeholder="Buscar produtos para adicionar" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={categoryId} onChange={(event) => updateFilter(() => setCategoryId(event.target.value))} className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="">Todas as categorias</option>{filterOptions?.categories.map((category: any) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
                <select value={supplierId} onChange={(event) => updateFilter(() => setSupplierId(event.target.value))} className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"><option value="">Todos os fornecedores</option>{filterOptions?.suppliers.map((supplier: any) => <option key={supplier.id} value={supplier.id}>{supplier.social_name || supplier.full_name}</option>)}</select>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs dark:border-slate-800">
                <span className="text-slate-500">{isLoadingPicker ? 'Buscando…' : `${pickerRows?.length || 0} disponíveis nesta página`}</span>
                <button type="button" disabled={!pickerRows?.length || isLoadingPicker} onClick={addCurrentPage} className="font-bold text-blue-600 disabled:opacity-40">Adicionar página</button>
              </div>
              {isPickerError ? <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">Falha ao buscar produtos. <button type="button" onClick={() => void refetchPicker()} className="font-bold underline">Tentar novamente</button></p> : null}
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {(pickerRows || []).map((item) => {
                  const key = `${item.productId}:${item.variationId || ''}`;
                  return <div key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-800 dark:text-slate-100">{item.productName}{item.variationName ? ` · ${item.variationName}` : ''}</strong><small className="block truncate text-[10px] text-slate-500">{item.categoryName || 'Sem categoria'}{item.sku ? ` · SKU ${item.sku}` : item.code ? ` · ${item.code}` : ''}</small></span>
                    <span className="whitespace-nowrap text-[11px] font-bold text-slate-600">{money(item.currentPrice)}</span>
                    <button type="button" onClick={() => addParticipant(item)} className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-800">Adicionar</button>
                  </div>;
                })}
                {!isLoadingPicker && !pickerRows?.length ? <p className="py-5 text-center text-xs text-slate-400">Nenhum produto disponível com esses filtros.</p> : null}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500"><button type="button" disabled={pickerPage <= 1} onClick={() => setPickerPage((page) => page - 1)} className="font-semibold disabled:opacity-40">← Anterior</button><span>Página {pickerPage}</span><button type="button" disabled={!pickerRows || pickerRows.length < PAGE_SIZE} onClick={() => setPickerPage((page) => page + 1)} className="font-semibold disabled:opacity-40">Próxima →</button></div>
            </div> : null}

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Produtos adicionados</h3>
              {!fields.length ? <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500 dark:border-slate-700">Nenhum produto adicionado.</p> : null}
              {fields.map((item, index) => {
                const percent = discountMode === 'general' ? generalPercent : Number(watch(`items.${index}.discountPercent`)) || 0;
                return <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><strong className="block truncate text-xs text-slate-900 dark:text-white">{item.productName}{item.variationName ? ` · ${item.variationName}` : ''}</strong><span className="text-[10px] text-slate-500">{item.sku || item.code || 'Sem SKU'} · Preço cadastrado: {money(item.currentPrice)} · Desconto da campanha: {percent}%</span></div>
                    {!readOnly ? <button type="button" onClick={() => remove(index)} aria-label={`Remover ${item.productName}`} className="text-red-600 hover:text-red-800"><i className="bi bi-trash3" aria-hidden="true" /></button> : null}
                  </div>
                  {discountMode === 'per_variation' && !readOnly ? <label className="mt-3 block text-xs font-semibold text-slate-600 dark:text-slate-300">Desconto da campanha (%)<div className="mt-1 flex h-9 items-center rounded-lg border border-slate-200 px-2 dark:border-slate-700"><input type="number" min="0.01" max="100" step="0.01" {...register(`items.${index}.discountPercent`)} className="w-full bg-transparent outline-none" placeholder="Informe o percentual" /><span className="text-slate-400">%</span></div>{errors.items?.[index]?.discountPercent ? <span className="mt-1 block text-[10px] text-red-600">{errors.items[index]?.discountPercent?.message}</span> : null}</label> : null}
                </div>;
              })}
              {errors.items?.message ? <p className="text-xs text-red-600">{errors.items.message}</p> : null}
            </div>
          </section>
        </section>

        {!readOnly ? <footer className="sticky bottom-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex gap-2"><Link to="/products/campaigns" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancelar</Link>
            <button type="submit" disabled={saveMutation.isPending} onClick={() => setValue('status', 'draft', { shouldValidate: true })} className="rounded-xl border border-blue-200 px-4 py-3 text-sm font-bold text-blue-700 disabled:opacity-50">Salvar rascunho</button>
            <button type="submit" disabled={saveMutation.isPending} onClick={() => setValue('status', 'scheduled', { shouldValidate: true })} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saveMutation.isPending ? 'Salvando…' : 'Programar campanha'}</button>
          </div>
        </footer> : null}
      </form>
    </main>
  );
}
