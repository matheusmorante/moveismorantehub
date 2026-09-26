import { dateNow, stringifyFullAddress, stringifyItems } from './utils/formatters';

const WarrantyTermPage = () => {
    const storedOrder = sessionStorage.getItem('order');
    const order = storedOrder ? JSON.parse(storedOrder) : null;
    const date = dateNow();

    return (
        <div className="text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <h1 className='text-center font-black text-xl uppercase tracking-tighter text-blue-600 dark:text-blue-400'>TERMO DE GARANTIA</h1>
            <br />
            <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <p><strong className="text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest block mb-1">Cliente</strong>{order.customerData.fullName}</p>
                <p>
                    <strong className="text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest block mb-1">Endereço</strong>
                    {
                        stringifyFullAddress(
                            order.customerData.fullAddress
                        )
                    }
                </p>
                <p><strong className="text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest block mb-1">Telefone</strong> {order.customerData.phone}</p>
                <p>
                    <strong className="text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest block mb-1">Produto(s)</strong>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{stringifyItems(order.items)}</span>
                </p>
                <p><strong className="text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-widest block mb-1">Data da Compra</strong> {date}</p>
            </div>

            <br />
            <div className="space-y-4 px-4">
                <p><strong className="text-slate-900 dark:text-slate-100 uppercase text-xs">Garantia:</strong></p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    A loja garante o(s) produto(s) acima contra defeitos de fabricação pelo período de 3 meses (90 dias) a partir da data da compra.
                    A garantia cobre apenas problemas decorrentes de fabricação, não sendo válida para:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-4">
                    <li>Uso indevido ou manutenção inadequada;</li>
                    <li>Danos causados por acidentes, quedas, transporte, exposição a umidade, maresia, calor excessivo, produtos abrasivos entre outras situações;</li>
                    <li>Alterações ou reparos feitos por terceiros.</li>
                </ul>

                <br />
                <p><strong className="text-slate-900 dark:text-slate-100 uppercase text-xs">Procedimento em caso de defeito:</strong></p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    O cliente deve apresentar o(s) produto(s), o recibo ou nota fiscal e este termo de garantia à loja através de foto legível.
                    A loja se compromete a reparar, substituir ou devolver o valor do produto conforme avaliação do defeito.
                </p>

                <br />
                <p><strong className="text-slate-900 dark:text-slate-100 uppercase text-xs">Declaração:</strong></p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Declaro que recebi as informações sobre o produto e os termos de garantia.
                </p>
            </div>

            <div className="flex text-center gap-20 justify-center mt-20">
                <div className="assinatura border-t border-slate-200 dark:border-slate-800 pt-4 px-8">
                    <div className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">Assinatura do Cliente </div>
                </div>
                <div className="assinatura border-t border-slate-200 dark:border-slate-800 pt-4 px-8">
                    <div className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">Vendedor / Loja</div>
                </div>
            </div>
        </div>

    )
};

export default WarrantyTermPage;
