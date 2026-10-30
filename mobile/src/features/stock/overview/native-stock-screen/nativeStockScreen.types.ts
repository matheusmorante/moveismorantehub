import type { ComponentType } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  ClipboardList,
  FileText,
  PackageCheck,
  PackageX,
  ShoppingBag,
  Users,
} from 'lucide-react-native';
import stockGuide from '../../../../../../shared-utils/stockGuide.json';

export interface StockModuleItem {
  key: string;
  title: string;
  description: string;
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

export const STOCK_MODULES: StockModuleItem[] = [
  {
    key: 'moves',
    title: 'Movimentações',
    description: 'Entradas, saídas e ajustes',
    Icon: ArrowLeftRight,
  },
  {
    key: 'inventory',
    title: 'Inventário',
    description: 'Contagem e conferência dos produtos',
    Icon: ClipboardList,
  },
  {
    key: 'purchases',
    title: 'Pedidos de Compra',
    description: 'Acompanhe pedidos feitos a fornecedores',
    Icon: ShoppingBag,
  },
  {
    key: 'invoices',
    title: 'NF Entrada',
    description: 'Notas fiscais recebidas',
    Icon: FileText,
  },
  {
    key: 'receipts',
    title: 'Recebimentos',
    description: 'Conferência de mercadorias recebidas',
    Icon: PackageCheck,
  },
  {
    key: 'suppliers',
    title: 'Fornecedores',
    description: 'Cadastros e histórico de compras',
    Icon: Users,
  },
  {
    key: 'unavailabilities',
    title: 'Indisponíveis',
    description: 'Produtos temporariamente indisponíveis',
    Icon: PackageX,
  },
  {
    key: 'guide',
    title: stockGuide.title,
    description: 'Passo a passo para operar o estoque (PDF)',
    Icon: BookOpen,
  },
];
