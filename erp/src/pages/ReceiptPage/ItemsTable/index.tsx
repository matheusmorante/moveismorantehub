import Item from "../../types/items.type";
import Footer from "./Footer";
import { ItemsSummary } from "../../types/items.type";
import Body from "./Body";

interface Props {
    items: Item[],
    summary: ItemsSummary,
}

const ItemsTable = ({ items, summary }: Props) => {
    return (
        <section className="my-2 overflow-hidden rounded-2xl border border-slate-50 shadow-sm shrink-0">
            <table className="w-full border-collapse">
                <colgroup>
                    <col className="w-[48%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[24%]" />
                </colgroup>
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-1.5 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Descrição do Produto/Serviço</th>
                        <th className="px-4 py-1.5 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">Quant.</th>
                        <th className="px-4 py-1.5 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Preço Un.</th>
                        <th className="px-4 py-1.5 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Desc.</th>
                        <th className="px-4 py-1.5 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Valor Total</th>
                    </tr>
                </thead>

                <Body items={items} />
                <Footer summary={summary} />
            </table>
        </section>
    )
}

export default ItemsTable;