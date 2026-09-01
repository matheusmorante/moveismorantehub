import React, { useState } from "react";
import { Undo2 } from "lucide-react";
import { toast } from "react-toastify";
import CustomerData from "../../types/customerData.type";
import Item from "../../types/items.type";
import Order from "../../types/order.type";
import Shipping from "../../types/Shipping.type";
import { calcItemsSummary } from "../../utils/calculations";
import { saveOrder } from "../../utils/orderHistoryService";
import CustomerSearchModal from "./CustomerSearchModal";
import ReturnCollectionSection from "./OrderActions/ReturnCollectionSection";
import PersonFormModal from "../Registrations/shared/PersonFormModal";
import ReturnItemsTable from "./ReturnItemsTable";
import ReturnFormTabs, { ReturnFormTab } from "./ReturnFormTabs";

type Props = { onClose: () => void; onSaveSuccess: (id?: string, order?: Order) => void };
const EMPTY_SCHEDULING: Shipping['scheduling'] = { dateType: 'fixed', date: '', endDate: '', time: '', type: 'fixed', startTime: '', endTime: '', notInformed: false };
const EMPTY_CUSTOMER: CustomerData = { fullName: '', phone: '', noPhone: false, fullAddress: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', observation: '' } };
const EMPTY_ITEM: Item = { description: '', quantity: 1, unitPrice: 0, unitDiscount: 0, discountType: 'fixed', handlingType: '' };

const UnlinkedReturnOrderModal = ({ onClose, onSaveSuccess }: Props) => {
    const [customer, setCustomer] = useState<CustomerData>(EMPTY_CUSTOMER);
    const [items, setItems] = useState<Item[]>([{ ...EMPTY_ITEM }]);
    const [collectAtAddress, setCollectAtAddress] = useState(false);
    const [scheduling, setScheduling] = useState<Shipping['scheduling']>(EMPTY_SCHEDULING);
    const [observations, setObservations] = useState<string[]>([]);
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<ReturnFormTab>('items');
    const itemsSummary = calcItemsSummary(items);
    const total = itemsSummary.itemsTotalValue;

    React.useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; };
    }, []);

    const saveReturn = async () => {
        if (!customer.fullName.trim()) return toast.warning('Informe o cliente da devolução.');
        const validItems = items.filter(item => item.description.trim() || item.productId);
        if (!validItems.length) return toast.warning('Adicione pelo menos um item devolvido.');
        const summary = calcItemsSummary(validItems);
        const order: Order = {
            orderType: 'return', status: 'scheduled', customerData: customer, items: validItems, seller: '', date: new Date().toISOString(), observation: observations.join('\n'), collectionObservation: collectAtAddress ? observations.join('\n') : undefined,
            itemsSummary: summary,
            payments: [], paymentsSummary: { totalPaymentsFee: 0, totalOrderValue: summary.itemsTotalValue, totalPaid: 0, totalAmountPaid: 0, amountRemaining: 0 },
            shipping: { value: 0, deliveryMethod: collectAtAddress ? 'delivery' : 'pickup', orderType: 'Standard', scheduling: collectAtAddress ? scheduling : { ...EMPTY_SCHEDULING, notInformed: true } }, returnStockProcessed: false,
        };
        setSubmitting(true);
        try { const id = await saveOrder(order); toast.success('Pedido de devolução gerado com sucesso!'); onSaveSuccess(id, { ...order, id }); onClose(); }
        catch (error) { console.error('Erro ao salvar devolução:', error); toast.error('Erro ao processar devolução.'); }
        finally { setSubmitting(false); }
    };

    return <div className="fixed inset-0 z-[999999] flex items-stretch justify-center bg-slate-900/60 p-0 backdrop-blur-sm xl:items-center xl:p-4" onClick={onClose}>
        <div className="flex h-full w-full max-w-none flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-2xl xl:rounded-3xl" onClick={event => event.stopPropagation()}>
            <header className="flex shrink-0 items-center justify-between border-b border-slate-50 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30"><Undo2 className="h-5 w-5" /></div><div><h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Gerar pedido de devolução</h2><p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Sem venda vinculada</p></div></div><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><i className="bi bi-x-lg text-lg" /></button></header>
            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
                <section><div className="mb-3 flex items-center justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente *</label><button type="button" onClick={() => setNewCustomerOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-blue-600"><i className="bi bi-person-plus mr-1" />Novo cliente</button></div><div className="relative"><i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={customerSearchTerm} onFocus={() => setCustomerSearchOpen(true)} onChange={event => { setCustomerSearchTerm(event.target.value); setCustomer(EMPTY_CUSTOMER); setCustomerSearchOpen(true); }} placeholder="Pesquisar cliente por nome, telefone ou endereço" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950" />{customer.fullName && <span className="mt-2 block text-[10px] font-black uppercase tracking-widest text-emerald-600"><i className="bi bi-check-circle-fill mr-1" />Cliente selecionado</span>}</div></section>
                <ReturnFormTabs activeTab={activeTab} onChange={setActiveTab} />
                {activeTab === 'items' ? <ReturnItemsTable items={items} setItems={setItems} deliveryMethod={collectAtAddress ? 'delivery' : 'pickup'} /> : <ReturnCollectionSection collectAtAddress={collectAtAddress} onCollectChange={setCollectAtAddress} scheduling={scheduling} onSchedulingChange={(key, value) => setScheduling(current => ({ ...current, [key]: value }))} observations={observations} onObservationsChange={setObservations} />}
            </div>
            <footer className="shrink-0 border-t border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-6 flex items-center justify-between px-2"><div><span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total da devolução</span><div className="text-2xl font-black text-amber-600">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div></div><div className="text-right text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">{items.length} itens selecionados<span className="mt-1 block text-[9px] text-slate-400">Sem vínculo com venda</span></div></div><div className="flex gap-3"><button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-2xl border border-slate-200 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800">Cancelar</button><button type="button" onClick={saveReturn} disabled={submitting || !items.length} className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-amber-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-amber-500/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{submitting ? 'Processando...' : <><Undo2 className="h-4 w-4" />Gerar pedido de devolução</>}</button></div></footer>
        </div>
        {customerSearchOpen && <CustomerSearchModal initialSearch={customerSearchTerm} onClose={() => setCustomerSearchOpen(false)} onSelect={selected => { setCustomer(selected); setCustomerSearchTerm(selected.fullName); setCustomerSearchOpen(false); }} onAddNew={() => { setCustomerSearchOpen(false); setNewCustomerOpen(true); }} />}
        <PersonFormModal isOpen={newCustomerOpen} onClose={() => setNewCustomerOpen(false)} collectionName="customers" title="Cliente" onSuccess={person => { const selected = { id: person.id, fullName: person.fullName || person.tradeName || '', phone: person.phone || '', noPhone: person.noPhone || false, fullAddress: person.fullAddress || EMPTY_CUSTOMER.fullAddress, additionalContacts: person.additionalContacts || [] }; setCustomer(selected); setCustomerSearchTerm(selected.fullName); setNewCustomerOpen(false); }} />
    </div>;
};

export default UnlinkedReturnOrderModal;
