'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Layers,
  Info,
  Link2,
  Link2Off,
  Tags,
  Trash2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { storefrontVariationFormSchema } from '@/shared-utils/storefrontProductFormSchemas';
import { DbAttribute, DbAttributeValue, ProductFormData, TempVariation } from '../types';
import {
  parseStorefrontPrice,
  calculateFromPriceChange,
  calculateFromDiscountPercent,
  calculateFromDiscountFixed,
  calculateFromPromoPrice,
  calculateInitialDiscounts,
} from '../utils/priceCalculations';
import { generateAutoSku, getDefaultVariationName } from '../utils/slugAndSkuUtils';

interface VariationFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialVariation: TempVariation | null;
  editingIndex: number | null;
  productFormData: ProductFormData;
  dbAttributes: DbAttribute[];
  dbAttributeValues: DbAttributeValue[];
  onSave: (variation: TempVariation, index: number | null) => void;
  onOpenFastCreate: () => void;
}

export function VariationFormModal({
  isOpen,
  onOpenChange,
  initialVariation,
  editingIndex,
  productFormData,
  dbAttributes,
  dbAttributeValues,
  onSave,
  onOpenFastCreate,
}: VariationFormModalProps) {
  const [varStep, setVarStep] = useState(1);
  const [varDiscountPercent, setVarDiscountPercent] = useState('');
  const [varDiscountFixed, setVarDiscountFixed] = useState('');

  const [varFormState, setVarFormState] = useState<TempVariation>({
    sku: '',
    price: productFormData.price,
    promo_price: productFormData.promo_price,
    description: productFormData.description,
    width: productFormData.width,
    depth: productFormData.depth,
    height: productFormData.height,
    image_url: '',
    attributes: {},
    use_parent_price: true,
    use_parent_promo_price: true,
    use_parent_dimensions: true,
    use_parent_description: true,
    use_parent_name: true,
  });

  const variationForm = useZodForm(storefrontVariationFormSchema, varFormState);
  const showFormError = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    toast.error(Object.values(flattenFormErrors(errors))[0]);

  useEffect(() => {
    if (isOpen) {
      setVarStep(1);
      if (initialVariation) {
        setVarFormState({
          ...initialVariation,
          use_parent_price: initialVariation.use_parent_price !== false,
          use_parent_promo_price: initialVariation.use_parent_promo_price !== false,
          use_parent_dimensions: initialVariation.use_parent_dimensions !== false,
          use_parent_description: initialVariation.use_parent_description !== false,
          use_parent_name: initialVariation.use_parent_name !== false,
        });

        const isParentPrice = initialVariation.use_parent_price !== false;
        const isParentPromo = initialVariation.use_parent_promo_price !== false;
        const origPrice = isParentPrice ? productFormData.price : initialVariation.price || '';
        const promoPrice = isParentPromo
          ? productFormData.promo_price
          : initialVariation.promo_price || '';

        const discounts = calculateInitialDiscounts(origPrice, promoPrice);
        setVarDiscountPercent(discounts.discountPercent);
        setVarDiscountFixed(discounts.discountFixed);
      } else {
        const initialAttrs: Record<string, string> = {};
        if (dbAttributes.length > 0) {
          initialAttrs[dbAttributes[0].name] = '';
        }
        setVarFormState({
          sku: '',
          price: productFormData.price,
          promo_price: productFormData.promo_price,
          description: productFormData.description,
          width: productFormData.width,
          depth: productFormData.depth,
          height: productFormData.height,
          image_url: '',
          attributes: initialAttrs,
          use_parent_price: true,
          use_parent_promo_price: true,
          use_parent_dimensions: true,
          use_parent_description: true,
          use_parent_name: true,
        });
        setVarDiscountPercent('');
        setVarDiscountFixed('');
      }
    }
  }, [isOpen, initialVariation, productFormData, dbAttributes]);

  const handleVarPriceChange = (newPrice: string) => {
    const res = calculateFromPriceChange(newPrice, varDiscountPercent, varFormState.promo_price || '');
    setVarFormState((prev) => ({
      ...prev,
      price: newPrice,
      promo_price: res.promoPrice,
      use_parent_price: false,
    }));
    setVarDiscountPercent(res.discountPercent);
    setVarDiscountFixed(res.discountFixed);
  };

  const handleVarDiscountPercentChange = (valStr: string) => {
    const basePrice =
      varFormState.use_parent_price !== false ? productFormData.price : varFormState.price || '';
    const res = calculateFromDiscountPercent(basePrice, valStr);
    setVarDiscountPercent(res.discountPercent);
    setVarDiscountFixed(res.discountFixed);
    setVarFormState((prev) => ({ ...prev, promo_price: res.promoPrice }));
  };

  const handleVarDiscountFixedChange = (valStr: string) => {
    const basePrice =
      varFormState.use_parent_price !== false ? productFormData.price : varFormState.price || '';
    const res = calculateFromDiscountFixed(basePrice, valStr);
    setVarDiscountPercent(res.discountPercent);
    setVarDiscountFixed(res.discountFixed);
    setVarFormState((prev) => ({ ...prev, promo_price: res.promoPrice }));
  };

  const handleVarPromoPriceFieldChange = (valStr: string) => {
    const basePrice =
      varFormState.use_parent_price !== false ? productFormData.price : varFormState.price || '';
    const res = calculateFromPromoPrice(basePrice, valStr);
    setVarDiscountPercent(res.discountPercent);
    setVarDiscountFixed(res.discountFixed);
    setVarFormState((prev) => ({ ...prev, promo_price: res.promoPrice }));
  };

  const handleSaveVarForm = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (varStep < 3) {
      setVarStep(varStep + 1);
      return;
    }

    await variationForm.validateAndRun(varFormState, (validated) => {
      const updatedAttributes = { ...validated.attributes };
      const generatedSku = generateAutoSku(productFormData.slug, updatedAttributes);

      const updatedVar: TempVariation = {
        ...validated,
        id:
          validated.id || (typeof window !== 'undefined' ? window.crypto.randomUUID() : undefined),
        sku: generatedSku,
        stock: validated.stock || '999',
      };

      if (validated.use_parent_name !== false) {
        updatedVar.name = getDefaultVariationName(productFormData.name, updatedAttributes);
      } else {
        updatedVar.name = validated.name || 'Padrão';
      }

      onSave(updatedVar, editingIndex);
      onOpenChange(false);
    }, showFormError);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 border-none shadow-2xl bg-white gap-0
          w-full h-[100dvh] max-h-[100dvh] rounded-none flex flex-col
          sm:rounded-[24px] sm:w-[90vw] sm:h-[85vh] sm:max-h-[750px] sm:max-w-[650px]"
      >
        <form
          noValidate
          onSubmit={handleSaveVarForm}
          className="flex flex-col h-full min-h-0 overflow-hidden"
        >
          <DialogHeader className="p-4 md:p-6 bg-primary text-white space-y-2 flex-shrink-0 relative">
            <div className="flex justify-between items-start pr-6">
              <div className="space-y-0.5">
                <DialogTitle className="text-base md:text-xl font-black tracking-tight flex items-center gap-1.5">
                  {editingIndex !== null ? 'Editar Variação' : 'Nova Variação'}
                  <span className="text-xs font-normal opacity-80">
                    | {productFormData.name || 'Produto Pai'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/70 text-xs font-medium">
                  Configure os dados específicos desta variação.
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className="text-white border-white/40 bg-white/10 px-2 py-0.5 font-bold shrink-0 text-xs"
              >
                {varStep}/3
              </Badge>
            </div>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setVarStep(s)}
                  className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold border-b-4 transition-all hover:bg-white/5 rounded-t-lg ${
                    varStep === s
                      ? 'border-white text-white bg-white/10'
                      : 'border-white/20 text-white/60 hover:text-white/90'
                  }`}
                >
                  {s === 1
                    ? '1. Foto Vinculada'
                    : s === 2
                      ? '2. Identificação & Preço'
                      : '3. Ficha Técnica'}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div
            className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 custom-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Etapa 1: Foto Vinculada */}
            {varStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
                  <Camera className="h-5 w-5" />
                  <span>
                    Vincular Foto <span className="text-red-500">*</span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground bg-blue-50/50 text-blue-700 p-3 rounded-2xl border border-blue-100">
                  Selecione obrigatoriamente uma das fotos adicionadas na Etapa 1 do produto principal
                  para representar esta variação.
                </p>

                {productFormData.images.length === 0 ? (
                  <div className="text-center p-8 border border-dashed rounded-2xl text-xs text-red-500 bg-red-50 font-bold">
                    Nenhuma imagem disponível no produto principal. Adicione imagens na Etapa 1 primeiro!
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {productFormData.images.map((url, imgIndex) => {
                      const selectedUrls = varFormState.image_url
                        ? varFormState.image_url.split(',').filter(Boolean)
                        : [];
                      const isSelected = selectedUrls.includes(url);
                      const selectOrderIndex = selectedUrls.indexOf(url);

                      return (
                        <button
                          key={imgIndex}
                          type="button"
                          onClick={() => {
                            let updatedUrls = [...selectedUrls];
                            if (isSelected) {
                              updatedUrls = updatedUrls.filter((u) => u !== url);
                            } else {
                              if (updatedUrls.length >= 12) {
                                toast.error('Você pode selecionar no máximo 12 fotos.');
                                return;
                              }
                              updatedUrls.push(url);
                            }
                            setVarFormState((prev) => ({
                              ...prev,
                              image_url: updatedUrls.join(','),
                            }));
                          }}
                          className={`relative aspect-square rounded-2xl overflow-hidden border-4 bg-gray-50 transition-all ${
                            isSelected
                              ? 'border-primary scale-[1.03] shadow-md'
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Foto ${imgIndex + 1}`}
                            className="object-cover h-full w-full"
                          />
                          {isSelected && (
                            <Badge className="absolute top-1 right-1 bg-primary text-[8px] px-1 py-0 shadow z-10">
                              #{selectOrderIndex + 1} Vinculada
                            </Badge>
                          )}
                          <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[8px] font-bold px-1.5 py-0.2 rounded">
                            Foto {imgIndex + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Etapa 2: Identificação & Preço */}
            {varStep === 2 && (
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
                    <h6 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Atributos
                    </h6>
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
                          <div
                            key={idx}
                            className="flex items-end gap-3 animate-in fade-in duration-200"
                          >
                            <div className="flex-1 space-y-1.5">
                              <label className="text-[10px] text-gray-500 font-bold uppercase">
                                Atributo
                              </label>
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
                              <label className="text-[10px] text-gray-500 font-bold uppercase">
                                Valor
                              </label>
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
            )}

            {/* Etapa 3: Ficha Técnica */}
            {varStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
                  <Info className="h-5 w-5" />
                  <span>Ficha Técnica da Variante</span>
                </div>

                {/* Medidas */}
                <div className="space-y-2 border-b pb-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">Medidas (cm)</label>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setVarFormState((prev) => ({
                          ...prev,
                          use_parent_dimensions: !prev.use_parent_dimensions,
                          width: !prev.use_parent_dimensions ? productFormData.width : prev.width,
                          depth: !prev.use_parent_dimensions ? productFormData.depth : prev.depth,
                          height: !prev.use_parent_dimensions ? productFormData.height : prev.height,
                        }))
                      }
                      className={`p-1.5 rounded-lg transition-all ${
                        varFormState.use_parent_dimensions !== false
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                      }`}
                      title={
                        varFormState.use_parent_dimensions !== false
                          ? 'Desvincular Medidas do Pai'
                          : 'Sincronizar Medidas com o Pai'
                      }
                    >
                      {varFormState.use_parent_dimensions !== false ? (
                        <Link2 className="h-3.5 w-3.5" />
                      ) : (
                        <Link2Off className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  {varFormState.use_parent_dimensions === false && (
                    <div className="grid grid-cols-3 gap-3 animate-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500">Largura</span>
                        <Input
                          placeholder="L"
                          value={varFormState.width}
                          onChange={(e) =>
                            setVarFormState((prev) => ({ ...prev, width: e.target.value }))
                          }
                          className="h-10 text-xs text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500">
                          {productFormData.depth_use_length ? 'Comprimento' : 'Profundidade'}
                        </span>
                        <Input
                          placeholder={productFormData.depth_use_length ? 'C' : 'P'}
                          value={varFormState.depth}
                          onChange={(e) =>
                            setVarFormState((prev) => ({ ...prev, depth: e.target.value }))
                          }
                          className="h-10 text-xs text-center"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500">Altura</span>
                        <Input
                          placeholder="A"
                          value={varFormState.height}
                          onChange={(e) =>
                            setVarFormState((prev) => ({ ...prev, height: e.target.value }))
                          }
                          className="h-10 text-xs text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">Descrição</label>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setVarFormState((prev) => ({
                          ...prev,
                          use_parent_description: !prev.use_parent_description,
                          description: !prev.use_parent_description
                            ? productFormData.description
                            : prev.description,
                        }))
                      }
                      className={`p-1.5 rounded-lg transition-all ${
                        varFormState.use_parent_description !== false
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                      }`}
                      title={
                        varFormState.use_parent_description !== false
                          ? 'Desvincular Descrição do Pai'
                          : 'Sincronizar Descrição com o Pai'
                      }
                    >
                      {varFormState.use_parent_description !== false ? (
                        <Link2 className="h-3.5 w-3.5" />
                      ) : (
                        <Link2Off className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  {varFormState.use_parent_description === false && (
                    <Textarea
                      placeholder="Descrição personalizada da variação"
                      value={varFormState.description}
                      onChange={(e) =>
                        setVarFormState((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={3}
                      className="text-xs resize-none animate-in slide-in-from-top-1 duration-200"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 md:p-6 bg-gray-50 border-t flex flex-row items-center justify-between gap-3 flex-shrink-0">
            <div>
              {varStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVarStep(varStep - 1)}
                  className="h-10 px-4 font-bold border-2 hover:bg-white"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Voltar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="h-10 px-4 font-bold text-gray-500 hover:text-red-500 hover:bg-red-50"
                >
                  Cancelar
                </Button>
              )}
            </div>
            {varStep < 3 ? (
              <Button
                type="button"
                onClick={() => setVarStep(varStep + 1)}
                className="h-10 px-6 font-bold"
              >
                Próximo
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="h-10 px-6 font-bold bg-green-600 hover:bg-green-700">
                Salvar Variação
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
