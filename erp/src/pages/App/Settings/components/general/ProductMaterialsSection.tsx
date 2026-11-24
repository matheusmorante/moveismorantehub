import React, { useEffect, useState } from 'react';
import type { z } from 'zod';
import { toast } from 'react-toastify';
import { ZodForm } from '@/components/forms/ZodForm';
import { requestConfirmation } from '@/components/shared/confirmationService';
import {
  createCatalogMaterial,
  createCatalogType,
  deleteCatalogMaterialIfUnused,
  deleteCatalogTypeIfUnused,
  fetchProductCatalogConfig,
  getCatalogConfigErrorMessage,
  type ProductCatalogItem,
} from '@/services/products/productCatalogConfigService';
import { catalogNameFormSchema } from '../../../../../../../shared-utils/catalogFormSchemas';

interface CatalogSectionBlockProps {
  sectionId: string;
  title: string;
  subtitle: string;
  iconClass: string;
  accentTheme: 'blue' | 'emerald';
  placeholder: string;
  emptyText: string;
  value: string;
  submitting: boolean;
  fetching: boolean;
  items: ProductCatalogItem[];
  onChangeValue: (value: string) => void;
  onValidSubmit: (values: z.output<typeof catalogNameFormSchema>) => Promise<void>;
  onDelete: (item: ProductCatalogItem) => Promise<void>;
}

function CatalogSectionBlock({
  sectionId,
  title,
  subtitle,
  iconClass,
  accentTheme,
  placeholder,
  emptyText,
  value,
  submitting,
  fetching,
  items,
  onChangeValue,
  onValidSubmit,
  onDelete,
}: CatalogSectionBlockProps) {
  const isBlue = accentTheme === 'blue';
  const iconBadgeClass = isBlue
    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600';
  const inputFocusClass = isBlue ? 'focus:ring-blue-500/20' : 'focus:ring-emerald-500/20';
  const submitButtonClass = isBlue
    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20';
  const cardHoverClass = isBlue
    ? 'hover:border-blue-200 dark:hover:border-blue-900/30'
    : 'hover:border-emerald-200 dark:hover:border-emerald-900/30';

  return (
    <div className="flex flex-col gap-8 first:pt-0 pt-12">
      <div id={sectionId} className="scroll-mt-40">
        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-widest flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${iconBadgeClass} flex items-center justify-center`}>
            <i className={iconClass}></i>
          </div>
          {title}
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">{subtitle}</p>
      </div>

      <ZodForm
        schema={catalogNameFormSchema}
        values={{ name: value }}
        onValid={onValidSubmit}
        className="flex gap-3 max-w-xl"
      >
        <input
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold uppercase focus:ring-2 ${inputFocusClass} transition-all shadow-sm`}
        />
        <button
          type="submit"
          disabled={submitting}
          className={`px-8 py-4 ${submitButtonClass} text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg disabled:opacity-50`}
        >
          {submitting ? '...' : 'Adicionar'}
        </button>
      </ZodForm>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.length === 0 && !fetching && (
          <div className="col-span-full py-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
            {emptyText}
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem] group ${cardHoverClass} transition-all`}
          >
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
              {item.name}
            </span>
            <button
              type="button"
              onClick={() => void onDelete(item)}
              aria-label={`Remover ${item.name}`}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
            >
              <i className="bi bi-trash text-lg"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductCatalogConfigSection() {
  const [materials, setMaterials] = useState<ProductCatalogItem[]>([]);
  const [productTypes, setProductTypes] = useState<ProductCatalogItem[]>([]);
  const [newMaterial, setNewMaterial] = useState('');
  const [newType, setNewType] = useState('');
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [loadingType, setLoadingType] = useState(false);
  const [fetching, setFetching] = useState(false);

  const loadConfig = async () => {
    setFetching(true);
    try {
      const data = await fetchProductCatalogConfig();
      setMaterials(data.materials);
      setProductTypes(data.productTypes);
    } catch (err) {
      console.error('Erro ao carregar configurações de catálogo:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const handleAddMaterial = async ({ name }: z.output<typeof catalogNameFormSchema>) => {
    const value = name.trim().toUpperCase();
    if (!value) return;
    setLoadingMaterial(true);
    try {
      await createCatalogMaterial(value);
      setNewMaterial('');
      toast.success('Material adicionado!');
      await loadConfig();
    } catch (error) {
      toast.error(getCatalogConfigErrorMessage(error, 'Erro ao adicionar material.'));
    } finally {
      setLoadingMaterial(false);
    }
  };

  const handleAddType = async ({ name }: z.output<typeof catalogNameFormSchema>) => {
    const value = name.trim().toUpperCase();
    if (!value) return;
    setLoadingType(true);
    try {
      await createCatalogType(value);
      setNewType('');
      toast.success('Categoria adicionada!');
      await loadConfig();
    } catch (error) {
      toast.error(getCatalogConfigErrorMessage(error, 'Erro ao adicionar categoria.'));
    } finally {
      setLoadingType(false);
    }
  };

  const handleDeleteMaterial = async (item: ProductCatalogItem) => {
    if (
      !(await requestConfirmation({
        title: 'Remover material?',
        message: `Remover material "${item.name}"?`,
        confirmLabel: 'Remover material',
        type: 'danger',
      }))
    ) {
      return;
    }
    try {
      const outcome = await deleteCatalogMaterialIfUnused(item);
      if (!outcome.deleted) {
        toast.error(`Não é possível remover: Uso detectado em ${outcome.linkedProductCount} produtos.`);
        return;
      }
      toast.success('Material removido com sucesso!');
      await loadConfig();
    } catch (error) {
      console.error('Erro ao remover material:', error);
      toast.error('Erro ao remover material.');
    }
  };

  const handleDeleteType = async (item: ProductCatalogItem) => {
    if (
      !(await requestConfirmation({
        title: 'Remover categoria?',
        message: `Remover categoria "${item.name}"?`,
        confirmLabel: 'Remover categoria',
        type: 'danger',
      }))
    ) {
      return;
    }
    try {
      const outcome = await deleteCatalogTypeIfUnused(item);
      if (!outcome.deleted) {
        toast.error(
          `Não é possível remover: Esta categoria está vinculada a ${outcome.linkedProductCount} produtos.`
        );
        return;
      }
      toast.success('Categoria removida com sucesso!');
      await loadConfig();
    } catch (error) {
      console.error('Erro ao remover categoria:', error);
      toast.error('Erro ao remover categoria.');
    }
  };

  return (
    <div className="p-8 flex flex-col gap-12 divide-y divide-slate-100 dark:divide-slate-800">
      <CatalogSectionBlock
        sectionId="materiais"
        title="Materiais de Móveis"
        subtitle="Gerencie a lista de materiais disponíveis para os móveis físicos."
        iconClass="bi bi-hammer"
        accentTheme="blue"
        placeholder="EX: MDP, MADEIRA MACIÇA, VIDRO..."
        emptyText="Nenhum material cadastrado."
        value={newMaterial}
        submitting={loadingMaterial}
        fetching={fetching}
        items={materials}
        onChangeValue={setNewMaterial}
        onValidSubmit={handleAddMaterial}
        onDelete={handleDeleteMaterial}
      />

      <CatalogSectionBlock
        sectionId="tipos-moveis"
        title="Categorias (Base do Título)"
        subtitle="Gerencie as categorias básicas usadas para compor a primeira parte do título automático dos produtos."
        iconClass="bi bi-ui-checks-grid"
        accentTheme="emerald"
        placeholder="EX: BALCÃO DE PIA, GUARDA ROUPAS, COZINHA..."
        emptyText="Nenhuma categoria cadastrada."
        value={newType}
        submitting={loadingType}
        fetching={fetching}
        items={productTypes}
        onChangeValue={setNewType}
        onValidSubmit={handleAddType}
        onDelete={handleDeleteType}
      />
    </div>
  );
}
