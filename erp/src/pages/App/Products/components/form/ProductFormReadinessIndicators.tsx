import React from 'react';
import Product from '../../../../types/product.type';
import { checkERPLegibility } from '../../domain/productLegibilityRules';
import { getProductKind } from '@/pages/utils/productKindRules';

interface ProductFormReadinessIndicatorsProps {
  readonly formData: Partial<Product>;
  readonly ecomStatus: { isLegible: boolean; checks: Record<string, boolean> };
  readonly isService: boolean;
  readonly isStockistOnly?: boolean;
  readonly navigateToRequirementField: (fieldKey: string) => void;
}

export const ProductFormReadinessIndicators: React.FC<ProductFormReadinessIndicatorsProps> = ({
  formData,
  ecomStatus,
  isService,
  isStockistOnly = false,
  navigateToRequirementField,
}) => {
  const erpStatus = checkERPLegibility(formData);
  const isSalvado = getProductKind(formData) === 'salvado';
  const hasVariationPhotos = Boolean(
    formData.variations?.length &&
      formData.variations.every((v) => {
        const imgs = Array.isArray(v.images)
          ? v.images.filter(Boolean)
          : typeof (v as any).image_url === 'string' && (v as any).image_url.trim()
            ? (v as any).image_url.split(',').filter(Boolean)
            : [];
        return imgs.length > 0;
      })
  );

  return (
    <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:flex-row sm:items-center">
      {/* Pílula de Requisitos do ERP */}
      {!isSalvado && (
        <div className="relative group cursor-help">
          <div
            className={`flex items-center gap-1.5 h-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${erpStatus.isLegible ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-955/20 dark:text-blue-400 dark:border-blue-900/30' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-900/30'}`}
          >
            <span>ERP: {erpStatus.isLegible ? 'Ativo' : 'Pendente'}</span>
          </div>

          <div className="absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] sm:max-w-none bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Requisitos do ERP (Cadastro / Ativação)
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mb-3">
              💡 Clique em qualquer item pendente para ir direto ao campo.
            </p>
            <ul className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              <li
                onClick={() => navigateToRequirementField('name')}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <i
                    className={`bi ${erpStatus.checks.description ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}
                  ></i>
                  <span
                    className={
                      erpStatus.checks.description
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 font-bold'
                    }
                  >
                    Nome do Produto (Mínimo 2 letras)
                  </span>
                </div>
                <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
              </li>
              <li
                onClick={() => navigateToRequirementField('unitPrice')}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <i
                    className={`bi ${erpStatus.checks.unitPrice ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}
                  ></i>
                  <span
                    className={
                      erpStatus.checks.unitPrice
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 font-bold'
                    }
                  >
                    Preço de Venda &gt; R$ 0 (ou Variações)
                  </span>
                </div>
                <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
              </li>
              <li
                onClick={() => navigateToRequirementField('categoryIds')}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <i
                    className={`bi ${erpStatus.checks.categories ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}
                  ></i>
                  <span
                    className={
                      erpStatus.checks.categories
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 font-bold'
                    }
                  >
                    Pelo menos 1 Categoria
                  </span>
                </div>
                <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
              </li>
              <li
                onClick={() => navigateToRequirementField('mainSupplierId')}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <i
                    className={`bi ${erpStatus.checks.supplier ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}
                  ></i>
                  <span
                    className={
                      erpStatus.checks.supplier
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 font-bold'
                    }
                  >
                    {formData.merchandiseOrigin === 'own_production' ||
                    formData.isOwnProduction === true ||
                    formData.fiscal?.merchandiseOrigin === 'own_production'
                      ? 'Fabricação Própria (Dispensado)'
                      : 'Pelo menos 1 Fornecedor'}
                  </span>
                </div>
                <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
              </li>
              <li
                onClick={() => navigateToRequirementField('productKind')}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <i
                    className={`bi ${erpStatus.checks.origin ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}
                  ></i>
                  <span
                    className={
                      erpStatus.checks.origin
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 font-bold'
                    }
                  >
                    Origem do Estoque Convencional
                  </span>
                </div>
                <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
              </li>
              <li
                onClick={() => navigateToRequirementField('variations')}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <i
                    className={`bi ${hasVariationPhotos ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}
                  ></i>
                  <span
                    className={
                      hasVariationPhotos
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 font-bold'
                    }
                  >
                    Fotos das Variações (mín. 1 vinculada por variação)
                  </span>
                </div>
                <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Estoquista não edita fotos; os requisitos do catálogo incluem a foto principal. */}
      {!isStockistOnly && (
        <div className="relative group cursor-help">
        <div
          className={`flex items-center gap-1.5 h-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${formData.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
        >
          <span>Catálogo: {formData.status === 'published' ? 'Publicado' : 'Ocultado'}</span>
        </div>

        <div className="absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] sm:max-w-none bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Requisitos do Catálogo
          </p>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mb-3">
            💡 Clique em qualquer item pendente para ir direto ao campo.
          </p>
          <ul className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
            <li
              onClick={() => navigateToRequirementField('name')}
              className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
            >
              <div className="flex items-center gap-2">
                <i
                  className={`bi ${ecomStatus.checks.marketplaceTitle ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}
                ></i>
                <span
                  className={
                    ecomStatus.checks.marketplaceTitle
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 font-bold'
                  }
                >
                  Nome do Produto
                </span>
              </div>
              <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
            </li>
            <li
              onClick={() => navigateToRequirementField('unitPrice')}
              className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
            >
              <div className="flex items-center gap-2">
                <i
                  className={`bi ${ecomStatus.checks.unitPrice ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}
                ></i>
                <span
                  className={
                    ecomStatus.checks.unitPrice
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 font-bold'
                  }
                >
                  Preço de Venda &gt; R$ 0
                </span>
              </div>
              <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
            </li>
            <li
              onClick={() => navigateToRequirementField('images')}
              className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
            >
              <div className="flex items-center gap-2">
                <i
                  className={`bi ${ecomStatus.checks.images ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}
                ></i>
                <span
                  className={
                    ecomStatus.checks.images
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 font-bold'
                  }
                >
                  Pelo menos 1 Foto principal
                </span>
              </div>
              <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
            </li>
            <li
              onClick={() => navigateToRequirementField('categories')}
              className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
            >
              <div className="flex items-center gap-2">
                <i
                  className={`bi ${ecomStatus.checks.categories ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}
                ></i>
                <span
                  className={
                    ecomStatus.checks.categories
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 font-bold'
                  }
                >
                  Pelo menos 1 Categoria
                </span>
              </div>
              <i className="bi bi-arrow-right-short text-slate-400 group-hover/item:translate-x-1 transition-transform"></i>
            </li>
            {!isService && (
              <li
                onClick={() => navigateToRequirementField('dimensions')}
                className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors group/item"
              >
                <div className="flex items-center gap-2">
                  <i
                    className={`bi ${ecomStatus.checks.dimensions ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}
                  ></i>
                  <span
                    className={
                      ecomStatus.checks.dimensions
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400 font-bold'
                    }
                  >
                    Ao menos uma dimensão ativa; todas as ativas &gt; 0
                  </span>
                </div>
              </li>
            )}
          </ul>
        </div>
        </div>
      )}
    </div>
  );
};
