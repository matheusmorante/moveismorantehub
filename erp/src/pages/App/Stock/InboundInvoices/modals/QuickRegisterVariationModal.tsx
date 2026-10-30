import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { quickRegisterSelectionFormSchema } from '../../../../../../../shared-utils/operationsFormSchemas';
import { getApplicableTechnicalFields, resolveVariableTechnicalFieldNames } from '@/pages/utils/technicalValuesService';
import { fetchTechnicalFieldDefinitions } from '@/pages/App/Products/services/technicalFieldService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { getFullProduct } from '@/pages/utils/productService';
import type Product from '@/pages/types/product.type';
import type { ComboItem, Variation } from '@/pages/types/product.type';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { getCompleteQuickVariationName, hasSiblingVariationName, normalizeNcm } from '../../../../../../../shared-utils/inboundQuickRegisterRules';
import { getDefaultShowNameForVariationOverride } from '../../../../../../../shared-utils/productVariationAttributeDefaults';

export interface QuickRegisterItem {
  readonly productDescription: string;
  readonly productCode?: string;
  readonly unit?: string;
  readonly ncm?: string;
  readonly ean?: string;
  readonly eanTrib?: string;
  readonly cest?: string;
  readonly cfop?: string;
  readonly quantity: number;
  readonly unitCost: number;
  readonly finalCost?: number;
}

export type QuickRegisterMode = 'SIMPLE' | 'EXISTING_PARENT' | 'COMPOSITION';
export type QuickRegisterSelection = {
  readonly mode: QuickRegisterMode;
  readonly name?: string;
  readonly nameSuffix?: string;
  readonly parentProductId?: string;
  readonly parentProductName?: string;
  readonly categoryId?: string;
  readonly ncm?: string;
  readonly costPrice?: number;
  readonly barcode?: string;
  readonly variationFullName?: string;
  readonly existingVariationNames?: string[];
  readonly ncmMismatch?: boolean;
  readonly ncmResolution?: 'variation' | 'update-parent' | 'keep-parent';
  readonly requiredVariableFields?: string[];
  readonly technicalValues?: Record<string, unknown>;
  readonly components?: ComboItem[];
};

export interface QuickRegisterDuplicateCandidate {
  readonly productId: string;
  readonly productName: string;
  readonly variationId?: string;
  readonly variationName?: string;
  readonly reason: 'supplier-code' | 'gtin';
}

type QuickRegisterVariationModalProps = {
  readonly isOpen: boolean;
  readonly item: QuickRegisterItem | null;
  readonly supplierId?: string;
  readonly supplierName?: string;
  readonly duplicateCandidate?: QuickRegisterDuplicateCandidate | null;
  readonly nameMatches?: readonly string[];
  readonly onClose: () => void;
  readonly onConfirmSelection: (selection: QuickRegisterSelection) => Promise<boolean>;
  readonly onReuseDuplicate?: () => Promise<boolean>;
};

type CategoryOption = { id: string; name: string; type?: string; active?: boolean };
type SelectedParent = { id: string; name: string };
type SelectedComponent = ComboItem & { key: string };

const initialSelection = {
  mode: 'SIMPLE' as QuickRegisterMode,
  name: '',
  nameSuffix: '',
  parentName: '',
  variationFullName: '',
  existingVariationNames: [],
  ncmMismatch: false,
  ncm: '',
  costPrice: 0,
  categoryId: '',
  ncmResolution: undefined,
  requiredVariableFields: [],
  technicalValues: {},
  components: [],
};

const quickRegisterFieldClassName = 'w-full rounded-none border-x-0 border-t-0 border-b border-b-slate-300 bg-transparent px-0 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-b-indigo-600 focus:ring-0 dark:border-b-slate-600 dark:text-slate-100';

export function QuickRegisterVariationModal({
  isOpen,
  item,
  supplierId,
  supplierName,
  duplicateCandidate,
  nameMatches = [],
  onClose,
  onConfirmSelection,
  onReuseDuplicate,
}: QuickRegisterVariationModalProps) {
  const [mode, setMode] = useState<QuickRegisterMode>('SIMPLE');
  const [selectedParent, setSelectedParent] = useState<SelectedParent | null>(null);
  const [parentProduct, setParentProduct] = useState<Product | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const ncm = item?.ncm || '';
  const costPrice = item?.finalCost ?? item?.unitCost ?? 0;
  const [nameSuffix, setNameSuffix] = useState('');
  const [ncmResolution, setNcmResolution] = useState<QuickRegisterSelection['ncmResolution']>();
  const [technicalValues, setTechnicalValues] = useState<Record<string, unknown>>({});
  const [technicalDefinitions, setTechnicalDefinitions] = useState<any[]>([]);
  const [technicalLoading, setTechnicalLoading] = useState(false);
  const [components, setComponents] = useState<SelectedComponent[]>([]);
  const [nameMatchesConfirmed, setNameMatchesConfirmed] = useState(false);
  const inFlight = useRef(false);
  const active = useRef(true);
  const context = useRef({ isOpen, item, supplierId });
  if (context.current.isOpen !== isOpen || context.current.item !== item || context.current.supplierId !== supplierId) {
    context.current = { isOpen, item, supplierId };
  }
  const form = useZodForm(quickRegisterSelectionFormSchema, initialSelection);

  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  useEffect(() => {
    if (!isOpen || !item) return;
    const submittedContext = context.current;
    let current = true;
    setMode('SIMPLE');
    setSelectedParent(null);
    setParentProduct(null);
    setName(item.productDescription.trim());
    setNameSuffix('');
    setCategories([]);
    setCategoryId('');
    setNcmResolution(undefined);
    setTechnicalValues({});
    setTechnicalDefinitions([]);
    setComponents([]);
    setNameMatchesConfirmed(false);
    setError('');

    const loadCategories = async () => {
      setCategoryLoading(true);
      try {
        const result = await withTimeout(fetchGroupsAndCategories(), 15000, null, 'entrada:categorias-cadastro-rapido');
        if (!current || !active.current || context.current !== submittedContext) return;
        const options = ((result?.categories || []) as CategoryOption[])
          .filter((category) => category.active !== false && category.type !== 'environment' && Boolean(category.id && category.name));
        setCategories(options);
        if (!options.length) setError('Nenhuma categoria ativa está disponível para seleção.');
      } catch {
        if (current && active.current && context.current === submittedContext) setError('Não foi possível carregar as categorias. Tente novamente.');
      } finally {
        if (current && active.current && context.current === submittedContext) setCategoryLoading(false);
      }
    };
    void loadCategories();
    return () => { current = false; };
  }, [isOpen, item, supplierId]);

  useEffect(() => {
    if (!isOpen || !selectedParent) return;
    let current = true;
    setParentLoading(true);
    setTechnicalLoading(true);
    setParentProduct(null);
    setTechnicalDefinitions([]);
    const loadParent = async () => {
      let parentCategoryIds: string[] = [];
      try {
        const full = await withTimeout(getFullProduct(selectedParent.id), 15000, null, 'entrada:produto-pai');
        if (!full || full.id !== selectedParent.id || full.deleted || full.isVariation || full.active === false || full.itemType !== 'product') {
          throw new Error('Produto pai não encontrado ou indisponível.');
        }
        parentCategoryIds = full.categoryIds ?? [];
        if (current && active.current) setParentProduct(full);
      } catch (failure) {
        if (current && active.current) setError(failure instanceof Error ? failure.message : 'Não foi possível consultar o produto pai.');
      } finally {
        if (current && active.current) setParentLoading(false);
      }
      try {
        const definitions = await withTimeout(fetchTechnicalFieldDefinitions('variation-form', { categoryIds: parentCategoryIds }), 15000, null, 'entrada:caracteristicas-variacao');
        if (definitions && current && active.current) setTechnicalDefinitions(definitions);
      } catch {
        if (current && active.current) setError('Não foi possível carregar as características configuradas no produto pai.');
      } finally {
        if (current && active.current) setTechnicalLoading(false);
      }
    };
    void loadParent();
    return () => { current = false; };
  }, [isOpen, selectedParent]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !inFlight.current) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const variableFieldNames = useMemo(() => parentProduct
    ? resolveVariableTechnicalFieldNames(parentProduct.variableTechnicalFields, parentProduct.variations || [])
    : [], [parentProduct]);
  const applicableTechnicalFields = useMemo(() => parentProduct
    ? getApplicableTechnicalFields(
        technicalDefinitions,
        parentProduct.categoryIds || [],
        parentProduct.technicalValues || {},
        [],
        [parentProduct.category || '']
      )
    : [], [parentProduct, technicalDefinitions]);
  const variationFields = useMemo(() => variableFieldNames.map((fieldName) => {
    const definition = technicalDefinitions.find((field) => field.name.toLocaleLowerCase('pt-BR') === fieldName.toLocaleLowerCase('pt-BR'));
    const applicable = applicableTechnicalFields.find((field) => field.name.toLocaleLowerCase('pt-BR') === fieldName.toLocaleLowerCase('pt-BR'));
    return { name: fieldName, definition, required: Boolean(applicable?.isRequired || definition?.isRequired) };
  }), [variableFieldNames, technicalDefinitions, applicableTechnicalFields]);
  const requiredVariableFields = useMemo(() => variationFields.filter((field) => field.required).map((field) => field.name), [variationFields]);
  const completeVariationName = parentProduct ? getCompleteQuickVariationName(parentProduct.name || parentProduct.description || '', nameSuffix) : '';
  const variationNameDuplicate = Boolean(parentProduct && hasSiblingVariationName(parentProduct.variations || [], parentProduct.name || parentProduct.description || '', completeVariationName));
  const ncmMismatch = Boolean(ncm && normalizeNcm(parentProduct?.fiscal?.ncm) !== normalizeNcm(ncm));
  const normalizedSupplierId = supplierId?.trim();
  const supplierMatches = Boolean(parentProduct && normalizedSupplierId && ((parentProduct.supplierIds || []).includes(normalizedSupplierId) || (parentProduct.mainSupplierId || parentProduct.supplierId) === normalizedSupplierId));

  if (!isOpen || !item) return null;

  const componentPayload = (): ComboItem[] => components.map(({ key: _key, ...component }) => ({ ...component }));
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    const submittedContext = context.current;
    setBusy(true);
    setError('');
    const selected = mode === 'EXISTING_PARENT'
      ? {
          ...initialSelection,
          mode,
          parentProductId: selectedParent?.id || '',
          parentName: parentProduct?.name || parentProduct?.description || '',
          nameSuffix,
          variationFullName: completeVariationName,
          existingVariationNames: parentProduct?.variations?.map((variation) => variation.name || '') || [],
          ncmMismatch,
          ncm,
          ncmResolution,
          nameMatchCount: nameMatches.length,
          duplicateNameConfirmed: nameMatchesConfirmed,
          costPrice: item.finalCost ?? item.unitCost,
          requiredVariableFields,
          technicalValues,
        }
      : {
          ...initialSelection,
          mode,
          name,
          categoryId,
          ncm,
          costPrice,
          components: mode === 'COMPOSITION' ? componentPayload() : [],
          nameMatchCount: nameMatches.length,
          duplicateNameConfirmed: nameMatchesConfirmed,
        };

    try {
      await form.validateAndRun(selected, async (values) => {
        if (!active.current || submittedContext !== context.current) return;
        if (duplicateCandidate) throw new Error('Reutilize o cadastro encontrado ou atualize o vínculo antes de criar outro.');
        if (values.mode === 'EXISTING_PARENT' && !supplierMatches) throw new Error('O produto pai não pertence ao fornecedor da nota. Escolha outro produto.');
        if (values.mode === 'EXISTING_PARENT' && variationNameDuplicate) throw new Error('O nome completo desta variação já existe no produto pai.');
        if (values.mode === 'EXISTING_PARENT' && technicalLoading) throw new Error('Aguarde o carregamento das características do produto pai.');
        const selection = values as unknown as QuickRegisterSelection;
        if (!await onConfirmSelection(selection)) throw new Error('Não foi possível confirmar o cadastro e o vínculo. Confira a nota antes de repetir.');
      }, (errors) => {
        if (active.current && submittedContext === context.current) setError(Object.values(flattenFormErrors(errors))[0] || 'Confira os campos.');
      });
    } catch (failure) {
      if (active.current && context.current === submittedContext) setError(failure instanceof Error ? failure.message : 'Erro ao cadastrar o produto.');
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  };

  const updateTechnicalValue = (fieldName: string, value: unknown) => setTechnicalValues((current) => ({ ...current, [fieldName]: value }));
  const handleAddComponent = (product: Product, variation?: Variation) => {
    const productId = String(product.id || '');
    if (!productId) return;
    const variationId = variation?.id;
    if (components.some((component) => component.productId === productId && component.variationId === variationId)) {
      setError('Este componente já foi adicionado. Ajuste a quantidade na linha existente.');
      return;
    }
    const component: SelectedComponent = {
      key: crypto.randomUUID(),
      productId,
      variationId,
      description: variation?.name || product.name || product.title || 'Produto',
      unitPrice: Number(variation?.unitPrice ?? product.unitPrice ?? 0),
      stock: Number(variation?.stock ?? product.stock ?? 0),
      quantity: 1,
    };
    setComponents((current) => [...current, component]);
  };

  const renderCategoryFields = () => (
    <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">Dados do produto</h4>
        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Pré-preenchido pela NF-e</span>
      </div>
      <label className="block space-y-1 text-xs font-bold text-slate-700 dark:text-slate-300">
        Nome do produto <span className="text-rose-600">*</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className={`${quickRegisterFieldClassName} font-medium`} />
      </label>
      <p className="text-[11px] text-slate-500">Fornecedor: {supplierName || 'fornecedor vinculado à NF-e'} · Unidade: {item.unit || 'UN'} · GTIN: {item.ean || item.eanTrib || 'não informado'} · Preço de venda e fotos podem ser definidos depois.</p>
      <div className="space-y-2">
        <label htmlFor="quick-register-category" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Categoria <span className="text-rose-600">*</span></label>
        <select id="quick-register-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={categoryLoading} className={quickRegisterFieldClassName}>
          <option value="">Selecione uma categoria</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        {categoryLoading && <p role="status" className="text-[11px] text-indigo-600">Carregando categorias...</p>}
      </div>
    </section>
  );

  return (
    <div className="fixed inset-0 z-[1000005] flex items-center justify-center p-3 backdrop-blur-xs animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="quick-register-title">
      <button type="button" aria-label="Fechar cadastro rápido" onClick={onClose} disabled={busy} className="absolute inset-0 h-full w-full cursor-default border-0 bg-slate-950/60 p-0" />
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div>
            <h3 id="quick-register-title" className="text-sm font-black text-slate-800 dark:text-slate-100">Cadastro rápido</h3>
            <p className="text-xs text-slate-500">NF-e de entrada · Item {item.productCode || 'selecionado'}</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} disabled={busy} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><i className="bi bi-x-lg" aria-hidden="true" /></button>
        </header>
        <FormProvider {...form}>
          <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" aria-busy={busy}>
            <div className="min-h-0 space-y-4 overflow-y-auto p-5">
              {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
              {busy && <p role="status" className="flex items-center gap-2 text-sm text-indigo-600"><i className="bi bi-arrow-repeat animate-spin" aria-hidden="true" />Cadastrando o produto e confirmando o vínculo...</p>}
              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Produto da nota fiscal</p>
                <h4 className="mt-1 font-bold text-slate-800 dark:text-slate-100">{item.productDescription}</h4>
                <p className="mt-1 text-xs text-slate-500">{supplierName || 'Fornecedor da NF-e'} · NCM {item.ncm || 'não informado'} · Unidade {item.unit || 'UN'}</p>
              </section>
              {duplicateCandidate && (
                <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="text-xs font-black text-amber-900 dark:text-amber-200">Cadastro correspondente encontrado</p>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">{duplicateCandidate.variationName || duplicateCandidate.productName} · correspondente por {duplicateCandidate.reason === 'supplier-code' ? 'código do fornecedor' : 'GTIN'}.</p>
                  <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">A criação de outro cadastro com este identificador foi bloqueada. Você pode reutilizar o cadastro encontrado.</p>
                  {onReuseDuplicate && <button type="button" disabled={busy} onClick={async () => { if (inFlight.current) return; inFlight.current = true; setBusy(true); setError(''); try { if (!await onReuseDuplicate()) setError('Não foi possível confirmar o vínculo com o cadastro localizado.'); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível reutilizar o cadastro.'); } finally { inFlight.current = false; setBusy(false); } }} className="mt-3 rounded-xl bg-amber-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Reutilizar e vincular</button>}
                </section>
              )}
              {nameMatches.length > 0 && (
                <section className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="text-xs font-black text-amber-900 dark:text-amber-200">Confira possíveis cadastros semelhantes</p>
                  <ul className="list-disc space-y-1 pl-5 text-[11px] text-amber-900 dark:text-amber-200">{nameMatches.map((match) => <li key={match}>{match}</li>)}</ul>
                  <label className="flex items-start gap-2 text-[11px] text-amber-950 dark:text-amber-100"><input type="checkbox" checked={nameMatchesConfirmed} onChange={(event) => setNameMatchesConfirmed(event.target.checked)} className="mt-0.5" />Revisei os cadastros localizados e confirmo que devo criar um novo produto.</label>
                </section>
              )}
              <fieldset disabled={busy || Boolean(duplicateCandidate)} className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Como deseja cadastrar?</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => setMode('SIMPLE')} aria-pressed={mode === 'SIMPLE'} className={`rounded-2xl border p-3 text-left transition-colors ${mode === 'SIMPLE' ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                      <span className="block text-xs font-black">Produto simples</span><span className="mt-1 block text-[10px]">Produto independente, com uma variação.</span>
                    </button>
                    <button type="button" onClick={() => setMode('EXISTING_PARENT')} aria-pressed={mode === 'EXISTING_PARENT'} className={`rounded-2xl border p-3 text-left transition-colors ${mode === 'EXISTING_PARENT' ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                      <span className="block text-xs font-black">Variação de produto existente</span><span className="mt-1 block text-[10px]">Herda os dados globais do produto pai.</span>
                    </button>
                    <button type="button" onClick={() => setMode('COMPOSITION')} aria-pressed={mode === 'COMPOSITION'} className={`rounded-2xl border p-3 text-left transition-colors ${mode === 'COMPOSITION' ? 'border-indigo-600 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
                      <span className="block text-xs font-black">Produto composto</span><span className="mt-1 block text-[10px]">Selecione os componentes e suas quantidades.</span>
                    </button>
                  </div>
                </div>

                {(mode === 'SIMPLE' || mode === 'COMPOSITION') && renderCategoryFields()}

                {mode === 'EXISTING_PARENT' && (
                  <section className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Produto pai <span className="text-rose-600">*</span></label>
                      <ProductAutocomplete disabled={busy} supplierId={supplierId} parentsOnly value={selectedParent?.name || ''} isSelected={Boolean(selectedParent)} placeholder="Digite 2 ou mais letras para buscar o produto pai..." onChange={() => { setSelectedParent(null); setParentProduct(null); setNameSuffix(''); setTechnicalValues({}); setNcmResolution(undefined); }} onSelect={(product) => {
                        const id = String(product.id || '').trim();
                        const parentName = product.name || product.title || '';
                        const description = item.productDescription.trim();
                        const suffix = description.toLocaleLowerCase('pt-BR').startsWith(parentName.toLocaleLowerCase('pt-BR'))
                          ? description.slice(parentName.length).replace(/^[\s\-_:]+/u, '').trim()
                          : description;
                        setSelectedParent(id ? { id, name: parentName } : null);
                        setNameSuffix(suffix); setTechnicalValues({}); setNcmResolution(undefined); setError('');
                      }} />
                      {parentLoading && <p role="status" className="text-[11px] text-indigo-600">Carregando dados herdados do produto pai...</p>}
                      {parentProduct && !supplierMatches && <p role="alert" className="text-[11px] text-rose-700">O produto pai não está associado ao fornecedor desta NF-e.</p>}
                    </div>
                    {parentProduct && (
                      <>
                        <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                          <p className="font-bold text-slate-700 dark:text-slate-200">Dados globais herdados</p>
                          <p className="mt-1 text-slate-500">Categoria: {parentProduct.category || 'do produto pai'} · Marca e modelo: {parentProduct.brand || '—'} / {parentProduct.model || '—'} · NCM: {parentProduct.fiscal?.ncm || 'não informado'}</p>
                        </div>
                        <label className="block space-y-1 text-xs font-bold text-slate-700 dark:text-slate-300">Complemento do nome <span className="text-rose-600">*</span>
                          <input value={nameSuffix} onChange={(event) => setNameSuffix(event.target.value)} placeholder="Ex.: Branco, 120 cm" className={quickRegisterFieldClassName} />
                        </label>
                        <p className="text-xs text-slate-600 dark:text-slate-300">Nome completo sugerido: <strong>{completeVariationName || '—'}</strong></p>
                        {variationNameDuplicate && <p role="alert" className="text-xs text-rose-700">Esse nome completo já existe entre as variações do produto pai.</p>}
                        <p className="text-[11px] text-slate-500">GTIN: {item.ean || item.eanTrib || 'não informado'} · As características variáveis usam apenas os campos configurados no produto pai.</p>
                        {technicalLoading ? <p role="status" className="text-[11px] text-indigo-600">Carregando características configuradas...</p> : variationFields.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Características da variação</p>
                            {variationFields.map(({ name: fieldName, definition, required }) => (
                              <label key={fieldName} className="block space-y-1 text-xs font-bold text-slate-700 dark:text-slate-300">{fieldName}{required && <span className="ml-1 text-rose-600">*</span>}
                                {definition?.options?.length ? <select value={String(technicalValues[fieldName] || '')} onChange={(event) => updateTechnicalValue(fieldName, event.target.value)} className={quickRegisterFieldClassName}><option value="">Selecione</option>{definition.options.map((option: { id: string; value: string }) => <option key={option.id} value={option.value}>{option.value}</option>)}</select> : <input type={['integer', 'decimal', 'number', 'measure', 'weight', 'percentage'].includes(definition?.dataType || '') ? 'number' : 'text'} value={String(technicalValues[fieldName] || '')} onChange={(event) => updateTechnicalValue(fieldName, event.target.value)} className={quickRegisterFieldClassName} />}
                              </label>
                            ))}
                          </div>
                        )}
                        {ncmMismatch && (
                          <fieldset className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                            <legend className="px-1 text-xs font-black text-amber-900 dark:text-amber-200">NCM diferente do produto pai</legend>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300">NF-e: {ncm} · Produto pai: {parentProduct.fiscal?.ncm || 'não informado'}</p>
                            {([
                              ['variation', 'Usar o NCM da NF-e apenas nesta variação'],
                              ['update-parent', 'Usar o NCM da NF-e e atualizar o produto pai'],
                              ['keep-parent', 'Manter o NCM do produto pai'],
                            ] as const).map(([value, label]) => <label key={value} className="flex items-start gap-2 text-[11px] text-amber-950 dark:text-amber-100"><input type="radio" name="quick-register-ncm-resolution" checked={ncmResolution === value} onChange={() => setNcmResolution(value)} className="mt-0.5" />{label}</label>)}
                          </fieldset>
                        )}
                      </>
                    )}
                  </section>
                )}

                {mode === 'COMPOSITION' && (
                  <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <h4 className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">Componentes do produto composto <span className="text-rose-600">*</span></h4>
                    <p className="text-[11px] text-slate-500">Use para kits ou conjuntos de peças cadastradas separadamente. Escolha cada peça e quantidade manualmente, mesmo se a NF-e trouxer o conjunto em uma só linha; no pedido de venda, o ERP inclui automaticamente esses componentes.</p>
                    <ProductAutocomplete disabled={busy} supplierId={supplierId} variationsOnly value="" placeholder="Buscar produto ou variação componente..." onSelect={handleAddComponent} onChange={() => {}} />
                    {components.map((component) => (
                      <div key={component.key} className="grid grid-cols-[1fr_90px_auto] items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{component.description}</span>
                        <label className="text-[10px] font-bold text-slate-500">Quantidade<input type="number" min="1" value={component.quantity} onChange={(event) => setComponents((current) => current.map((row) => row.key === component.key ? { ...row, quantity: Number(event.target.value) } : row))} className={`mt-1 ${quickRegisterFieldClassName} px-0 py-1`} /></label>
                        <button type="button" aria-label={`Remover ${component.description}`} onClick={() => setComponents((current) => current.filter((row) => row.key !== component.key))} className="rounded-lg px-2 py-1 text-rose-600 hover:bg-rose-50">Remover</button>
                      </div>
                    ))}
                    {components.length < 2 && <p className="text-xs text-slate-500">Selecione pelo menos dois componentes distintos.</p>}
                  </section>
                )}
              </fieldset>
            </div>
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button type="submit" disabled={busy || Boolean(duplicateCandidate) || categoryLoading || (mode === 'EXISTING_PARENT' && (parentLoading || technicalLoading))} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50"><i className="bi bi-check-lg" aria-hidden="true" />Cadastrar e vincular</button>
            </footer>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

export default QuickRegisterVariationModal;
