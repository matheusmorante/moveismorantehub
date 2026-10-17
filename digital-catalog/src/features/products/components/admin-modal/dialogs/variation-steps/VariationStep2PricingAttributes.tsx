'use client';

import React from 'react';
import { Layers, Link2, Link2Off, Tags, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { DbAttribute, DbAttributeValue, ProductFormData, TempVariation } from '../../types';
import { calculateInitialDiscounts } from '../../utils/priceCalculations';
import { getDefaultVariationName } from '../../utils/slugAndSkuUtils';

export interface VariationStep2PricingAttributesProps {
  readonly productFormData: ProductFormData;
  readonly varFormState: TempVariation;
  readonly setVarFormState: React.Dispatch<React.SetStateAction<TempVariation>>;
  readonly dbAttributes: readonly DbAttribute[];
  readonly dbAttributeValues: readonly DbAttributeValue[];
  readonly varDiscountPercent: string;
  readonly setVarDiscountPercent: (val: string) => void;
  readonly varDiscountFixed: string;
  readonly setVarDiscountFixed: (val: string) => void;
  readonly onOpenFastCreate: () => void;
  readonly handleVarPriceChange: (newPrice: string) => void;
  readonly handleVarDiscountPercentChange: (valStr: string) => void;
  readonly handleVarDiscountFixedChange: (valStr: string) => void;
  readonly handleVarPromoPriceFieldChange: (valStr: string) => void;
}

export function VariationStep2PricingAttributes({
  productFormData,
  varFormState,
  setVarFormState,
  dbAttributes,
  dbAttributeValues,
  varDiscountPercent,
  setVarDiscountPercent,
  varDiscountFixed,
  setVarDiscountFixed,
  onOpenFastCreate,
  handleVarPriceChange,
  handleVarDiscountPercentChange,
  handleVarDiscountFixedChange,
  handleVarPromoPriceFieldChange,
}: VariationStep2PricingAttributesProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
        <Layers className="h-5 w-5" />
        <span>Atributos & Preço</span>
      </div>

      {/* Nome / Título da Variante */}
      <div className="space-y-2 border-b pb-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-700">Título da Variante</label>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setVarFormState((prev) => {
                const nextUse = !prev.use_parent_name;
                return {
                  ...prev,
                  use_parent_name: nextUse,
                  name: nextUse
                    ? getDefaultVariationName(productFormData.name, prev.attributes)
                    : prev.name || '',
                };
              })
            }
            className={`p-1.5 rounded-lg transition-all ${
              varFormState.use_parent_name !== false
                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
            title={
              varFormState.use_parent_name !== false
                ? 'Desvincular do Nome do Pai'
                : 'Sincronizar Nome com o Pai'
            }
          >
            {varFormState.use_parent_name !== false ? (
              <Link2 className="h-3.5 w-3.5" />
            ) : (
              <Link2Off className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {varFormState.use_parent_name === false ? (
          <Input
            placeholder="Título personalizado da variante"
            value={varFormState.name || ''}
            onChange={(e) => setVarFormState((prev) => ({ ...prev, name: e.target.value }))}
            required
            className="h-11 text-xs font-bold animate-in slide-in-from-top-1 duration-200"
          />
        ) : (
          <div className="text-xs text-muted-foreground bg-gray-50 p-2.5 rounded-lg border italic">
            {getDefaultVariationName(productFormData.name, varFormState.attributes)}
          </div>
        )}
      </div>

      <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border">
        <div className="flex items-center justify-between border-b pb-2">
          <h6 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Atributos</h6>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenFastCreate}
              className="h-7 text-[10px] font-bold gap-1 text-primary hover:bg-primary/5 px-2"
            >
              <Tags className="h-3 w-3" /> Gerenciar Atributos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const availableAttr = dbAttributes.find(
                  (a) => !Object.keys(varFormState.attributes).includes(a.name)
                );
                if (availableAttr) {
                  setVarFormState((prev) => ({
                    ...prev,
                    attributes: {
                      ...prev.attributes,
                      [availableAttr.name]: '',
                    },
                  }));
                } else if (dbAttributes.length > 0) {
                  toast.error('Todos os atributos disponíveis já foram adicionados.');
                }
              }}
              className="h-7 text-[10px] font-bold"
            >
              + Adicionar Atributo
            </Button>
          </div>
        </div>

        {Object.keys(varFormState.attributes).length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-2">
            Nenhum atributo adicionado ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(varFormState.attributes).map(([attrName, attrVal], idx) => {
              const currentAttr = dbAttributes.find((a) => a.name === attrName);
              const attrVals = currentAttr
                ? dbAttributeValues.filter((val) => val.attribute_id === currentAttr.id)
                : [];

              return (
                <div key={idx} className="flex items-end gap-3 animate-in fade-in duration-200">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Atributo</label>
                    <select
                      value={attrName}
                      onChange={(e) => {
                        const newName = e.target.value;
                        if (newName === attrName) return;
                        setVarFormState((prev) => {
                          const updated = { ...prev.attributes };
                          delete updated[attrName];
                          updated[newName] = '';
                          return { ...prev, attributes: updated };
                        });
                      }}
                      className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {dbAttributes.map((a) => (
                        <option
                          key={a.id}
                          value={a.name}
                          disabled={
                            Object.keys(varFormState.attributes).includes(a.name) &&
                            a.name !== attrName
                          }
                        >
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Valor</label>
                    <select
                      value={attrVal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVarFormState((prev) => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            [attrName]: val,
                          },
                        }));
                      }}
                      required
                      className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Selecione...</option>
                      {attrVals.map((val) => (
                        <option key={val.id} value={val.value}>
                          {val.value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setVarFormState((prev) => {
                        const updated = { ...prev.attributes };
                        delete updated[attrName];
                        return { ...prev, attributes: updated };
                      });
                    }}
                    className="h-10 w-10 text-red-500 hover:bg-red-50 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preço */}
      <div className="space-y-2 border-b pb-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-700">Preço</label>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setVarFormState((prev) => {
                const nextUse = !prev.use_parent_price;
                const newPrice = nextUse ? productFormData.price : prev.price;
                const promoPrice =
                  prev.use_parent_promo_price !== false
                    ? productFormData.promo_price
                    : prev.promo_price || '';

                const discounts = calculateInitialDiscounts(newPrice || '', promoPrice);
                setVarDiscountPercent(discounts.discountPercent);
                setVarDiscountFixed(discounts.discountFixed);

                return {
                  ...prev,
                  use_parent_price: nextUse,
                  price: newPrice,
                };
              });
            }}
            className={`p-1.5 rounded-lg transition-all ${
              varFormState.use_parent_price !== false
                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
            title={
              varFormState.use_parent_price !== false
                ? 'Desvincular Preço do Pai'
                : 'Sincronizar Preço com o Pai'
            }
          >
            {varFormState.use_parent_price !== false ? (
              <Link2 className="h-3.5 w-3.5" />
            ) : (
              <Link2Off className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {varFormState.use_parent_price === false && (
          <Input
            type="number"
            step="0.01"
            placeholder="Preço personalizado"
            value={varFormState.price}
            onChange={(e) => handleVarPriceChange(e.target.value)}
            required
            className="h-11 text-xs font-bold animate-in slide-in-from-top-1 duration-200"
          />
        )}
      </div>

      {/* Preço Promocional & Descontos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-700">Preço Promocional</label>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setVarFormState((prev) => {
                const nextUse = !prev.use_parent_promo_price;
                const newPromo = nextUse ? productFormData.promo_price : prev.promo_price;
                const origPrice =
                  prev.use_parent_price !== false
                    ? productFormData.price
                    : prev.price || '';

                const discounts = calculateInitialDiscounts(origPrice, newPromo || '');
                setVarDiscountPercent(discounts.discountPercent);
                setVarDiscountFixed(discounts.discountFixed);

                return {
                  ...prev,
                  use_parent_promo_price: nextUse,
                  promo_price: newPromo,
                };
              });
            }}
            className={`p-1.5 rounded-lg transition-all ${
              varFormState.use_parent_promo_price !== false
                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
            }`}
            title={
              varFormState.use_parent_promo_price !== false
                ? 'Desvincular Preço Promocional do Pai'
                : 'Sincronizar Preço Promocional com o Pai'
            }
          >
            {varFormState.use_parent_promo_price !== false ? (
              <Link2 className="h-3.5 w-3.5" />
            ) : (
              <Link2Off className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {varFormState.use_parent_promo_price === false && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-in slide-in-from-top-1 duration-200">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Desconto (%)</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={varDiscountPercent}
                  onChange={(e) => handleVarDiscountPercentChange(e.target.value)}
                  className="h-11 font-bold pr-8 text-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Desconto (R$)</label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={varDiscountFixed}
                  onChange={(e) => handleVarDiscountFixedChange(e.target.value)}
                  className="h-11 font-bold pr-8 text-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                  R$
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-700">Preço Promocional</label>
                {(varFormState.promo_price || varDiscountPercent || varDiscountFixed) && (
                  <button
                    type="button"
                    onClick={() => {
                      setVarFormState((prev) => ({ ...prev, promo_price: '' }));
                      setVarDiscountPercent('');
                      setVarDiscountFixed('');
                    }}
                    className="text-[9px] font-bold text-red-500 hover:underline"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Sem desconto"
                  value={varFormState.promo_price}
                  onChange={(e) => handleVarPromoPriceFieldChange(e.target.value)}
                  className="h-11 text-xs font-bold border-green-200 bg-green-50/10"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
