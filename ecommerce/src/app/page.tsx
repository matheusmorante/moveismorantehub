import Image from "next/image";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { ShoppingCart, Phone } from "lucide-react";

// Forcing dynamic rendering to always fetch fresh products
export const revalidate = 0;

interface Product {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  promotional_price: number | null;
  description: string;
  main_image_url: string | null;
  stock_quantity: number;
  status: string;
}

export default async function Home(props: { searchParams: Promise<{ category?: string }> }) {
  const searchParams = await props.searchParams;
  const currentCategory = searchParams.category;

  let categoriesData: any[] = [];
  let productsData: any[] = [];

  const isConfigured = 
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isConfigured) {
    try {
      // Fetch categories
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      categoriesData = data || [];

      // Fetch active products
      let query = supabase
        .from("products")
        .select("*")
        .eq("deleted", false)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (currentCategory) {
        query = query.ilike("category", `%${currentCategory}%`);
      }

      const { data: products, error } = await query;
      if (!error) productsData = products || [];
    } catch (err) {
      console.error("Configured but failed to fetch during build:", err);
    }
  }

  // Map ERP columns to Ecomm display structure
  const displayProducts: any[] = productsData.map(p => ({
    id: p.id,
    name: p.description, // ERP uses description as title
    sku: p.code, // ERP uses code as SKU
    sale_price: p.unit_price,
    promotional_price: null,
    description: p.ecommerce_description || p.description,
    main_image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
    stock_quantity: p.stock || 0,
    status: p.active ? 'active' : 'inactive',
    category: p.category,
    slug: p.slug
  }));

  const categories = categoriesData;

  const handleFormatPrice = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const getWhatsAppLink = (product: any) => {
    const phoneNumber = "5541997493547";
    const text = `Olá! Tenho interesse no produto *${product.name}*.\n\nPreço: ${handleFormatPrice(product.promotional_price || product.sale_price)}\nSKU: ${product.sku || 'N/A'}\n\nPoderia me passar mais informações sobre prazo e disponibilidade de entrega?`;
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200/60 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-200">M</div>
             <span className="font-black text-xl tracking-tighter text-neutral-800">MÓVEIS<span className="text-blue-600"> MORANTE</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-bold text-neutral-400 hover:text-blue-600 transition-colors">Início</Link>
            <Link href="#produtos" className="text-sm font-bold text-neutral-400 hover:text-blue-600 transition-colors">Produtos</Link>
            <Link href="#categorias" className="text-sm font-bold text-neutral-400 hover:text-blue-600 transition-colors hover:scale-105">Categorias</Link>
          </nav>

          <div className="flex items-center gap-4">
            <a href="https://wa.me/5541997493547" target="_blank" rel="noreferrer" className="hidden md:flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-colors">
              <Phone size={16} />
              (41) 99749-3547
            </a>
            <button className="relative p-2 text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors">
              <ShoppingCart size={24} />
              <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                0
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Categories Bar */}
      <div id="categorias" className="bg-white border-b border-neutral-100 py-4 scroll-mt-24">
        <div className="container mx-auto px-4 flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
          <Link 
            href="/" 
            className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${!currentCategory ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}
          >
            Todos
          </Link>
          {categories?.map((cat: any) => (
            <Link 
              key={cat.id}
              href={cat.slug ? `/c/${cat.slug}` : `/?category=${encodeURIComponent(cat.name)}`}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${currentCategory === cat.name || currentCategory === cat.slug ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 right-0 w-full h-full bg-gradient-to-r from-blue-50/50 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 py-20 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10 space-y-8">
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-widest rounded-full">
              Coleção 2026
            </div>
            <h2 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1] text-neutral-900">
              Conforto que <br />
              <span className="text-blue-600">Transforma</span> <br />
              Sua Casa.
            </h2>
            <p className="text-lg text-neutral-500 font-medium max-w-xl leading-relaxed">
              Descubra nossa linha de estofados premium e móveis exclusivos. Qualidade, design moderno e entrega garantida para você.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a href="#produtos" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1">
                Ver Coleção Completa
              </a>
              <a href="https://wa.me/5541997493547" target="_blank" rel="noreferrer" className="px-8 py-4 bg-white hover:bg-neutral-50 text-neutral-900 font-bold rounded-2xl border border-neutral-200 shadow-sm transition-all hover:border-neutral-300">
                Falar com Consultor
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full transform scale-150 -translate-y-10" />
            <div className="relative aspect-square sm:aspect-video lg:aspect-square bg-neutral-100 rounded-[3rem] overflow-hidden border border-neutral-200/50 shadow-2xl">
               <img 
                 src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1200" 
                 alt="Móvel de Destaque" 
                 className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/60 via-transparent to-transparent flex items-end p-8">
                  <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl max-w-sm">
                     <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Destaque</p>
                     <p className="font-bold text-lg text-neutral-900 leading-tight">Sofá Retrátil Premium Verona</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid Section */}
      <section id="produtos" className="py-24 bg-neutral-50 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div>
              <h3 className="text-3xl font-black tracking-tight text-neutral-900 mb-3">
                {currentCategory ? `Produtos em ${currentCategory}` : "Lançamentos e Destaques"}
              </h3>
              <p className="text-neutral-500 font-medium">Os produtos mais desejados com preços imbatíveis.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Ordenar por:</span>
              <select className="bg-white border border-neutral-200 text-sm font-semibold rounded-xl px-4 py-2 outline-none focus:border-blue-500 transition-colors">
                <option>Mais Novos</option>
                <option>Menor Preço</option>
                <option>Maior Preço</option>
              </select>
            </div>
          </div>

          {displayProducts.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-neutral-150 border-dashed animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart size={32} className="text-neutral-300" />
              </div>
              <p className="text-xl font-black text-neutral-900 uppercase tracking-tight mb-2">Ops! Nenhum item nesta categoria.</p>
              <p className="text-neutral-500 max-w-xs mx-auto text-sm font-medium">Estamos preparando novidades. Tente selecionar outra categoria ao lado.</p>
              <Link href="/" className="inline-block mt-8 text-blue-600 font-black text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                Ver Todos os Produtos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {displayProducts.map((product) => (
                <div key={product.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-neutral-200 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Image Container */}
                  <div className="relative aspect-[4/5] bg-neutral-50 overflow-hidden flex flex-col items-center justify-center">
                    <Link href={product.slug ? `/p/${product.slug}` : `/p/${product.id}`} className="w-full h-full">
                      {product.main_image_url ? (
                        <img
                          src={product.main_image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-200 gap-3">
                          <ShoppingCart size={64} className="opacity-10" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Morante Home</span>
                        </div>
                      )}
                    </Link>

                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                       {product.category && (
                          <div className="bg-white/90 backdrop-blur-sm text-neutral-900 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                            {product.category}
                          </div>
                       )}
                       {product.promotional_price && (
                          <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                            Oferta Especial
                          </div>
                       )}
                    </div>
                  </div>

                  {/* Content Container */}
                  <div className="p-8 flex flex-col flex-1 gap-6">
                    <div>
                      <Link href={product.slug ? `/p/${product.slug}` : `/p/${product.id}`}>
                        <h4 className="font-black text-neutral-900 leading-[1.2] text-lg mb-2 group-hover:text-blue-600 transition-colors" title={product.name}>
                          {product.name}
                        </h4>
                      </Link>
                      <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">SKU: {product.sku || 'N/A'}</p>
                    </div>

                    <div className="mt-auto space-y-6">
                      <div className="flex items-end gap-3">
                        {product.promotional_price ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-neutral-400 line-through font-bold">
                              {handleFormatPrice(product.sale_price)}
                            </span>
                            <span className="text-2xl font-black text-blue-600">
                              {handleFormatPrice(product.promotional_price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-3xl font-black text-neutral-900">
                            {handleFormatPrice(product.sale_price)}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400 font-bold mb-1.5">À VISTA</span>
                      </div>

                      <a
                        href={getWhatsAppLink(product)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-neutral-900 hover:bg-blue-600 text-white flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-neutral-900/10 hover:shadow-blue-600/20"
                      >
                        <ShoppingCart size={18} />
                        Consultar via WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-16">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-500/20">M</div>
               <h2 className="font-black text-2xl tracking-tighter">MÓVEIS MORANTE</h2>
            </div>
            <p className="text-neutral-400 text-sm max-w-sm leading-relaxed">
              Premium Home Experience. A sua loja de confiança para entregar o melhor conforto e design para sua casa.
            </p>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest text-neutral-500 mb-6">Explorar</h4>
            <ul className="space-y-4 text-sm font-bold text-neutral-300">
              <li><Link href="/" className="hover:text-blue-500 transition-colors">Início</Link></li>
              <li><Link href="#produtos" className="hover:text-blue-500 transition-colors">Lançamentos</Link></li>
              <li><Link href="#categorias" className="hover:text-blue-500 transition-colors">Categorias</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-widest text-neutral-500 mb-6">Atendimento</h4>
            <ul className="space-y-4 text-sm font-bold text-neutral-300">
              <li className="flex items-center gap-3 text-emerald-500">
                <Phone size={16} /> (41) 99749-3547
              </li>
              <li className="text-neutral-500">Seg - Sex: 08:30 às 18:00</li>
              <li className="text-neutral-500">Sábado: 09:00 às 13:00</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-20 pt-10 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
            © {new Date().getFullYear()} Móveis Morante. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-white transition-colors cursor-pointer">
                <i className="bi bi-instagram"></i>
             </div>
             <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-white transition-colors cursor-pointer">
                <i className="bi bi-facebook"></i>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
