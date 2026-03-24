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
        <table className="break-words w-full border-collapse [&_td]:border-2 [&_th]:border-2 [&_td]:border-slate-300 [&_th]:border-slate-300 dark:[&_td]:border-slate-800 dark:[&_th]:border-slate-800 transition-colors duration-300">
            <colgroup>
                <col className="w-full" /> {/* Descrição greedy */}
                <col className="w-[1px]" /> {/* Modalidade minimal */}
                <col className="w-[1px]" /> {/* Qtd maximal minimal */}
                <col className="w-[1px]" /> {/* Preço Un. minimal */}
                <col className="w-[1px]" /> {/* Desc. Un. minimal */}
                <col className="w-[1px]" /> {/* Valor Total minimal */}
            </colgroup>
            <thead>
                <tr className="text-base font-black uppercase tracking-tight text-slate-400 bg-slate-50/50">
                    <th className="px-3 py-1 text-left whitespace-nowrap">DESC. PRODUTO/SERVIÇO</th>
                    <th className="px-1 py-1 text-center whitespace-nowrap">Modalidade</th>
                    <th className="px-1 py-1 text-right whitespace-nowrap">Qtd</th>
                    <th className="px-2 py-1 text-right whitespace-nowrap">Preço Un.</th>
                    <th className="px-2 py-1 text-right whitespace-nowrap">Desc. Un.</th>
                    <th className="px-2 py-1 text-right whitespace-nowrap">Valor Total</th>
                </tr>
            </thead>

            <Body items={items} />
            <Footer summary={summary} />
        </table >
    )
}

export default ItemsTable;