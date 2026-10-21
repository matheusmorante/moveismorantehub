import type { VariationTabId } from '../../hooks/variation/variationForm.types';

export interface TabDefinition {
  readonly id: VariationTabId;
  readonly label: string;
  readonly icon: string;
}

export const INHERITED_DATA_TABS: readonly VariationTabId[] = [
  'tecnico',
  'descricao',
  'estoque',
  'compostos',
];

export const getVariationFormTabs = (
  isComposition: boolean,
  isStockistOnly: boolean
): readonly TabDefinition[] => {
  const tabs: TabDefinition[] = [
    { id: 'identificacao', label: 'Informações Básicas', icon: 'bi-info-circle' },
    ...(!isStockistOnly
      ? [
          { id: 'fotos' as const, label: 'Fotos vinculadas', icon: 'bi-images' },
          { id: 'tecnico' as const, label: 'Características específicas', icon: 'bi-gear' },
          { id: 'descricao' as const, label: 'Descrição', icon: 'bi-file-text' },
        ]
      : []),
  ];

  tabs.push({ id: 'estoque', label: 'Precificação', icon: 'bi-tag' });

  if (isComposition) {
    tabs.push({ id: 'compostos', label: 'Produtos Componentes', icon: 'bi-diagram-3' });
  }

  return tabs;
};
