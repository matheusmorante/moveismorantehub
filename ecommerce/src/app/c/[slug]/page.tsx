import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, ArrowLeft, Filter } from "lucide-react";

export const revalidate = 3600;

async function getCategory(slug: string) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return data;
}

async function getProductsByCategory(categoryName: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("deleted", false)
    .eq("active", true)
    .ilike("category", `%${categoryName}%`)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) return { title: "Categoria não encontrada" };

  return {
    title: category.meta_title || `${category.name} | Móveis Morante`,
    description: category.meta_description || `Confira nossa linha de ${category.name} na Móveis Morante.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) notFound();

  const products = await getProductsByCategory(category.name);

  const handleFormatPrice = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
       <header className="bg-white border-b border-neutral-100">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={18} />
            Início
          </Link>
          <h1 className="font-black text-xl tracking-tighter uppercase">{category.name}</h1>
          <div className="w-24"></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-12">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg">
                <Filter size={20} />
            </div>
            <div>
                <h2 className="text-2xl font-black tracking-tight">{category.name}</h2>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{products.length} produtos encontrados</p>
            </div>
        </div>

        {products.length === 0 ? (
           <div className="text-center py-24 bg-white rounded-[3rem] border border-neutral-200 border-dashed">
             <ShoppingCart size={48} className="mx-auto text-neutral-200 mb-6" />
             <p className="font-black text-neutral-900 uppercase tracking-widest">Nenhum produto nesta categoria ainda.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-neutral-200 hover:border-blue-500 transition-all flex flex-col h-full">
                <Link href={p.slug ? `/p/${p.slug}` : `/p/${p.id}`} className="block aspect-[4/5] bg-neutral-50 overflow-hidden relative">
                   {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.description} className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-200"><ShoppingCart size={40} /></div>
                   )}
                </Link>
                <div className="p-8 flex flex-col gap-6 flex-1">
                   <Link href={p.slug ? `/p/${p.slug}` : `/p/${p.id}`}>
                      <h4 className="font-black text-neutral-900 leading-[1.2] text-lg hover:text-blue-600 transition-colors">{p.description}</h4>
                   </Link>
                   <div className="mt-auto flex items-end justify-between">
                      <span className="text-2xl font-black text-blue-600">{handleFormatPrice(p.unit_price)}</span>
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">No Pix</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
