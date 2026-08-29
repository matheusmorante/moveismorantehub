import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Purchase from '../../../types/purchase.type';
import Person from '../../../types/person.type';
import { subscribeToPurchases, updatePurchase } from '../../../utils/purchaseService';
import { fetchPersons } from '../../../utils/personService';
import { toast } from 'react-toastify';
import PurchaseFormModal from './PurchaseFormModal';
import PurchaseDetailsModal from './components/PurchaseDetailsModal';
import PurchaseSupplierFilter from './components/PurchaseSupplierFilter';
import PurchaseTable from './components/PurchaseTable';

const PurchasesPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

    useEffect(() => {
        fetchPersons('suppliers').then(setSuppliers);
        return subscribeToPurchases(data => {
            setPurchases(data);
            setLoading(false);
            setSelectedPurchase(current => current ? data.find(purchase => purchase.id === current.id) || current : null);
        });
    }, []);

    useEffect(() => {
        const purchaseId = location.state?.purchaseIdToOpen as string | undefined;
        const purchase = purchases.find(item => item.id === purchaseId);
        if (!purchase) return;
        setSelectedPurchase(purchase);
        setIsDetailsModalOpen(true);
        navigate('/stock?tab=purchases', { replace: true, state: null });
    }, [location.state, navigate, purchases]);

    const filteredPurchases = useMemo(() => selectedSupplierId
        ? purchases.filter(purchase => purchase.supplierId === selectedSupplierId)
        : purchases, [purchases, selectedSupplierId]);

    const handleStatusChange = async (purchase: Purchase, status: Purchase['status']) => {
        if (!purchase.id || status === purchase.status) return;
        try {
            await updatePurchase(purchase.id, { status });
            toast.success(`Status alterado para ${status === 'fulfilled' ? 'Atendido' : status === 'cancelled' ? 'Cancelado' : 'Em ordem'}.`);
        } catch (error: any) { toast.error(error.message || 'Erro ao alterar status.'); }
    };

    return <div className="flex flex-col"><div className="flex-1 flex flex-col min-w-0">
        <header className="mb-3 flex flex-row items-center justify-between gap-3 sm:mb-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md sm:h-10 sm:w-10"><i className="bi bi-truck" /></div><h1 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 sm:text-xl md:text-2xl">Pedidos de Compra</h1></div><button onClick={() => { setSelectedPurchase(null); setIsModalOpen(true); }} className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-blue-700 sm:px-4 sm:py-2.5"><i className="bi bi-plus-lg mr-1.5" />Nova Compra</button></header>
        <section className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"><div className="flex flex-col gap-4 border-b border-slate-50 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center"><PurchaseSupplierFilter suppliers={suppliers} selectedSupplierId={selectedSupplierId} onSelect={setSelectedSupplierId} /></div>
            <PurchaseTable purchases={filteredPurchases} onOpen={purchase => { setSelectedPurchase(purchase); setIsDetailsModalOpen(true); }} onChangeStatus={handleStatusChange} />
            {loading && <div className="p-20 text-center text-xs font-black uppercase tracking-widest text-slate-400">Carregando compras...</div>}
            {!loading && !filteredPurchases.length && <div className="p-20 text-center text-xl font-black text-slate-400">Nenhum pedido para este fornecedor</div>}
        </section>
    </div>
    <PurchaseDetailsModal isOpen={isDetailsModalOpen} purchase={selectedPurchase} onClose={() => { setIsDetailsModalOpen(false); setSelectedPurchase(null); }} onEdit={purchase => { setSelectedPurchase(purchase); setIsDetailsModalOpen(false); setIsModalOpen(true); }} />
    <PurchaseFormModal isOpen={isModalOpen} purchase={selectedPurchase} onClose={() => { setIsModalOpen(false); setSelectedPurchase(null); }} />
    </div>;
};

export default PurchasesPage;
