import type { MobileCategory } from '../../services/mobileCategoryService';

const FIXED_ENVIRONMENTS = [
  'SALA DE JANTAR',
  'SALA DE ESTAR',
  'COZINHA',
  'QUARTO',
  'LAVANDERIA',
  'BANHEIRO',
  'LAVANDEIRA',
  'ESCRITORIO',
  'ESCRITÓRIO',
  'VARANDA',
  'ÁREA GOURMET',
  'GARAGEM',
];

export const filterProductFormCategories = (categories: MobileCategory[]) =>
  categories.filter((cat) => {
    const name = cat.name?.trim().toUpperCase() || '';
    const isFixed = FIXED_ENVIRONMENTS.includes(name);
    const hasChildren = categories.some((other) => other.parents?.includes(cat.id));
    const isEnvironment =
      isFixed ||
      (hasChildren && (!cat.parents || cat.parents.length === 0)) ||
      !cat.parents ||
      cat.parents.length === 0;
    return !isEnvironment;
  });
