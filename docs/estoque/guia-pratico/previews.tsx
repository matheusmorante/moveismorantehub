/** Prévia visual para o guia. Usa componentes reais, dados fictícios e não salva operações. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../../erp/src/index.css';
import { QuickRegisterVariationModal } from '@/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal';
import { InventoryManualMode } from '@/pages/App/Stock/Inventory/components/InventoryManualMode';
import { LabelPrintSelectionModal } from '@/pages/App/Products/components/modals/product/LabelPrintSelectionModal';
import { InboundInvoiceActionsMenu } from '@/pages/App/Stock/InboundInvoices/components/InboundInvoiceActionsMenu';
import { ReceiptsActionsMenu } from '@/pages/App/Stock/Receipts/components/ReceiptsActionsMenu';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
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
const menus = <div className="mx-auto flex gap-12 rounded-2xl bg-white p-6" style={{width:560,height:290}}>
  <div className="relative w-56"><h2 className="text-xs font-bold">NF com vínculos concluídos</h2><InboundInvoiceActionsMenu invoice={{rawXml:'exemplo'} as InboundInvoice} canManageMappings canGenerateReceipt canPrintIdentificationLabels onClose={noop} onManageMappings={noop} onGenerateReceipt={noop} onPrintIdentificationLabels={noop} onDownloadXml={noop} /></div>
  <div className="relative w-56"><h2 className="text-xs font-bold">Recebimento: Recebido</h2><ReceiptsActionsMenu receipt={{status:'received',items:[{productId:'exemplo'}]} as GoodsReceipt} isOpen onClose={noop} onOpenDetails={noop} onCopyReceipt={noop} onReverseRequest={noop} onPrintIdentificationLabels={noop} /></div>
</div>;
createRoot(document.getElementById('root')!).render(<MemoryRouter><div className="min-h-screen bg-slate-100 p-8"><p className="mb-6 text-xs text-slate-500">Exemplo didático - dados fictícios. Nenhuma operação é gravada nesta prévia.</p>
  {screen === 'menus' ? menus : screen === 'inventory' ? <div className="mx-auto max-w-3xl"><h1 className="mb-5 text-xl font-bold">Contagem manual do inventário</h1><InventoryManualMode filteredItems={items} filter="all" setFilter={()=>{}} search="" setSearch={()=>{}} onUpdateCount={()=>{}} isCustom={false} /></div> : screen === 'labels' ? <LabelPrintSelectionModal isOpen onClose={()=>{}} labelType="identification" initialProducts={products} /> : <QuickRegisterVariationModal isOpen item={{productDescription:'Mesa de jantar - exemplo',productCode:'EXEMPLO-01',unit:'UN',quantity:2,unitCost:100}} supplierId="00000000-0000-4000-8000-000000000001" onClose={()=>{}} onConfirmSelection={async()=>false} />}
</div></MemoryRouter>);
