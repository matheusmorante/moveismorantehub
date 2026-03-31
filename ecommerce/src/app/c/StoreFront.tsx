"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  promotional_price: number | null;
  description: string;
  main_image_url: string | null;
  images?: string[];
  stock_quantity: number;
  status: string;
  category?: string;
  slug?: string;
  search_keywords?: string;
  categoryIds?: string[];
}

interface StoreFrontProps {
  initialProducts: Product[];
  featuredProducts: Product[];
  categories: any[];
  categoryRelationships: { child_id: string; parent_id: string }[];
}

// Sub-component for individual Product Cards
const ProductCard = ({ product, favorites, toggleFavorite, handleFormatPrice, getWhatsAppLink }: { 
  product: Product, 
  favorites: string[], 
  toggleFavorite: (id: string, e: any) => void,
  handleFormatPrice: (v: number) => string,
  getWhatsAppLink: (p: any) => string
}) => {
  const [activeImage, setActiveImage] = useState(product.main_image_url || "");
  const [isHovered, setIsHovered] = useState(false);
  
  const productImages = useMemo(() => {
    const imgs = product.images || [];
    if (product.main_image_url && !imgs.includes(product.main_image_url)) {
      return [product.main_image_url, ...imgs];
    }
    return imgs.length > 0 ? imgs : (product.main_image_url ? [product.main_image_url] : []);
  }, [product.images, product.main_image_url]);

  return (
    <div 
      className="group bg-white rounded-[2.5rem] overflow-hidden border border-neutral-200 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 flex flex-col h-full animate-in fade-in slide-in-from-bottom-8"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[4/5] bg-neutral-50 overflow-hidden">
        <Link href={product.slug ? `/p/${product.slug}` : `/p/${product.id}`} className="block w-full h-full">
          {activeImage ? (
            <img
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-200 gap-4">
              <ShoppingCart size={64} className="opacity-10" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400">Morante</span>
            </div>
          )}
        </Link>
        {isHovered && productImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-2 bg-white/40 backdrop-blur-md rounded-2xl border border-white/30 animate-in slide-in-from-bottom-2 duration-300">
            {productImages.slice(0, 5).map((img, idx) => (
              <button
                key={idx}
                onMouseEnter={() => setActiveImage(img)}
                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? "border-blue-600 scale-110 shadow-lg" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <img src={img} alt={`${product.name} ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <button 
          onClick={(e) => toggleFavorite(product.id, e)}
          className="absolute top-6 right-6 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl border border-white/50 hover:scale-110 transition-transform active:scale-90"
        >
          <span className={`text-xl ${favorites.includes(product.id) ? "text-red-500" : "text-neutral-400 opacity-50"}`}>
            {favorites.includes(product.id) ? "♥" : "♡"}
          </span>
        </button>
      </div>

      <div className="p-10 flex flex-col flex-1 gap-8">
        <div className="space-y-3">
          <Link href={product.slug ? `/p/${product.slug}` : `/p/${product.id}`}>
            <h4 className="font-black text-neutral-900 leading-[1.1] text-xl group-hover:text-blue-600 transition-colors uppercase tracking-tight min-h-[44px] line-clamp-3">
              {product.name}
            </h4>
          </Link>
          <p className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.2em]">Cód: {product.sku || product.id.substring(0,6)}</p>
        </div>

        <div className="mt-auto space-y-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-black text-neutral-900 tracking-tighter">
                {handleFormatPrice(product.sale_price)}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">À VISTA</span>
            </div>
            <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-tight pt-1 border-t border-neutral-100">
              Ou 10x de {handleFormatPrice(product.sale_price / 10)} sem juros
            </p>
          </div>
          <a
            href={getWhatsAppLink(product)}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-neutral-900 hover:bg-emerald-600 text-white flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-neutral-900/10 hover:shadow-emerald-600/30"
          >
            <ShoppingCart size={18} />
            Pedir no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

// Sub-component for the Swipable Card Carousel
const PromotionCarousel = ({ products, handleFormatPrice }: { products: Product[], handleFormatPrice: (v: number) => string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || products.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, 1000); 
    return () => clearInterval(timer);
  }, [products.length, isPaused]);

  if (products.length === 0) return null;

  const getVisibleItems = () => {
    const items = [];
    const total = products.length;
    for (let i = -2; i <= 2; i++) {
        let idx = (currentIndex + i) % total;
        if (idx < 0) idx += total;
        items.push({ product: products[idx], position: i });
    }
    return items;
  };

  return (
    <div 
        className="relative w-full py-16 mb-16 overflow-hidden rounded-[4rem] shadow-[0_30px_70px_-15px_rgba(252,211,77,0.4)] border-4 border-white"
        style={{ background: 'linear-gradient(135deg, #fef08a 0%, #facc15 100%)' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative z-10 text-center mb-10">
        <span className="text-yellow-800 font-black text-[10px] uppercase tracking-[0.4em] bg-white/40 px-6 py-2 rounded-full backdrop-blur-sm border border-white/30">OFERTAS DA SEMANA</span>
        <h3 className="text-yellow-950 text-3xl font-black uppercase tracking-tighter mt-4 drop-shadow-sm">Destaque <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">Morante</span></h3>
      </div>

      <div className="flex items-center justify-center relative h-[420px] w-full z-10">
        {getVisibleItems().map(({ product, position }) => {
          const isCenter = position === 0;
          const isNext = position === 1 || position === -1;
          let translateX = position * 340;
          let scale = isCenter ? 1.2 : (isNext ? 0.9 : 0.7);
          let opacity = isCenter ? 1 : (isNext ? 0.7 : 0.4);
          let zIndex = 10 - Math.abs(position);
          let rotate = position * 5;

          return (
            <div
              key={`${product.id}-${position}`}
              className="absolute transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer"
              style={{
                transform: `translateX(${translateX}px) scale(${scale}) rotate(${rotate}deg)`,
                opacity: opacity,
                zIndex: zIndex,
              }}
              onClick={() => {
                if (position !== 0) {
                    let next = (currentIndex + position) % products.length;
                    if (next < 0) next += products.length;
                    setCurrentIndex(next);
                }
              }}
            >
              <div className="w-[280px] bg-white rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white flex flex-col group transition-all duration-500">
                <div className="relative aspect-square overflow-hidden bg-neutral-100">
                   <img src={product.main_image_url || ""} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   {isCenter && (
                        <div className="absolute top-6 left-6 bg-red-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl animate-bounce">
                           -{Math.round(((product.sale_price - (product.promotional_price || product.sale_price)) / product.sale_price) * 100) || 15}% OFF
                        </div>
                   )}
                </div>
                <div className="p-8 space-y-4">
                  <h5 className="font-black text-neutral-900 text-sm uppercase truncate leading-tight tracking-tight">{product.name}</h5>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-blue-600 tracking-tighter">{handleFormatPrice(product.promotional_price || product.sale_price)}</span>
                        {product.promotional_price && (
                            <span className="text-[10px] text-neutral-400 line-through font-bold">{handleFormatPrice(product.sale_price)}</span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-10 pointer-events-none z-20">
          <button onClick={() => setCurrentIndex((p) => (p - 1 + products.length) % products.length)} className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center text-neutral-900 shadow-xl pointer-events-auto hover:bg-blue-600 hover:text-white transition-all"><ChevronLeft size={28} /></button>
          <button onClick={() => setCurrentIndex((p) => (p + 1) % products.length)} className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center text-neutral-900 shadow-xl pointer-events-auto hover:bg-blue-600 hover:text-white transition-all"><ChevronRight size={28} /></button>
      </div>
    </div>
  );
};

export default function StoreFront({ initialProducts, featuredProducts, categories, categoryRelationships }: StoreFrontProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEnv, setSelectedEnv] = useState<{ id: string, name: string } | null>(null);
  const [selectedCat, setSelectedCat] = useState<{ id: string, name: string } | null>(null);
  const [hoveredEnvId, setHoveredEnvId] = useState<string | null>(null);

  // Identify Ambientes: strictly following the user's provided list
  const ambientes = useMemo(() => {
    const list = [
        "BANHEIRO", "LAVANDERIA", "SALA DE JANTAR", "QUARTO", 
        "COZINHA", "ESCRITÓRIO", "SALA DE ESTAR"
    ];
    return categories
      .filter(c => list.includes(c.name.toUpperCase()))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Map environments to their corresponding categories
  const envToCatsMap = useMemo(() => {
    const map: Record<string, { id: string, name: string }[]> = {};
    ambientes.forEach(env => {
      const childIds = categoryRelationships
        .filter(r => r.parent_id === env.id)
        .map(r => r.child_id);
      
      map[env.id] = categories
        .filter(c => childIds.includes(c.id))
        .map(c => ({ id: c.id, name: c.name }));
    });
    return map;
  }, [ambientes, categories, categoryRelationships]);

  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem("morante_favorites");
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const toggleFavorite = (id: string, e: any) => {
    e.preventDefault();
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem("morante_favorites", JSON.stringify(newFavs));
  };

  const handleFormatPrice = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  const getWhatsAppLink = (product: any) => {
    const text = `Olá! Tenho interesse no produto *${product.name}*.\n\nCód: ${product.sku || (product.id.substring(0,6).toUpperCase())}\n\nPoderia me passar mais informações?`;
    return `https://wa.me/5541997493547?text=${encodeURIComponent(text)}`;
  };

  const filteredProducts = useMemo(() => {
    let result = initialProducts;

    if (selectedEnv && !selectedCat) {
      // Filter products that belong to categories which are children of this environment
      const childCatIds = envToCatsMap[selectedEnv.id]?.map(c => c.id) || [];
      result = result.filter(p => p.categoryIds?.some(cid => childCatIds.includes(cid)));
    }

    if (selectedCat) {
      result = result.filter(p => p.categoryIds?.includes(selectedCat.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.search_keywords?.toLowerCase().includes(q));
    }

    return result;
  }, [initialProducts, selectedEnv, selectedCat, envToCatsMap, searchQuery]);

  return (
    <div className="bg-neutral-50 pb-24 scroll-mt-32 uppercase tracking-tight">
      <div className="bg-white border-b border-neutral-100 pt-16 pb-12">
        <div className="container mx-auto px-4 space-y-12">
          {/* Search Bar */}
          <div className="relative w-full group max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-blue-600/5 blur-3xl group-within:bg-blue-600/10 transition-colors rounded-[3rem]" />
            <div className="relative flex items-center bg-neutral-50 border-2 border-neutral-100 group-within:border-blue-500 rounded-3xl p-1 shadow-sm transition-all group-within:shadow-2xl group-within:shadow-blue-950/5">
              <div className="pl-8 pr-4 text-neutral-400 group-within:text-blue-600 transition-colors"><Search size={26} /></div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="PROCURANDO ALGO ESPECIAL?"
                className="w-full py-5 text-xl font-black bg-transparent outline-none placeholder:text-neutral-300 tracking-tight"
              />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="p-3 mr-3 bg-white hover:bg-neutral-100 rounded-2xl shadow-sm"><X size={20} /></button>}
            </div>
          </div>

          {/* Environment Navigation Container */}
          <div className="relative">
            <div className="flex flex-wrap items-center justify-center gap-5 relative">
              {ambientes.map((env) => (
                <div 
                  key={env.id} 
                  className="group relative"
                  onMouseEnter={() => setHoveredEnvId(env.id)}
                  onMouseLeave={() => setHoveredEnvId(null)}
                >
                  <button
                    onClick={() => { setSelectedEnv(env); setSelectedCat(null); }}
                    className={`min-w-[200px] px-8 py-4 rounded-2.5xl text-xs font-black uppercase tracking-widest transition-all shadow-xl border-2 flex items-center justify-between gap-4 ${selectedEnv?.id === env.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-neutral-400 border-neutral-100 hover:border-blue-500"}`}
                  >
                    {env.name}
                    <ChevronRight size={16} className={`transition-transform duration-300 ${hoveredEnvId === env.id ? "rotate-90" : ""}`} />
                  </button>
                </div>
              ))}
            </div>

            {/* FULL WIDTH Categories Modal (Hover State) */}
            {hoveredEnvId && envToCatsMap[hoveredEnvId]?.length > 0 && (
              <div 
                className="absolute top-full left-0 w-full pt-6 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 ease-out pointer-events-none"
                onMouseEnter={() => setHoveredEnvId(hoveredEnvId)}
                onMouseLeave={() => setHoveredEnvId(null)}
              >
                <div className="bg-white rounded-[4rem] shadow-[0_60px_100px_-20px_rgba(0,0,0,0.15)] border-4 border-neutral-50 p-16 overflow-hidden pointer-events-auto">
                    <div className="text-center mb-12 space-y-3">
                        <span className="text-blue-600 font-black text-[11px] uppercase tracking-[0.4em] bg-blue-50 px-8 py-2 rounded-full inline-block">Categorias Disponíveis</span>
                        <h6 className="text-4xl font-black text-neutral-900 uppercase tracking-tighter">Escolha um Segmento</h6>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8">
                        {envToCatsMap[hoveredEnvId].map((subCat) => (
                        <button
                            key={subCat.id}
                            onClick={() => { 
                                const env = ambientes.find(a => a.id === hoveredEnvId);
                                if (env) setSelectedEnv(env); 
                                setSelectedCat(subCat); 
                                setHoveredEnvId(null); 
                                document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`group/cat flex flex-col items-center gap-5 p-10 rounded-[3rem] border-2 transition-all duration-500 text-center ${
                            selectedCat?.id === subCat.id 
                            ? "bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-500/40" 
                            : "bg-neutral-50 border-neutral-50 text-neutral-500 hover:bg-white hover:border-blue-500 hover:text-blue-600 hover:shadow-2xl hover:scale-[1.05]"
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${selectedCat?.id === subCat.id ? "bg-white/20" : "bg-white text-blue-600 shadow-sm group-hover/cat:bg-blue-600 group-hover/cat:text-white"}`}>
                            <ShoppingCart size={24} />
                            </div>
                            <span className="text-[13px] font-black uppercase tracking-widest">{subCat.name}</span>
                        </button>
                        ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-neutral-100 flex justify-center">
                        <button 
                            onClick={() => setHoveredEnvId(null)}
                            className="text-neutral-300 hover:text-blue-600 text-[9px] font-black uppercase tracking-[0.4em] transition-all"
                        >
                            FECHAR MENU ×
                        </button>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-24">
        <PromotionCarousel products={featuredProducts} handleFormatPrice={handleFormatPrice} />

        <section id="produtos" className="scroll-mt-32 mt-32">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div className="space-y-2">
              <div className="w-12 h-1.5 bg-blue-600 rounded-full"></div>
              <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-neutral-900 uppercase">
                {selectedCat ? selectedCat.name : (selectedEnv ? `Móveis para ${selectedEnv.name}` : "Nosso Catálogo")}
              </h3>
              <p className="text-neutral-500 font-bold uppercase text-[10px] tracking-[0.2em]">{filteredProducts.length} itens encontrados</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                handleFormatPrice={handleFormatPrice}
                getWhatsAppLink={getWhatsAppLink}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
