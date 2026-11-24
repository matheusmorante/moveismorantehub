import { FileText, Images, Info, Network, Package, Settings } from 'lucide-react-native';

export type VariationTabId =
  | 'identificacao'
  | 'tecnico'
  | 'descricao'
  | 'fotos'
  | 'compostos'
  | 'estoque';

type VariationTab = {
  id: VariationTabId;
  label: string;
  Icon: typeof Info | typeof Images | typeof Settings | typeof FileText | typeof Package | typeof Network;
};

export const getMobileProductVariationTabs = (
  isComposition: boolean,
  isStockistOnly: boolean
): VariationTab[] => [
  { id: 'identificacao', label: 'Informações Básicas', Icon: Info },
  ...(!isStockistOnly ? [{ id: 'fotos', label: 'Fotos vinculadas', Icon: Images }] : []),
  ...(!isStockistOnly ? [{ id: 'tecnico', label: 'Características', Icon: Settings }] : []),
  ...(!isStockistOnly ? [{ id: 'descricao', label: 'Descrição', Icon: FileText }] : []),
  { id: 'estoque', label: 'Estoque e Precificação', Icon: Package },
  ...(isComposition ? [{ id: 'compostos', label: 'Produtos Componentes', Icon: Network }] : []),
];
