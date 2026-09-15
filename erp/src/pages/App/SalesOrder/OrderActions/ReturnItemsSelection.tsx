import React from "react";
import Order from "../../../types/order.type";
import { NumericFormat as NumericFormatBase, NumberFormatValues } from "react-number-format";
const NumericFormat = NumericFormatBase as any;

type Props = {
    readonly order: Order;
    readonly quantities: Record<string, number>;
    readonly returnUnitPrices?: Record<string, number>;
    readonly onToggle: (id: string, quantity: number, defaultUnitPrice: number) => void;
    readonly onQuantityChange: (id: string, quantity: number, max: number) => void;
    readonly onUnitPriceChange?: (id: string, unitPrice: number) => void;
};

const ReturnItemsSelection = ({
    order,
    quantities,
    returnUnitPrices = {},
    onToggle,
    onQuantityChange,
    onUnitPriceChange,
}: Props) => {
    const hasUnregistered = (order.items || []).some(
        (item) => !item.productId?.trim() || item.isTemporaryProduct
    );

    return (
        <div>
            <span className="mb-4 ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Itens do pedido para devolução
            </span>
            <div className="space-y-3">
                {order.items.map((item, index) => {
                    const itemId = item.productId || item.description;
                    const selected = Boolean(quantities[itemId]);
                    const isUnregistered = !item.productId?.trim() || item.isTemporaryProduct;
                    const activeUnitPrice =
                        returnUnitPrices[itemId] !== undefined ? returnUnitPrices[itemId] : item.unitPrice;
                    const activeQty = selected ? quantities[itemId] || 0 : item.quantity;
                    const itemTotal = activeQty * activeUnitPrice;

                    return (
                        <div
                            key={`${itemId}-${index}`}
                            className={`flex flex-col rounded-3xl border p-4 transition-all ${
                                selected
                                    ? "border-amber-200 bg-amber-50/50 shadow-premium-sm dark:border-amber-900/40 dark:bg-amber-900/10"
                                    : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-800"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <button
                                    type="button"
                                    onClick={() => onToggle(itemId, item.quantity, item.unitPrice)}
                                    className="flex flex-1 items-center gap-3 text-left outline-none"
                                >
                                    <div
                                        className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 ${
                                            selected
                                                ? "border-amber-500 bg-amber-500 text-white"
                                                : "border-slate-200 dark:border-slate-700"
                                        }`}
                                    >
                                        {selected && <i className="bi bi-check-lg text-xs" />}
                                    </div>
                                    <div>
                                        <span
                                            className={`text-[11px] font-black uppercase leading-tight ${
                                                selected
                                                    ? "text-amber-700 dark:text-amber-400"
                                                    : "text-slate-700 dark:text-slate-200"
                                            }`}
                                        >
                                            {item.description}
                                        </span>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                            <span>Qtd. vendida: {item.quantity} un</span>
                                            <span>•</span>
                                            <span className="text-slate-500 dark:text-slate-400">
                                                Vendido a R$ {item.unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </span>
                                            {isUnregistered && (
                                                <span className="text-amber-600 dark:text-amber-400">
                                                    • Sem cadastro (não movimenta estoque)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                                <strong
                                    className={`text-xs ${
                                        selected ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
                                    }`}
                                >
                                    R$ {itemTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </strong>
                            </div>

                            {selected && (
                                <div className="mt-4 flex flex-col gap-3 border-t border-amber-200/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                    {/* Quantidade a devolver */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                                            Qtd. a devolver:
                                        </span>
                                        <div className="flex items-center gap-1 rounded-2xl border border-amber-200 bg-white p-1 dark:border-amber-900/40 dark:bg-slate-950">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onQuantityChange(itemId, (quantities[itemId] || 1) - 1, item.quantity)
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-600 hover:bg-amber-100 dark:text-slate-300 dark:hover:bg-amber-900/30"
                                            >
                                                <i className="bi bi-dash-lg" />
                                            </button>
                                            <input
                                                type="number"
                                                value={quantities[itemId] || 1}
                                                onChange={(event) =>
                                                    onQuantityChange(
                                                        itemId,
                                                        parseInt(event.target.value) || 1,
                                                        item.quantity
                                                    )
                                                }
                                                className="w-10 bg-transparent text-center text-xs font-black outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onQuantityChange(itemId, (quantities[itemId] || 1) + 1, item.quantity)
                                                }
                                                className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-600 hover:bg-amber-100 dark:text-slate-300 dark:hover:bg-amber-900/30"
                                            >
                                                <i className="bi bi-plus-lg" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Valor unitário a devolver */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                                            Valor unit. devolvido:
                                        </span>
                                        <div className="flex items-center rounded-2xl border border-amber-200 bg-white px-2.5 py-1 dark:border-amber-900/40 dark:bg-slate-950">
                                            <span className="mr-1 text-[10px] font-black text-amber-600">R$</span>
                                            <NumericFormat
                                                className="w-20 bg-transparent text-right text-xs font-black text-slate-800 outline-none dark:text-slate-100"
                                                value={activeUnitPrice}
                                                allowNegative={false}
                                                thousandSeparator="."
                                                decimalSeparator=","
                                                decimalScale={2}
                                                fixedDecimalScale
                                                onValueChange={(values: NumberFormatValues) => {
                                                    const val = values.floatValue ?? 0;
                                                    onUnitPriceChange?.(itemId, val);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {hasUnregistered && (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] font-medium text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                    <i className="bi bi-info-circle-fill mr-1.5" />
                    Produtos sem cadastro no sistema <strong>não movimentam estoque</strong> ao gerar ou atender a devolução.
                </p>
            )}
        </div>
    );
};

export default ReturnItemsSelection;
