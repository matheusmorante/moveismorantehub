import type { FiscalInfo } from './product.type.js';
import type { ServiceFiscalSnapshot } from './service.type.js';
import type { OrderCompositionSnapshot } from '../../../../shared-utils/orderCompositionSnapshot.js';

type DiscountType = 'percentage' | 'fixed';

export type Item = {
  /** Identificador estável da linha, independente do produto/variação. */
  orderItemId?: string;
  /** Índice zero-based da linha da venda original em um item de devolução. */
  originalOrderItemIndex?: number;
  /** Linhas de produto às quais o serviço foi vinculado no pedido. */
  linkedProductOrderItemIds?: string[];
  /** Vínculo singular legado, preservado para pedidos antigos. */
  linkedProductOrderItemId?: string;
  /** Snapshot legado de cadastro fiscal de serviço; não é usado na composição atual. */
  serviceFiscalSnapshot?: ServiceFiscalSnapshot;
  productId?: string;
  variationId?: string;
  isTemporaryProduct?: boolean;
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  /** CMV unitário apurado no instante da saída de estoque. */
  unitCost?: number;
  unitDiscount: number;
  discountType: DiscountType;
  handlingType: string;
  assemblyResponsible?: 'Nossa equipe' | 'Montador terceirizado' | '';
  observation?: string;
  condition?: 'novo' | 'usado' | 'salvado' | '';
  deliveryMethod?: 'delivery' | 'pickup';
  itemType?: 'product' | 'service';
  /** Versioned, immutable item-level copy of the product facts used by this order. */
  fiscalSnapshotVersion?: 1;
  /** Catalog references retained even for non-stock items whose productId is intentionally empty. */
  fiscalSnapshotProductId?: string;
  fiscalSnapshotVariationId?: string;
  fiscal?: FiscalInfo;
  isCombo?: boolean;
  isComboItem?: boolean;
  /** Immutable parent and per-component quantity snapshot for a composed product in this order. */
  compositionGroup?: OrderCompositionSnapshot;
  currentStock?: number;
  minStock?: number;
  /** Quantidade devolvida no pedido de devolução */
  returnedQuantity?: number;
  /** Valor unitário devolvido/estornado */
  returnedUnitPrice?: number;
  /** Valor total devolvido do item (returnedUnitPrice * returnedQuantity) */
  returnedTotalValue?: number;
  /** Preço unitário original vendido (snapshot da venda) */
  originalUnitPrice?: number;
  /** Valor total original vendido do item */
  originalTotalValue?: number;
};

export type ItemsSummary = {
  totalQuantity: number;
  itemsSubtotal: number;
  totalFixedDiscount: number;
  itemsTotalValue: number;
  totalItemsCost: number;
};

export default Item;
