/** Prévia visual para o guia. Usa componentes reais, dados fictícios e não salva operações. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../../erp/src/index.css';
import { QuickRegisterVariationModal } from '@/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal';
import { InboundItemLinkHeader } from '@/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader';
import { InboundItemSingleMode } from '@/pages/App/Stock/InboundInvoices/components/InboundItemSingleMode';
import { InventoryManualMode } from '@/pages/App/Stock/Inventory/components/InventoryManualMode';
import { LabelPrintSelectionModal } from '@/pages/App/Products/components/modals/product/LabelPrintSelectionModal';
import { InboundInvoiceActionsMenu } from '@/pages/App/Stock/InboundInvoices/components/InboundInvoiceActionsMenu';
import { ReceiptsActionsMenu } from '@/pages/App/Stock/Receipts/components/ReceiptsActionsMenu';
import type { InboundInvoice, InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import type { AuditItem } from '@/pages/App/Stock/Inventory/types/inventoryAudit.types';

const items: AuditItem[] = [
  { id:'exemplo-1',key:'exemplo-1',productId:'exemplo-1',name:'Guarda-roupa 6 portas - exemplo',supplierNames:'Fornecedor de exemplo',assignedSupplier:'exemplo',systemStock:5,physicalCount:4,unit:'UN' },
  { id:'exemplo-2',key:'exemplo-2',productId:'exemplo-2',name:'Mesa de jantar - exemplo',supplierNames:'Fornecedor de exemplo',assignedSupplier:'exemplo',systemStock:3,physicalCount:0,unit:'UN' },
  { id:'exemplo-3',key:'exemplo-3',productId:'exemplo-3',name:'Cômoda - exemplo',supplierNames:'Fornecedor de exemplo',assignedSupplier:'exemplo',systemStock:2,physicalCount:null,unit:'UN' },
];
const products = [
  {id:'exemplo-1',description:'Guarda-roupa 6 portas - exemplo',code:'EX-001',sku:'EX-001-01',unitPrice:0,images:[],labelQty:2},
  {id:'exemplo-2',description:'Mesa de jantar - exemplo',code:'EX-002',sku:'EX-002-01',unitPrice:0,images:[],labelQty:1},
];
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
  <main className="mx-auto w-[950px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
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
        <article
          key={item.itemNumber}
          className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Produto da NF-e · Item {item.itemNumber}
            </p>
            <h2 className="text-sm font-black text-slate-800">{item.productDescription}</h2>
            <p className="text-xs text-slate-500">
              {item.quantity} {item.unit} · Cód. fornecedor: {item.productCode}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
            <InboundItemLinkHeader
              item={item}
              isComposition={item.linkMode === 'composition'}
              supplierId="exemplo-fornecedor"
              quickRegisterDisabled={item.linkMode === 'not_applicable'}
              compositionLinks={item.compositionLinks || []}
              displayName={item.productErpName}
              displayCode={item.linkedProductCode}
              displaySellingPrice={0}
              onRequestQuickRegister={noop}
              onUpdateItem={noop}
            />
            {item.linkMode === 'not_applicable' ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Não se aplica. Este item continuará na NF-e, mas não será lançado no estoque pelo recebimento.
              </p>
            ) : (
              <InboundItemSingleMode
                item={item}
                supplierId="exemplo-fornecedor"
                excludedProductLinks={[]}
                acceptingSuggestion={null}
                removingLink={null}
                linked={false}
                displaySellingPrice={0}
                onSelectProduct={noop}
                onAcceptSuggestion={noop}
                onRejectSuggestion={noop}
                onRemoveLink={noop}
                onRequestEditProduct={noop}
              />
            )}
          </div>
        </article>
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
const menus = <div className="mx-auto flex gap-12 rounded-2xl bg-white p-6" style={{width:560,height:290}}>
  <div className="relative w-56"><h2 className="text-xs font-bold">NF com vínculos concluídos</h2><InboundInvoiceActionsMenu invoice={{rawXml:'exemplo'} as InboundInvoice} canManageMappings canGenerateReceipt canPrintIdentificationLabels onClose={noop} onManageMappings={noop} onGenerateReceipt={noop} onPrintIdentificationLabels={noop} onDownloadXml={noop} /></div>
  <div className="relative w-56"><h2 className="text-xs font-bold">Recebimento: Recebido</h2><ReceiptsActionsMenu receipt={{status:'received',items:[{productId:'exemplo'}]} as GoodsReceipt} isOpen onClose={noop} onOpenDetails={noop} onCopyReceipt={noop} onReverseRequest={noop} onPrintIdentificationLabels={noop} /></div>
</div>;
createRoot(document.getElementById('root')!).render(<MemoryRouter><div className="min-h-screen bg-slate-100 p-8"><p className="mb-6 text-xs text-slate-500">Exemplo didático - dados fictícios. Nenhuma operação é gravada nesta prévia.</p>
  {screen === 'mappings' ? mappings : screen === 'menus' ? menus : screen === 'inventory' ? <div className="mx-auto max-w-3xl"><h1 className="mb-5 text-xl font-bold">Contagem manual do inventário</h1><InventoryManualMode filteredItems={items} filter="all" setFilter={()=>{}} search="" setSearch={()=>{}} onUpdateCount={()=>{}} isCustom={false} /></div> : screen === 'labels' ? <LabelPrintSelectionModal isOpen onClose={()=>{}} labelType="identification" initialProducts={products} /> : <QuickRegisterVariationModal isOpen item={{productDescription:'Mesa de jantar - exemplo',productCode:'EXEMPLO-01',unit:'UN',quantity:2,unitCost:100}} supplierId="00000000-0000-4000-8000-000000000001" onClose={()=>{}} onConfirmSelection={async()=>false} />}
</div></MemoryRouter>);
