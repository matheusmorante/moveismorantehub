/** Prévia visual para o guia. Usa componentes reais, dados fictícios e não salva operações. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../../erp/src/index.css';
import { QuickRegisterVariationModal } from '@/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal';
import { InboundInvoiceItemRow } from '@/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemRow';
import SupplierAutocomplete from '@/components/SupplierAutocomplete';
import { InventoryManualMode } from '@/pages/App/Stock/Inventory/components/InventoryManualMode';
import { LabelPrintSelectionModal } from '@/pages/App/Products/components/modals/product/LabelPrintSelectionModal';
import { InboundInvoiceActionsMenu } from '@/pages/App/Stock/InboundInvoices/components/InboundInvoiceActionsMenu';
import { ReceiptsActionsMenu } from '@/pages/App/Stock/Receipts/components/ReceiptsActionsMenu';
import { PurchaseOrderItemsView } from '@/pages/App/Stock/components/purchase-items/PurchaseOrderItemsView';
import type { InboundInvoice, InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import type { AuditItem } from '@/pages/App/Stock/Inventory/types/inventoryAudit.types';
import type { PurchaseItem } from '@/pages/types/purchase.type';

const items: AuditItem[] = [
  { id:'exemplo-1',key:'exemplo-1',productId:'exemplo-1',name:'Guarda-roupa 6 portas - exemplo',supplierNames:'Fornecedor de exemplo',assignedSupplier:'exemplo',systemStock:5,physicalCount:4,unit:'UN' },
  { id:'exemplo-2',key:'exemplo-2',productId:'exemplo-2',name:'Mesa de jantar - exemplo',supplierNames:'Fornecedor de exemplo',assignedSupplier:'exemplo',systemStock:3,physicalCount:0,unit:'UN' },
  { id:'exemplo-3',key:'exemplo-3',productId:'exemplo-3',name:'Cômoda - exemplo',supplierNames:'Fornecedor de exemplo',assignedSupplier:'exemplo',systemStock:2,physicalCount:null,unit:'UN' },
];
const products = [
  {id:'exemplo-1',description:'Guarda-roupa 6 portas - exemplo',code:'EX-001',sku:'EX-001-01',unitPrice:0,images:[],labelQty:2},
  {id:'exemplo-2',description:'Mesa de jantar - exemplo',code:'EX-002',sku:'EX-002-01',unitPrice:0,images:[],labelQty:1},
];
const purchaseItems: PurchaseItem[] = [{
  productId: 'exemplo-produto',
  description: 'Balcão de demonstração para cooktop de 4 e 5 bocas com acabamento ilustrativo e descrição longa para mostrar a quebra de linha',
  quantity: 1,
  baseCost: 100,
  unitCost: 130,
  totalCost: 130,
}];
const screen = new URLSearchParams(location.search).get('screen');
const noop = () => {};
const mappingItems: InboundInvoiceItem[] = [
  {
    itemNumber: 1,
    productDescription: 'Estante Torino',
    productCode: 'ET-01',
    unit: 'UN',
    quantity: 1,
    unitCost: 790,
    totalCost: 790,
    linkMode: 'single',
  },
  {
    itemNumber: 2,
    productDescription: 'Kit de parafusos para montagem',
    productCode: 'KIT-02',
    unit: 'UN',
    quantity: 1,
    unitCost: 12,
    totalCost: 12,
    linkMode: 'not_applicable',
  },
];
const mappings = (
  <main className="mx-auto w-full max-w-[950px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
    <header className="border-b border-slate-200 bg-slate-50 px-6 py-5">
      <h1 className="text-lg font-black text-slate-800">Gerenciar vínculos da NF-e</h1>
      <p className="mt-1 text-xs text-slate-500">NF-e de exemplo · dados fictícios</p>
    </header>
    <div className="border-b border-slate-100 px-6 py-4">
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
        Fornecedor
      </label>
      <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
        Fornecedor de exemplo
      </div>
    </div>
    <div className="space-y-3 bg-slate-50/60 p-4">
      {mappingItems.map((item) => (
        <InboundInvoiceItemRow
          key={item.itemNumber}
          item={item}
          supplierId="00000000-0000-4000-8000-000000000001"
          excludedProductLinks={[]}
          acceptingSuggestion={null}
          removingLink={null}
          onSelectProduct={noop}
          onAcceptSuggestion={noop}
          onRejectSuggestion={noop}
          onRemoveLink={noop}
          onRequestQuickRegister={noop}
          onUpdateItem={noop}
        />
      ))}
    </div>
    <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
      <span className="text-xs font-semibold text-slate-500">
        0 vinculados · 1 não se aplica · 1 pendente
      </span>
      <button
        type="button"
        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black uppercase text-white"
      >
        Gerar recebimento
      </button>
    </footer>
  </main>
);
const supplierSearch = (
  <div className="mx-auto w-[815px] rounded-xl bg-white p-2">
    <SupplierAutocomplete
      suppliers={[]}
      selectedSupplierId=""
      onSelect={noop}
      hideLabel={true}
      showSelectedBadge={false}
      placeholder="Digite pelo menos 3 caracteres para buscar fornecedor..."
      minChars={3}
      inputClassName="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 outline-none focus:border-blue-600"
    />
  </div>
);
const menus = <div className="mx-auto flex gap-12 rounded-2xl bg-white p-6" style={{width:560,height:290}}>
  <div className="relative w-56"><h2 className="text-xs font-bold">NF com vínculos concluídos</h2><InboundInvoiceActionsMenu invoice={{rawXml:'exemplo'} as InboundInvoice} canManageMappings canGenerateReceipt canPrintIdentificationLabels onClose={noop} onManageMappings={noop} onGenerateReceipt={noop} onPrintIdentificationLabels={noop} onDownloadXml={noop} /></div>
  <div className="relative w-56"><h2 className="text-xs font-bold">Recebimento: Recebido</h2><ReceiptsActionsMenu receipt={{status:'received',items:[{productId:'exemplo'}]} as GoodsReceipt} isOpen onClose={noop} onOpenDetails={noop} onCopyReceipt={noop} onReverseRequest={noop} onPrintIdentificationLabels={noop} /></div>
</div>;
const purchase = <main className="mx-auto w-[950px] rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
  <PurchaseOrderItemsView
    items={purchaseItems}
    isReceiptMode={false}
    supplierId="exemplo-fornecedor"
    discountPercent={0}
    ipiPercent={20}
    freightPercent={10}
    formatCurrency={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
    onRemoveItem={noop}
    onAddNewItemRow={noop}
    handleSelectProductInRow={noop}
    handleEditProductInRow={noop}
    handleQtyChange={noop}
    handleCostChange={noop}
    handleDiscountChange={noop}
    hasError={false}
    totalValue={130}
    activeItemIndex={0}
    onActiveItemChange={noop}
  />
</main>;
createRoot(document.getElementById('root')!).render(<MemoryRouter><div className="min-h-screen bg-slate-100 px-3 py-4 sm:p-8"><p className="mb-6 text-xs text-slate-500">Exemplo didático - dados fictícios. Nenhuma operação é gravada nesta prévia.</p>
  {screen === 'mappings' ? mappings : screen === 'supplier-search' ? supplierSearch : screen === 'menus' ? menus : screen === 'inventory' ? <div className="mx-auto max-w-3xl"><h1 className="mb-5 text-xl font-bold">Contagem manual do inventário</h1><InventoryManualMode filteredItems={items} filter="all" setFilter={()=>{}} search="" setSearch={()=>{}} onUpdateCount={()=>{}} isCustom={false} /></div> : screen === 'labels' ? <LabelPrintSelectionModal isOpen onClose={()=>{}} labelType="identification" initialProducts={products} /> : screen === 'purchase' ? purchase : <QuickRegisterVariationModal isOpen item={{productDescription:'Mesa de jantar - exemplo',productCode:'EXEMPLO-01',unit:'UN',quantity:2,unitCost:100}} supplierId="00000000-0000-4000-8000-000000000001" onClose={()=>{}} onConfirmSelection={async()=>false} />}
</div></MemoryRouter>);
