import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Phone, Ruler, Box, ArrowLeft } from "lucide-react";

export const revalidate = 3600; // Revalidate every hour

async function getProduct(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .eq("deleted", false)
    .single();

  if (error || !data) {
    // Try by ID if slug fails (fallback for older products)
    const { data: byId, error: errorId } = await supabase
      .from("products")
      .select("*")
      .eq("id", slug)
      .eq("active", true)
      .eq("deleted", false)
      .single();
    
    if (errorId || !byId) return null;
    return byId;
  }
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: "Produto não encontrado" };

  return {
    title: product.meta_title || `${product.description} | Móveis Morante`,
    description: product.meta_description || product.ecommerce_description || product.description,
    openGraph: {
      title: product.meta_title || product.description,
      description: product.meta_description || product.ecommerce_description,
      images: Array.isArray(product.images) ? [product.images[0]] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const handleFormatPrice = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const getWhatsAppLink = (p: any) => {
    const phoneNumber = "5541997493547";
    const text = `Olá! Tenho interesse no produto *${p.description}*.\n\nPreço: ${handleFormatPrice(p.unit_price)}\nSKU: ${p.code || 'N/A'}\n\nVi no site e gostaria de saber mais.`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900">
      <header className="sticky top-0 z-50 bg-white/80 border-b border-neutral-100 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={18} />
            Voltar para Loja
          </Link>
          <Link href="/" className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black italic shadow-lg">M</div>
             <span className="font-black text-lg tracking-tighter text-neutral-800 hidden sm:block">MÓVEIS<span className="text-blue-600"> MORANTE</span></span>
          </Link>
          <div className="w-24"></div> {/* Spacer */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Images Section */}
          <div className="space-y-6">
            <div className="aspect-square bg-neutral-50 rounded-[3rem] overflow-hidden border border-neutral-100 shadow-xl">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.description} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-200">
                  <Box size={80} strokeWidth={1} />
                </div>
              )}
            </div>
            
            {product.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.slice(1, 5).map((url: string, i: number) => (
                  <div key={i} className="aspect-square bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 cursor-pointer hover:border-blue-500 transition-colors">
                    <img src={url} alt={`${product.description} ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex flex-col gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                  {product.category || 'Móvel'}
                </span>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">SKU: {product.code}</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-[1.1] text-neutral-900">
                {product.description}
              </h1>
            </div>

            <div className="p-8 bg-neutral-50 rounded-[2.5rem] border border-neutral-100 space-y-6">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-blue-600">{handleFormatPrice(product.unit_price)}</span>
                <span className="text-sm text-neutral-400 font-bold">À VISTA NO PIX</span>
              </div>
              
              <div className="flex flex-col gap-3">
                 <a href={getWhatsAppLink(product)} target="_blank" rel="noreferrer" className="w-full bg-neutral-900 hover:bg-blue-600 text-white flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl hover:-translate-y-1">
                    <Phone size={20} />
                    Comprar via WhatsApp
                 </a>
                 <p className="text-[10px] text-center text-neutral-400 font-bold uppercase tracking-widest">Entrega e montagem a combinar</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white border border-neutral-100 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Ruler size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Dimensões</p>
                  <p className="text-xs font-bold">{product.width || '?'}x{product.height || '?'}x{product.depth || '?'} cm</p>
                </div>
              </div>
              <div className="p-6 bg-white border border-neutral-100 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Box size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Material</p>
                  <p className="text-xs font-bold truncate max-w-[100px]">{product.material || 'Premium'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-neutral-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Descrição do Produto</h3>
              <div className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {product.ecommerce_description || product.description}
              </div>
            </div>

            {product.seo_description && (
               <div className="space-y-6 pt-6 border-t border-neutral-100 opacity-60">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Informações Adicionais</h3>
                 <div className="text-neutral-500 text-[11px] leading-relaxed font-medium">
                   {product.seo_description}
                 </div>
               </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
