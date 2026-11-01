# Histórico de correções fiscais — 31/10/2026

## Busca de documentos fiscais sem distinção de acentos

**Problema e causa raiz comprovada:** na lista de documentos fiscais do ERP, a busca pelo nome do destinatário usava `ILIKE` diretamente sobre `destinatario_nome` e o texto digitado. Por isso, consultar “Joao” não encontrava um destinatário salvo como “João”.

**Solução implementada:** a função `get_fiscal_documents_summary` aplica `public.immutable_unaccent` ao nome e ao termo de busca antes da comparação. A busca por número, chave de acesso, documento e pedido continua com os mesmos critérios. O contrato, o `SECURITY INVOKER`, o RLS e as permissões existentes foram preservados.

**Arquivos e linhas modificados:**

- `supabase/migrations/20261101013530_accent_insensitive_module_searches.sql:829` — definição atualizada da função; `:931` — comparação sem distinção de acentos no destinatário.
- `docs/fiscal/README.md:10` — referência vigente para este registro.
- `docs/fiscal/historico-correcoes-2026-10-31.md:3` — este histórico.

**Validação e limites:** o projeto operacional `hkoxhourxwlddgsfdgws` estava ativo e saudável; a assinatura e a definição remota anterior foram consultadas antes da aplicação. Após aplicar a migration, as quatro funções alteradas foram conferidas no catálogo: permissões, `search_path`, `SECURITY DEFINER`/`SECURITY INVOKER` e timeouts foram preservados; a comparação escalar confirmou que “João” corresponde a “joao”. Nenhum teste automatizado foi executado e não houve leitura ou escrita de dados comerciais nem transmissão fiscal.

## Itens de recebimento no app preservados ao organizar compras

**Problema e causa:** o formulário de recebimento do app reutiliza os itens de pedido de compra, mas não fornecia os percentuais e a ação de adicionar que a versão atual do componente esperava. Com itens carregados, a composição de compra podia tentar ler percentuais ausentes; a ação de adicionar também não tinha callback. Os itens de recebimento por NF-e já possuem custos próprios, incluindo os valores distribuídos da nota, e não devem ser recalculados como itens de pedido.

**Solução:** o componente compartilhado distingue o modo de recebimento, apresenta o subtotal já calculado do item e mantém os rótulos de custo e desconto desse fluxo. O formulário de recebimento conecta Adicionar item ao seletor de produtos existente, respeitando o bloqueio para NF-e. A máscara monetária compartilhada reconhece o primeiro dígito como centavo ao substituir o valor selecionado. A apuração fiscal da nota, os dados de origem e a confirmação do recebimento não foram alterados.

**Arquivos e pontos modificados:**

- `mobile/src/features/stock/purchases/modals/purchase-form/PurchaseItemsSection.tsx:19` — parâmetros opcionais de compra, modo de recebimento e subtotal de origem.
- `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx:501` — seleção existente ligada à ação de adicionar e indicação do modo de recebimento.
- `mobile/src/components/shared/CurrencyInput.tsx:62` — correção da primeira tecla e da limpeza do campo em reais.
- `mobile/src/features/stock/purchases/modals/purchase-form/PurchaseItemsSection.test.tsx:57`, `mobile/src/components/shared/PurchaseMaskedInputs.test.tsx:31` e `mobile/src/features/stock/receipts/utils/receiptSource.test.ts` — regressões de apresentação, máscara e cálculo de origens, com dados fictícios.
- `docs/estoque/guia-pratico/gerar_guia.py:496` e `docs/estoque/guia-pratico/README.md` — instrução de digitação do custo; PDFs servidos e de entrega atualizados.

**Validação e limites:** 12 testes Vitest do app passaram, incluindo sete de origens de recebimento e dois do componente compartilhado. No ERP, os testes de itens também preservam subtotal e despesas do recebimento. As páginas 14 e 20 do guia foram renderizadas e revisadas; as cópias têm o mesmo conteúdo. O TypeScript geral do app ainda apresenta erros anteriores, inclusive de tipos de fornecedores no modal de recebimento; não apontou erro nos parâmetros da alteração. O lint do ERP não iniciou porque a instalação de `zod-validation-error` não exporta `./v4`. Não havia telefone físico conectado; não houve prova nativa, gravação de recebimento, emissão fiscal ou publicação OTA.

**Pendência observada:** ao iniciar recebimento por pedido, `useReceiptForm.ts:93` no ERP e `receiptSource.ts:55` no app carregam IPI e frete, mas não transferem o percentual de desconto geral do pedido. A regra de custos do recebimento não foi alterada nesta tarefa; o operador deve conferir os descontos antes de confirmar a entrada.

## Detalhes da NF de entrada em abas no ERP e no app

**Problema e causa:** os detalhes da NF de entrada reuniam participantes, dados fiscais, itens e totais em uma única rolagem. Em janelas pequenas, localizar cada informação exigia percorrer todo o modal; o app também usava um cartão limitado em vez de aproveitar a tela disponível.

**Alteração:** ERP e app apresentam as abas Resumo, Participantes, Itens e Fiscal, com os mesmos dados já exibidos e o aviso existente para itens sem dados comerciais. No ERP, as abas aceitam setas, Home e End, o corpo rola de forma independente e o fundo fica bloqueado enquanto o modal está aberto. No app, telas estreitas ou baixas usam a tela inteira com áreas seguras, e os itens se reorganizam em coluna quando necessário. Ao trocar de nota, o modal volta ao Resumo. Nenhuma consulta, permissão, regra fiscal, schema ou dado persistido foi alterado.

**Arquivos e pontos modificados:**

- `shared-utils/inboundInvoiceDetailTabs.ts:1` — identificadores e nomes compartilhados das abas.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundInvoiceDetailsModal.tsx:40` — bloqueio de rolagem, navegação por abas, conteúdo e layout responsivo.
- `mobile/src/features/stock/invoices/modals/invoice-details/InvoiceDetailsModal.tsx:36` — abas, estado e dimensões do modal; `InvoiceDetailsHeader.tsx:13`, `InvoiceDetailsFiscalSection.tsx:13` e `InvoiceDetailsItemsSection.tsx:14` — organização dos dados e itens.
- `mobile/src/features/stock/invoices/modals/invoice-details/InvoiceDetailsPartiesSection.tsx:6`, `InvoiceDetailsSummarySection.tsx:8` e `invoiceDetailsModal.styles.ts:3` — seções de participantes/resumo e estilos responsivos.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundInvoiceDetailsModal.test.tsx:42` e `erp/tests/mobile-forms/inbound-invoice-details.test.tsx:89` — regressões de navegação, dados, troca de nota e aviso de XML incompleto.
- `docs/estoque/guia-pratico/gerar_guia.py:390` e `docs/estoque/guia-pratico/README.md:5` — orientação de uso; PDFs atualizados em `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`.
- `docs/fiscal/README.md` — referência desta revisão. Não houve alteração de backend ou SQL.

**Validação:** as duas suítes Vitest/RTL focadas passaram (2 testes no ERP e 2 no app), com dados fictícios. No Playwright visível, uma prévia local com nota fictícia foi conferida em 280×500, 320×640, 768×1024 e 1440×900: abas, navegação por teclado, rolagem do conteúdo, retorno ao topo ao mudar de aba e liberação da rolagem ao fechar. O guia tem 27 páginas, as duas cópias são idênticas e a página 5 foi renderizada e revisada visualmente.

**Limites:** não havia telefone Android conectado ao ADB para validar a interface nativa. O TypeScript completo do ERP e do app retornou erros em outros arquivos (por exemplo, `api/nfe/consult.ts` e `mobile/src/components/shared/DistanceInput.tsx`); a filtragem não mostrou diagnósticos nos arquivos desta alteração. O ESLint não iniciou porque a versão instalada de `zod-validation-error` não exporta `./v4`. Não houve teste de persistência, transmissão fiscal, deploy ou publicação OTA.

## NCM para pias de mármore sintético e revisão de móveis

**Problema e causa:** o catálogo oficial tinha `68109900` ativo e vigente, mas desativado para sugestões da loja e sem aliases internos. O classificador não tinha regra para pias/tanques de pedra artificial. A comparação de todos os códigos já usados pelas regras semânticas encontrou `94018000`, `94031000`, `94033000` e `94037000` também desativados. A constante de outros móveis metálicos apontava para `94032000`, ausente no catálogo atual; a abertura vigente divide móveis metálicos em `94032010` (cozinhas) e `94032090` (outros). Além disso, as regras para móveis plásticos de cozinha e escritório retornavam o NCM de madeira.

**Solução:** a regra compartilhada sugere `68109900` somente quando o produto indica pia, cuba, tanque ou lavatório, material de mármore sintético/marmorite/pedra artificial e não descreve armário ou gabinete. O endpoint comum de classificação valida esse código contra a vigência/ativação do catálogo; o ERP usa a mesma regra no enriquecimento fiscal. O mapeamento metálico foi atualizado para `94032010`/`94032090`, e os ramos de cozinha/escritório agora reconhecem móveis plásticos. A migration ativa na loja os códigos atuais `68109900`, `94018000`, `94031000`, `94032010`, `94033000` e `94037000`; `94032090` já estava ativo. Foram adicionados aliases internos para pias, tanques, cubas e lavatórios sintéticos e exemplos coerentes para os demais códigos. As descrições oficiais não foram alteradas.

**Arquivos e pontos modificados:**

- `shared-utils/ncmClassification.ts` — códigos atuais, regra restrita de pedra artificial e seleção de códigos de móveis metálicos/plásticos.
- `api/products/classificationCore.ts` e `api/products/classify.ts` — exposição da regra e sugestão validada pelo catálogo no endpoint comum ERP/app.
- `erp/src/services/fiscal/ncmInferenceService.test.ts` — expectativa existente de móveis metálicos atualizada para o código vigente; a suíte não foi executada.
- `supabase/migrations/20261031200623_ncm_synthetic_stone_and_current_furniture_codes.sql` — valida as descrições e vigências oficiais, ativa somente códigos verificados e registra aliases idempotentes.
- `docs/fiscal/README.md` — referência desta revisão.

**Evidência e validação:** a Solução de Consulta RFB nº 5/2011 classificou pia/tanque inteiramente de pedra artificial moldada, como mármore sintético, em `6810.99.00`; consulta tributária paulista de 2025 usa `6810.9900` para pia de pedra sintética. A Resolução GECEX publicada em 2022 desdobrou outros móveis metálicos em `9403.20.10` e `9403.20.90`. A migration `20261031200623` foi aplicada ao projeto operacional MoranteHub (`hkoxhourxwlddgsfdgws`). Consulta posterior confirmou `active=true`, `is_active=true` e vigência atual nos sete códigos tratados; a RPC `search_ncms` encontrou os códigos correspondentes para sete termos representativos, sem ler dados de produtos. Revisão estática conferiu o fluxo da API compartilhada e do enriquecimento fiscal do ERP. A expectativa do teste existente de móveis metálicos foi atualizada; testes não foram executados.

**Limites:** a regra automática exige sinais de pedra artificial e de peça sanitária e exclui descrições de armário/gabinete para evitar classificar um conjunto de móvel como pia isolada. O inventário de códigos foi comparado às regras semânticas existentes; outros materiais/categorias fora dessas regras continuam dependendo da busca do catálogo e de confirmação fiscal conforme a composição real.

**Fontes oficiais:** [Solução de Consulta RFB nº 5/2011](https://www.gov.br/mme/pt-br/arquivos/do-06-04-2011-s1.pdf), [Consulta SEFAZ-SP RC 32330/2025](https://legislacao.fazenda.sp.gov.br/Paginas/RC32330_2025.aspx), [NCM vigente — Receita Federal](https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/classificacao-fiscal-de-mercadorias/download-ncm-nomenclatura-comum-do-mercosul), [DOU de 21/07/2022 — Resolução GECEX com o desdobramento 9403.20](https://pesquisa.in.gov.br/imprensa/servlet/INPDFViewer?captchafield=firstAccess&data=21%2F07%2F2022&jornal=515&pagina=19).
