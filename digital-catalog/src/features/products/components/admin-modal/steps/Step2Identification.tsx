'use client';

import React from 'react';
import { Layers, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryRelationship, Opportunity, ProductFormData, StoreCategory } from '../types';
import { generateSlug } from '../utils/slugAndSkuUtils';
import {
  calculateFromPriceChange,
  calculateFromDiscountPercent,
  calculateFromDiscountFixed,
  calculateFromPromoPrice,
} from '../utils/priceCalculations';

interface Step2IdentificationProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  autoSlug: boolean;
  setAutoSlug: React.Dispatch<React.SetStateAction<boolean>>;
  discountPercent: string;
  setDiscountPercent: React.Dispatch<React.SetStateAction<string>>;
  discountFixed: string;
  setDiscountFixed: React.Dispatch<React.SetStateAction<string>>;
  opportunities: Opportunity[];
  categories: StoreCategory[];
  categoryRelationships: CategoryRelationship[];
  onOpenCategoriesManager: () => void;
}

export function Step2Identification({
  formData,
  setFormData,
  autoSlug,
  setAutoSlug,
  discountPercent,
  setDiscountPercent,
  discountFixed,
  setDiscountFixed,
  opportunities,
  categories,
  categoryRelationships,
  onOpenCategoriesManager,
}: Step2IdentificationProps) {
  const handlePriceChange = (newPrice: string) => {
    const res = calculateFromPriceChange(newPrice, discountPercent, formData.promo_price);
    setFormData((prev) => ({ ...prev, price: newPrice, promo_price: res.promoPrice }));
    setDiscountPercent(res.discountPercent);
    setDiscountFixed(res.discountFixed);
  };

  const handleDiscountPercentChange = (valStr: string) => {
    const res = calculateFromDiscountPercent(formData.price, valStr);
    setDiscountPercent(res.discountPercent);
    setDiscountFixed(res.discountFixed);
    setFormData((prev) => ({ ...prev, promo_price: res.promoPrice }));
  };

  const handleDiscountFixedChange = (valStr: string) => {
    const res = calculateFromDiscountFixed(formData.price, valStr);
    setDiscountPercent(res.discountPercent);
    setDiscountFixed(res.discountFixed);
    setFormData((prev) => ({ ...prev, promo_price: res.promoPrice }));
  };

  const handlePromoPriceFieldChange = (valStr: string) => {
    const res = calculateFromPromoPrice(formData.price, valStr);
    setDiscountPercent(res.discountPercent);
    setDiscountFixed(res.discountFixed);
    setFormData((prev) => ({ ...prev, promo_price: res.promoPrice }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 text-primary font-bold border-b pb-2">
        <Layers className="h-5 w-5" />
        <span>Identificação & Preço</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">
            Nome do Produto <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Nome do produto"
            value={formData.name}
            onChange={(e) => {
              const name = e.target.value;
              setFormData((prev) => ({
                ...prev,
                name,
                slug: autoSlug ? generateSlug(name) : prev.slug,
              }));
            }}
            className="h-12 text-lg"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-700">
              Slug (URL) <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setAutoSlug((prev) => !prev)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                autoSlug
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}
            >
              {autoSlug ? 'Automático' : 'Manual'}
            </button>
          </div>
          <Input
            placeholder="slug-do-produto"
            value={formData.slug}
            onChange={(e) =>
              setFormData({
                ...formData,
                slug: e.target.value.toLowerCase().replace(/ /g, '-'),
              })
            }
            className="h-12"
            readOnly={autoSlug}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">
            Preço Original (R$) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            placeholder="0,00"
            value={formData.price}
            onChange={(e) => handlePriceChange(e.target.value)}
            className="h-12 font-bold"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-700">Oportunidade</label>
            <a
              href="/admin/opportunities"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Gerenciar
            </a>
          </div>
          <Select
            value={formData.opportunity_id || 'none'}
            onValueChange={(val) => {
              const oppId = val === 'none' ? null : val;
              const selectedOpp = opportunities.find((o) => o.id === oppId);
              const isOppSalvado = selectedOpp?.name?.toLowerCase().includes('salvado') || false;
              setFormData((prev) => ({
                ...prev,
                opportunity_id: oppId,
                is_salvado: isOppSalvado,
              }));
            }}
          >
            <SelectTrigger className="h-12 border-2 rounded-xl bg-white">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma (Produto Normal)</SelectItem>
              {opportunities.map((opp) => (
                <SelectItem key={opp.id} value={opp.id}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${opp.badge_color}`} />
                    {opp.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Desconto (%) */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Desconto (%)</label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0"
              value={discountPercent}
              onChange={(e) => handleDiscountPercentChange(e.target.value)}
              className="h-12 font-bold pr-9"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">
              %
            </span>
          </div>
        </div>

        {/* Desconto (R$) */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Desconto (R$)</label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={discountFixed}
              onChange={(e) => handleDiscountFixedChange(e.target.value)}
              className="h-12 font-bold pr-9"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">
              R$
            </span>
          </div>
        </div>

        {/* Preço Promocional (R$) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-700">Preço Promocional</label>
            {(formData.promo_price || discountPercent || discountFixed) && (
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, promo_price: '' }));
                  setDiscountPercent('');
                  setDiscountFixed('');
                }}
                className="text-[10px] font-bold text-red-500 hover:underline"
              >
                Limpar Promoção
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              placeholder="Sem desconto"
              value={formData.promo_price}
              onChange={(e) => handlePromoPriceFieldChange(e.target.value)}
              className="h-12 border-green-200 bg-green-50/30 font-bold pr-9"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-green-600 pointer-events-none">
              R$
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-700">
            Categoria(s) <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={onOpenCategoriesManager}
            className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline transition-colors cursor-pointer"
          >
            <ExternalLink className="h-3 w-3" />
            Gerenciar
          </button>
        </div>
        <div className="mt-2 max-h-[320px] overflow-y-auto rounded-xl border bg-gray-50/50 p-2 custom-scrollbar">
          {categories
            .filter((cat) => cat.type === 'category')
            .map((cat) => {
              const environments = categoryRelationships
                .filter((relationship) => relationship.child_id === cat.id)
                .map((relationship) =>
                  categories.find((item) => item.id === relationship.parent_id)
                )
                .filter((item): item is StoreCategory => item?.type === 'environment');

              return (
                <label
                  key={cat.id}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-white/50 p-3 transition-all hover:border-gray-200 hover:bg-white"
                >
                  <Checkbox
                    checked={formData.category_ids.includes(cat.id)}
                    onCheckedChange={(checked) => {
                      setFormData((prev) => ({
                        ...prev,
                        category_ids: checked
                          ? [...prev.category_ids, cat.id]
                          : prev.category_ids.filter((id) => id !== cat.id),
                      }));
                    }}
                  />
                  <div className="min-w-0">
                    <span className="block text-sm font-medium">{cat.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {environments.length
                        ? `Ambientes: ${environments.map((environment) => environment.name).join(', ')}`
                        : 'Sem ambiente vinculado'}
                    </span>
                  </div>
                </label>
              );
            })}
        </div>
      </div>
    </div>
  );
}
