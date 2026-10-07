import React from 'react';

interface LabelGridModelElementOption {
  id: string;
  label: React.ReactNode;
  icon: string;
  hidden: boolean;
}

interface LabelGridModelElementSelectorProps {
  currentCategory?: 'identificacao' | 'precos' | 'logos' | 'posts' | null;
  isPromoPreview: boolean;
  extraFields: any[];
  extraFieldsPromo: any[];
  selectedElement: string | null;
  onSelectElement: (elementId: string) => void;
}

export const LabelGridModelElementSelector = ({
  currentCategory,
  isPromoPreview,
  extraFields,
  extraFieldsPromo,
  selectedElement,
  onSelectElement,
}: LabelGridModelElementSelectorProps) => {
  const items: LabelGridModelElementOption[] = [
    { id: 'name', label: 'Produto', icon: 'bi-type-h1', hidden: false },
    {
      id: 'mainPrice',
      label: 'Preço Principal',
      icon: 'bi-currency-dollar',
      hidden: false,
    },
    {
      id: 'oldPrice',
      label: 'Preço Antigo',
      icon: 'bi-type-strikethrough',
      hidden: !isPromoPreview,
    },
    {
      id: 'priceSymbol',
      label: 'Símbolo R$',
      icon: 'bi-coin',
      hidden: currentCategory !== 'precos',
    },
    {
      id: 'priceDecimals',
      label: 'Centavos',
      icon: 'bi-percent',
      hidden: currentCategory !== 'precos',
    },
    ...(currentCategory !== 'precos'
      ? [{ id: 'barcode', label: 'Código Barras', icon: 'bi-barcode', hidden: false }]
      : []),
    ...(isPromoPreview ? extraFieldsPromo || [] : extraFields || []).map((field) => ({
      id: field.id,
      label: field.text,
      icon: 'bi-fonts',
      hidden: false,
    })),
  ].filter((item) => !item.hidden);

  return (
    <div className="w-full max-w-4xl flex items-center gap-2 overflow-x-auto pb-4 px-2 no-scrollbar shrink-0">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectElement(item.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl whitespace-nowrap text-[9px] font-black uppercase transition-all shadow-sm shrink-0 ${selectedElement === item.id ? 'bg-blue-600 text-white translate-y-[-2px] shadow-blue-500/30' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100'}`}
        >
          <i className={item.icon} /> {item.label}
        </button>
      ))}
    </div>
  );
};
