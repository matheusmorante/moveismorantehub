import { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export const metadata: Metadata = {
  title: 'Móveis Morante — Instruções de Criação de Post (IA)',
  description: 'Especificação técnica e prompt estruturado para criação de post visual para IA externa (ChatGPT / Gemini).',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function SharePostInstructionsPage({ params }: PageProps) {
  const { token } = await params;

  // 1. Validar token
  const { data: shareToken } = await supabase
    .from('post_share_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!shareToken || shareToken.revoked_at) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-black">
            ✕
          </div>
          <h1 className="text-xl font-black text-slate-100 mb-2">Instruções Indisponíveis</h1>
          <p className="text-sm text-slate-400 mb-6">
            Este link de instruções para IA foi revogado ou expirou. Solicite um novo link ao operador do sistema ERP.
          </p>
        </div>
      </main>
    );
  }

  // 2. Buscar Produto com Imagens e Variações
  const { data: product } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .eq('id', shareToken.product_id)
    .maybeSingle();

  const {
    resolveProductImages,
    renderProductImagesPromptSection,
    ABSOLUTE_FIDELITY_RULE,
    OFFICIAL_MORANTE_LOGO_URL,
    OFFICIAL_QUEIMA_BADGE_URL,
    OFFICIAL_ASSET_MASTER_RULE,
    OFFICIAL_LOGO_STRICT_INSTRUCTIONS,
    buildOfficialBadgeStrictInstructions,
  } = await import('@/services/postProductImageResolver');

  const { productImages, validation } = resolveProductImages({
    product,
    selectedVariationId: shareToken.variation_id,
  });

  const productName = product?.name || 'Produto Móveis Morante';
  const productPrice = product?.sale_price || product?.price || 0;
  const productOldPrice = product?.old_price || 0;
  const productCatalogUrl = `https://moveismorante.com.br/produto/${product?.slug || shareToken.product_id}${shareToken.variation_id ? `?var=${shareToken.variation_id}` : ''}`;

  // 3. Buscar Campanhas ativas
  const { data: campaigns } = await supabase
    .from('post_creator_campaigns')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  // 4. Buscar Element Models
  const { data: models } = await supabase
    .from('campaign_element_models')
    .select('*');

  const activeCampaigns = campaigns || [];
  const productOpportunityId = product?.opportunity_id || null;

  // Filtrar estritamente os modelos de BADGE: só são incluídos se o produto de fato possuir opportunity_id correspondente
  const allModels = (models || []).filter((m: any) => {
    if (m.element_type === 'BADGE') {
      if (!productOpportunityId) return false;
      return m.opportunity_id === productOpportunityId;
    }
    return true;
  });

  // Resolver Asset Oficial do Badge (apenas se houver oportunidade correspondente)
  let officialBadgeUrl: string | null = null;
  let officialBadgeName = 'Selo Oficial';
  if (productOpportunityId) {
    const oppBadgeModel = allModels.find(
      (m: any) => m.element_type === 'BADGE' && m.opportunity_id === productOpportunityId
    );
    officialBadgeUrl =
      oppBadgeModel?.generated_asset_url ||
      product?.opportunity?.image_url ||
      OFFICIAL_QUEIMA_BADGE_URL;
    officialBadgeName = oppBadgeModel?.name || product?.opportunity?.name || 'Selo Oficial';
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <header className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                MÓVEIS MORANTE — ESPECIFICAÇÃO DE POST PARA IA
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">{productName}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Link de compartilhamento de contexto para ChatGPT / Gemini (Token v4)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/share/post-instructions/${token}/json`}
              target="_blank"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              📄 Baixar JSON Spec
            </Link>
          </div>
        </header>

        {/* Regra de Fidelidade Absoluta */}
        <section className="bg-red-950/40 border border-red-900/60 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-wider">
            <span>🛡️</span>
            <span>Regra de Fidelidade Absoluta (Anti-Alucinação)</span>
          </div>
          <p className="text-xs text-red-200/90 leading-relaxed">
            As fotos abaixo são a fonte visual de verdade. A IA <strong>NÃO</strong> deve redesenhar o móvel,
            inventar modelo semelhante, alterar número de portas, puxadores, gavetas, pés ou combinar peças de variações diferentes.
            Apenas o cenário/ambientação de fundo pode ser gerado pela IA.
          </p>
        </section>

        {/* Assets Oficiais (Logo e Badge) */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-emerald-400 uppercase tracking-wider">
              Assets Oficiais da Marca (Não Recriar / Preservar Fielmente)
            </h2>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
              Arquivos gráficos prontos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card Logo */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow">
                <img
                  src={OFFICIAL_MORANTE_LOGO_URL}
                  alt="Logo Oficial Móveis Morante"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  Logo Oficial
                </span>
                <p className="text-xs font-bold text-white mt-1">Móveis Morante</p>
                <a
                  href={OFFICIAL_MORANTE_LOGO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-indigo-400 hover:underline block truncate mt-0.5"
                  title={OFFICIAL_MORANTE_LOGO_URL}
                >
                  {OFFICIAL_MORANTE_LOGO_URL}
                </a>
              </div>
            </div>

            {/* Card Badge */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
              {officialBadgeUrl ? (
                <>
                  <div className="w-16 h-16 rounded-lg border border-purple-800/60 bg-purple-950/30 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow">
                    <img
                      src={officialBadgeUrl}
                      alt={officialBadgeName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                      Selo Oficial
                    </span>
                    <p className="text-xs font-bold text-white mt-1 truncate">{officialBadgeName}</p>
                    <a
                      href={officialBadgeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-purple-400 hover:underline block truncate mt-0.5"
                      title={officialBadgeUrl}
                    >
                      {officialBadgeUrl}
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <div className="w-16 h-16 rounded-lg border border-dashed border-slate-800 bg-slate-900/40 flex items-center justify-center text-slate-500 text-xs shrink-0">
                    —
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      Selo de Oportunidade
                    </span>
                    <p className="text-xs font-semibold text-slate-300 mt-1">
                      Nenhum (produto sem oportunidade)
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Nenhum badge deve ser gerado ou inserido pela IA.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Imagens Oficiais do Produto */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-indigo-400 uppercase tracking-wider">
              1. Imagens Oficiais do Produto
            </h2>
            {validation.valid ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                Fonte visual validada
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-full">
                Foto principal ausente
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Foto Principal */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded w-fit">
                Principal (Dominante)
              </span>
              {productImages.primary ? (
                <img
                  src={productImages.primary.url}
                  alt="Principal"
                  className="w-full aspect-square object-cover rounded-lg border-2 border-indigo-500 shadow-md"
                />
              ) : (
                <div className="w-full aspect-square rounded-lg border border-dashed border-red-500/50 flex items-center justify-center text-xs text-red-400">
                  Sem foto principal
                </div>
              )}
              <p className="text-xs font-semibold text-slate-200 truncate mt-1">
                {productImages.primary?.variationName || productImages.primaryVariation?.name}
              </p>
            </div>

            {/* Foto Aberto/Interno */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded w-fit">
                Visão Aberta / Interna
              </span>
              {productImages.openView ? (
                <img
                  src={productImages.openView.url}
                  alt="Visão Aberta"
                  className="w-full aspect-square object-cover rounded-lg border-2 border-amber-500 shadow-md"
                />
              ) : (
                <div className="w-full aspect-square rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
                  Não aplicável / Opcional
                </div>
              )}
              <p className="text-xs text-slate-400 truncate mt-1">
                {productImages.openView ? 'Estrutura e divisões internas' : 'Sem foto interna'}
              </p>
            </div>

            {/* Variações */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded w-fit">
                Variações ({productImages.variations?.length || 0})
              </span>
              {productImages.variations && productImages.variations.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-700">
                  {productImages.variations.map((v, i) => (
                    <div key={`${v.variationId}-${i}`} className="text-center">
                      <img
                        src={v.url}
                        alt={v.variationName}
                        className="w-full aspect-square object-cover rounded border border-slate-700 hover:border-purple-400 transition"
                      />
                      <span className="block text-[9px] text-slate-300 truncate mt-1">
                        {v.variationName}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full aspect-square rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
                  Sem variações adicionais
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Produto e Dados do Catálogo */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-black text-indigo-400 uppercase tracking-wider">
            2. Dados Fiscais e Comerciais do Produto
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 font-bold block mb-1">Nome do Produto</span>
              <span className="text-slate-200 font-bold text-sm">{productName}</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 font-bold block mb-1">Preço Atual / De-Por</span>
              <span className="text-emerald-400 font-black text-sm">
                R$ {Number(productPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {productOldPrice > productPrice && (
                <span className="text-slate-500 line-through text-xs ml-2">
                  R$ {Number(productOldPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 sm:col-span-2">
              <span className="text-slate-500 font-bold block mb-1">Página Oficial do Produto (Catálogo)</span>
              <a
                href={productCatalogUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline font-mono text-xs break-all"
              >
                {productCatalogUrl}
              </a>
            </div>
          </div>
        </section>

        {/* Diretrizes de Campanhas */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-black text-indigo-400 uppercase tracking-wider">
            3. Campanhas Disponíveis ({activeCampaigns.length})
          </h2>
          <div className="space-y-4">
            {activeCampaigns.map((camp) => {
              const campModels = allModels.filter((m) => m.campaign_id === camp.id);
              return (
                <div key={camp.id} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-slate-100">{camp.name}</h3>
                    <span className="text-[11px] font-mono text-slate-500">ID: {camp.slug || camp.id}</span>
                  </div>

                  {camp.instructions && (
                    <p className="text-xs text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                      <strong className="text-slate-400 block mb-1">Instruções Gerais:</strong>
                      {camp.instructions}
                    </p>
                  )}

                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 block">
                      Elementos Visuais ({campModels.length}):
                    </span>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs">
                      {campModels.map((m) => (
                        <div key={m.id} className="bg-slate-900 p-3 rounded-lg border border-slate-800/60 space-y-1">
                          <span className="font-bold text-indigo-300 text-[11px] block">{m.element_type}</span>
                          <p className="text-slate-300 text-[11px] line-clamp-3">{m.prompt || m.instructions}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Prompt Estruturado Completo */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider">
            4. Prompt Estruturado Pronto para ChatGPT / Gemini
          </h2>
          <p className="text-xs text-slate-400">
            Copie o bloco abaixo e cole diretamente na sua IA externa preferida (ChatGPT, Gemini ou Midjourney/DALL-E) para gerar a imagem final.
          </p>

          <pre className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 whitespace-pre-wrap overflow-x-auto select-all max-h-96">
{`==================================================
MÓVEIS MORANTE — INSTRUÇÕES DE CRIAÇÃO DE POST
==================================================

${ABSOLUTE_FIDELITY_RULE}

PRODUTO: ${productName}
URL DO CATÁLOGO: ${productCatalogUrl}
PREÇO: R$ ${Number(productPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

${renderProductImagesPromptSection(productImages)}

==================================================
ASSETS OFICIAIS (NÃO RECRIAR / NÃO REDESENHAR)
==================================================
${OFFICIAL_ASSET_MASTER_RULE}

${OFFICIAL_LOGO_STRICT_INSTRUCTIONS}
${officialBadgeUrl ? `\n--------------------------------------------------\n\n${buildOfficialBadgeStrictInstructions(officialBadgeUrl, officialBadgeName)}` : ''}

REGRAS GERAIS DE MARCA:
- Respeitar paleta visual e ambientação realista de alta qualidade.
- Não distorcer dimensões e proporções do produto.
- Manter iluminação natural e aconchegante.
- As fotos fornecidas em IMAGENS OFICIAIS DO PRODUTO são a fonte visual de verdade.
- Assets oficiais (logo, selos) são arquivos gráficos prontos: NUNCA redesenhe, recrie ou estilize.
- Se a IA não puder inserir o asset fielmente, deixe o espaço reservado em vez de inventar uma marca.

CAMPANHAS DISPONÍVEIS:
${activeCampaigns.map((c) => `- ${c.name}: ${c.instructions || 'Sem instruções adicionais'}`).join('\n')}
`}
          </pre>
        </section>
      </div>
    </main>
  );
}
