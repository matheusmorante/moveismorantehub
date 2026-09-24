export interface EnvironmentNode {
  id: string;
  name: string;
  slug?: string;
  categories?: string[];
  categoryCount?: number;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug?: string;
  parents?: string[];
  productCount?: number;
}

export type ModalType = 'ambiente' | 'categoria';
export type ActiveViewType = 'ambiente' | 'categoria';
export type CategoryFilterType = 'todas' | 'com_ambiente' | 'sem_ambiente';

export interface EditingNode {
  id: string;
  type: ModalType;
}
