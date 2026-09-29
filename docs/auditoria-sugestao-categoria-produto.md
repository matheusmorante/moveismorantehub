# Auditoria da sugestão de categoria de produto

Data da auditoria: 2026-09-29

## Como funciona hoje

- `erp/src/pages/utils/categoryResolutionService.ts` normaliza caixa, acentos e pontuação e aplica uma sequência de regras fixas com `includes`.
- `erp/src/pages/App/Products/components/tabs/ProductGeneralTab.tsx` tenta aplicar essas regras ao sair do campo Nome, somente quando nenhuma categoria está selecionada.
- `resolveAutoCategory` tenta as mesmas regras e chama `aiService.suggestCategory` quando não encontra correspondência. Seus consumidores atuais estão no fluxo de revisão/criação de produtos a partir de notas fiscais.
- `aiProductCatalogService.suggestCategory` envia nome e lista de categorias ao Gemini. Não usa histórico de produtos. O hook de IA expõe a ação, mas a busca textual no código não encontrou chamada direta a `handleGenerateCategory`.
- A busca do catálogo já possui normalização SQL, `pg_trgm`, `unaccent` e aliases genéricos de termos de produto em `catalog_search_aliases`; essa tabela não liga aliases a categorias e não é usada pelo classificador.
- Não existe tabela específica de aliases de categoria nem mecanismo de registro/revisão das correções humanas.

## Limitações e riscos observados

- Não há ranking, score, margem entre candidatos ou estado de ambiguidade.
- Há regras para algumas categorias comuns, não uma cobertura orientada por dados para todas as categorias.
- `gabinete banheiro` pode cair no fallback genérico da regra de balcões, que escolhe Balcões para Pia ou Balcões com Tampo sem exigir evidência de cozinha.
- Abreviações e erros de escrita só funcionam quando já aparecem literalmente em regras. Não há fuzzy matching por `pg_trgm` no classificador.
- O fallback da IA pode sugerir a categoria “mais próxima” mesmo sem evidência suficiente e torna a classificação do fluxo de nota fiscal dependente de uma chamada externa.
- Os testes existentes cobrem alguns exemplos manuais e o fallback da IA, mas não medem desempenho em dados reais nem cobrem contexto negativo e preservação da escolha manual.

## Banco e histórico consultados

O projeto Supabase foi conferido pelo host configurado no app antes das consultas. `pg_trgm` e `unaccent` estão instalados no schema `public`. A normalização imutável já existente é usada pela busca do catálogo.

No recorte de produtos não excluídos:

- 263 produtos; 170 têm `products.category_id` e 93 não têm esse campo preenchido.
- 262 produtos têm pelo menos um vínculo em `product_categories`, totalizando 305 vínculos.
- 11 produtos possuem ao menos um vínculo N:N diferente do `category_id` legado. Exemplos observados incluem `Poltrona do Papai 80cm Noruega Berflex Estofados` ligado a Sofás e Poltronas, e `Paneleiro Torre Quente em Aço 4 Portas Star New Telasul` ligado a Paneleiros e Armários para Fornos.
- Há registros coerentes úteis como `G ROUPA DEMOBILE CADIS...` → Guarda-Roupas e `Balcão para Pia 1,20...` → Balcões para Pia.

Os vínculos múltiplos/divergentes não serão usados como rótulo único de avaliação sem revisão. A baixa quantidade por categoria também limita métricas generalizáveis; resultados devem ser reportados como avaliação do conjunto observado.

## Direção de mudança

Reaproveitar a normalização e extensões já presentes; evoluir o serviço existente com aliases compostos derivados e revisados a partir de categorias e nomes reais, regras negativas/contextuais, ranking determinístico e limiar com margem. Manter categoria manual protegida e retornar “sem confiança” quando os dados não sustentarem uma escolha. Remover a dependência online de IA do caminho automático; IA só poderá ser usada fora do cadastro para apoiar curadoria de aliases, com revisão humana.

Antes da implementação, medir o baseline apenas no subconjunto de produtos com um rótulo único coerente. Depois, repetir o mesmo conjunto e adicionar testes de ambiguidade, contexto negativo, erros, abreviações e categoria manual.

## Alterações realizadas

- Evoluí `categoryResolutionService.ts` com normalização de abreviações observadas (`G ROUPA`, `4PT`, `6GV`), aliases para as categorias existentes, correspondência aproximada de um caractere, ranking e abstenção por score mínimo/margem.
- Os aliases `G ROUPA`, `Balcão de Pia` e os nomes canônicos foram conferidos contra produtos existentes. `Caixa de pia` não apareceu como padrão histórico confiável; continua como candidata de baixa confiança, sem preenchimento automático.
- Termos de contexto de banheiro bloqueiam candidatos de cozinha. Nomes como `Gabinete banheiro` e `Armário banheiro` podem mostrar opções de banheiro para revisão, mas não selecionam categoria automaticamente.
- O campo Nome aplica automaticamente apenas correspondência de alta confiança quando ainda não há categoria selecionada; candidatos intermediários aparecem como botões de revisão. A escolha feita manualmente é preservada.
- Removi o seletor de categoria via Gemini da fachada e do serviço de catálogo. O resolver usado em cadastros rápidos agora usa somente aliases e regras locais. Não há migration nem tabela nova; as categorias válidas continuam vindo do banco.
- O conjunto focado contém 15 casos positivos (13 variações solicitadas e 2 nomes reais do banco): a regra anterior acertava 11/15 no cadastro principal; a nova seleciona 15/15 e os inclui entre os 3 primeiros candidatos. Em 8 casos negativos/ambíguos, a nova regra não preenche automaticamente. Esse conjunto é dirigido por exemplos, não representa a precisão global.
- O histórico tem 11 rótulos divergentes/múltiplos e várias categorias com poucos produtos; por isso não apresento a métrica desse recorte como estimativa geral nem faço promoção automática de aliases a partir de correções humanas.

Validação focada: `categoryResolutionService.test.ts`, 23 testes aprovados; ESLint dos arquivos alterados sem erros (duas advertências preexistentes no `ProductGeneralTab.tsx`). Não houve alteração remota do Supabase.
