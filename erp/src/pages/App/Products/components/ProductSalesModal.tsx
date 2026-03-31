import React, { useEffect, useState } from 'react';
import Product from '../../../types/product.type';
import Order from '../../../types/order.type';
import { getOrdersByProductId } from '../../../utils/orderHistoryService';
import { formatCurrency } from '../../../utils/formatters';

interface ProductSalesModalProps {
    product: Product;
    onClose: () => void;
}

const ProductSalesModal: React.FC<ProductSalesModalProps> = ({ product, onClose }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                // Passamos SKU e Descrição para busca exaustiva (casos onde o ID mudou)
                const data = await getOrdersByProductId(
                    product.id!, 
                    product.code || product.sku, 
                    product.description
                );
                setOrders(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [product.id, product.code, product.sku, product.description]);

    const getQuantityInOrder = (order: Order) => {
        const productId = product.id;
        const productSku = (product.code || product.sku)?.toString().toUpperCase();

        const normalItems = (order.items || [])
            .filter(item => {
                const itemCode = item.code?.toString().toUpperCase();
                return item.productId === productId || (productSku && itemCode === productSku);
            })
            .reduce((sum, item) => sum + (item.quantity || 0), 0);

        const assistanceItems = (order.assistanceItems || [])
            .filter((item: any) => {
                const itemCode = (item.code || item.sku)?.toString().toUpperCase();
                return item.id === productId || (productSku && itemCode === productSku);
            })
            .reduce((sum, item) => sum + (item.quantity || 0), 0);

        return normalItems + assistanceItems;
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <i className="bi bi-receipt text-blue-600"></i>
                            Pedidos Vinculados
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {product.description} | SKU: {product.code || product.sku || 'N/A'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all text-slate-400 hover:text-red-500 border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                    >
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white dark:bg-slate-900">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buscando pedidos...</span>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 dark:bg-slate-800/10 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                <i className="bi bi-search text-4xl text-slate-200"></i>
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Nenhum pedido encontrado</h3>
                            <p className="text-xs text-slate-400 font-medium mt-1 max-w-xs leading-relaxed">
                                Este produto ainda não foi vinculado a nenhum pedido (venda, assistência ou outros) registrado no sistema.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/80">
                                    <tr>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido / Data</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Quantidade</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Valor Unit.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {orders.map((order) => {
                                        const productSku = (product.code || product.sku)?.toString().toUpperCase();
                                        const qty = getQuantityInOrder(order);
                                        const item = [...(order.items || []), ...(order.assistanceItems || []) as any].find((i: any) => {
                                            const itemCode = (i.code || i.sku)?.toString().toUpperCase();
                                            return i.productId === product.id || i.id === product.id || (productSku && itemCode === productSku);
                                        });

                                        const typeColor = order.orderType === 'assistance' ? 'bg-purple-600 text-white shadow-purple-500/20' : 
                                                         order.orderType === 'showroom' ? 'bg-orange-600 text-white shadow-orange-500/20' :
                                                         'bg-blue-600 text-white shadow-blue-500/20';
                                        
                                        return (
                                            <tr key={order.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group text-slate-700 dark:text-slate-300">
                                                <td className="px-6 py-6 transition-all">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">#{order.id}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                                            {order.date ? new Date(order.date).toLocaleDateString('pt-BR') : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold line-clamp-1">{order.customerData?.fullName || 'Cliente Geral'}</span>
                                                        <span className="text-[10px] font-medium text-slate-400 mt-1">{order.customerData?.cpfCnpj || 'S/ CPF/CNPJ'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <span className="inline-flex items-center justify-center min-w-[70px] text-xs font-black bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                                        {qty} {product.unit || 'un'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-lg shadow-sm ${typeColor}`}>
                                                        {order.orderType === 'assistance' ? 'Assistência' : 
                                                         order.orderType === 'showroom' ? 'Showroom' : 
                                                         order.orderType === 'budget' ? 'Orçamento' : 'Venda'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex">
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200">
                                                            {order.status || 'Pendente'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                                                        {formatCurrency(item?.unitPrice || 0)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <td colSpan={2} className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Total Acumulado nesta Lista
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                                    {orders.reduce((sum, order) => sum + getQuantityInOrder(order), 0)} {product.unit || 'un'}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total</span>
                                            </div>
                                        </td>
                                        <td colSpan={3} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-10 py-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-12 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all shadow-2xl shadow-slate-900/20 dark:shadow-none hover:scale-[1.02] active:scale-95"
                    >
                        Fechar Visualização
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductSalesModal;
