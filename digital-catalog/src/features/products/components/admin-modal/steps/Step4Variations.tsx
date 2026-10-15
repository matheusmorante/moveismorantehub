'use client';

import React from 'react';
import { Layers, Plus, Tags, X, Pencil, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductFormData, TempVariation } from '../types';

interface Step4VariationsProps {
  variationsEnabled: boolean;
  setVariationsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  productVariations: TempVariation[];
  setProductVariations: React.Dispatch<React.SetStateAction<TempVariation[]>>;
  formData: ProductFormData;
  onOpenAddVar: () => void;
  onOpenEditVar: (index: number) => void;
  onOpenFastCreate: () => void;
}

export function Step4Variations({
  variationsEnabled,
  setVariationsEnabled,
  productVariations,
  setProductVariations,
  formData,
  onOpenAddVar,
  onOpenEditVar,
  onOpenFastCreate,
}: Step4VariationsProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 text-primary font-bold">
          <Layers className="h-5 w-5" />
          <span>Grade de Variações do Produto</span>
        </div>
        {variationsEnabled && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (
                  confirm(
                    'Tem certeza que deseja desativar as variações? Todas as variações criadas serão perdidas ao salvar.'
                  )
                ) {
                  setVariationsEnabled(false);
                  setProductVariations([]);
                }
              }}
              className="h-9 text-xs text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 rounded-lg"
            >
              Desativar Variações
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenFastCreate}
              className="h-9 text-xs gap-1.5 rounded-lg border-primary/20 text-primary hover:bg-primary/5"
            >
              <Tags className="h-4 w-4" /> Gerenciar Atributos/Valores
            </Button>
            <Button
              type="button"
              onClick={onOpenAddVar}
              className="h-9 text-xs gap-1.5 rounded-lg font-bold"
            >
              <Plus className="h-4 w-4" /> Adicionar Variação
            </Button>
          </div>
        )}
      </div>

      {!variationsEnabled ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50 space-y-4">
          <Layers className="h-12 w-12 text-gray-300 animate-pulse" />
          <div className="text-center space-y-1">
            <h4 className="font-bold text-gray-700">Este produto possui variações?</h4>
            <p className="text-xs text-muted-foreground max-w-xs">
              Ative variações se este produto tiver diferentes opções de tamanho, cor, material,
              etc. com fotos dedicadas.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setVariationsEnabled(true);
              if (productVariations.length === 0) {
                setProductVariations([
                  {
                    sku: '',
                    price: formData.price,
                    promo_price: formData.promo_price,
                    description: formData.description,
                    width: formData.width,
                    depth: formData.depth,
                    height: formData.height,
                    image_url: '',
                    attributes: {},
                    use_parent_price: true,
                    use_parent_promo_price: true,
                    use_parent_dimensions: true,
                    use_parent_description: true,
                    stock: '999',
                  },
                ]);
              }
            }}
            className="font-bold rounded-xl"
          >
            Ativar Variações para este Produto
          </Button>
        </div>
      ) : productVariations.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-sm text-muted-foreground italic">
          Nenhuma variação adicionada ainda. Clique em "Adicionar Variação" acima para começar.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Combinações Ativas ({productVariations.length})
            </h5>
            <button
              type="button"
              onClick={() => setProductVariations([])}
              className="text-xs font-bold text-red-500 hover:underline"
            >
              Limpar Variações
            </button>
          </div>

          {/* Mobile View: Cards */}
          <div className="md:hidden space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {productVariations.map((v, index) => {
              const varPrice = v.use_parent_price !== false ? formData.price : v.price;
              const varPromoPrice =
                v.use_parent_promo_price !== false ? formData.promo_price : v.promo_price;

              return (
                <div
                  key={index}
                  className="border rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3 relative"
                >
                  <div className="relative h-14 w-14 rounded-xl overflow-hidden border shrink-0 bg-gray-50">
                    {v.image_url ? (
                      <img
                        src={v.image_url.split(',')[0]}
                        alt="Variante"
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 m-auto text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h6 className="font-bold text-xs text-gray-800 line-clamp-1">
                      {v.name || 'Sem Nome'}
                    </h6>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      SKU: {v.sku || 'Auto'}
                    </p>
                    <div className="mt-1">
                      {varPromoPrice ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-red-500 line-through font-bold">
                            R$ {parseFloat(varPrice || '0').toFixed(2)}
                          </span>
                          <span className="text-xs font-black text-primary">
                            R$ {parseFloat(varPromoPrice).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-gray-800">
                          {varPrice
                            ? `R$ ${parseFloat(varPrice).toFixed(2)}`
                            : 'Preço herdado'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onOpenEditVar(index)}
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setProductVariations((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* PC View: Table */}
          <div className="hidden md:block overflow-x-auto border rounded-xl bg-white max-h-[350px] custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 text-xs font-bold text-gray-700 uppercase border-b sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-[80px]">Foto</th>
                  <th className="p-3">Nome da Variação</th>
                  <th className="p-3 w-[180px]">SKU</th>
                  <th className="p-3 w-[150px]">Preço</th>
                  <th className="p-3 w-[100px] text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productVariations.map((v, index) => {
                  const varPrice = v.use_parent_price !== false ? formData.price : v.price;
                  const varPromoPrice =
                    v.use_parent_promo_price !== false ? formData.promo_price : v.promo_price;
                  return (
                    <tr key={index} className="hover:bg-gray-50/50">
                      <td className="p-3">
                        <div className="relative h-10 w-10 rounded border overflow-hidden bg-gray-50">
                          {v.image_url ? (
                            <img
                              src={v.image_url.split(',')[0]}
                              alt="Variante"
                              className="object-cover h-full w-full"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 m-auto text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-gray-800">
                        {v.name || 'Sem Nome'}
                      </td>
                      <td className="p-3 text-xs font-mono text-gray-500">
                        {v.sku || 'Auto'}
                      </td>
                      <td className="p-3">
                        {varPromoPrice ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-red-500 line-through font-bold">
                              R$ {parseFloat(varPrice || '0').toFixed(2)}
                            </span>
                            <span className="font-extrabold text-xs text-primary">
                              R$ {parseFloat(varPromoPrice).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-xs text-gray-800">
                            {varPrice
                              ? `R$ ${parseFloat(varPrice).toFixed(2)}`
                              : 'Preço herdado'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onOpenEditVar(index)}
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setProductVariations((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Excluir"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
