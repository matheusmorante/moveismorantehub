# Histórico de Correções Fiscais — 2026-10-21

## Controle de entrega afeta apenas a NF — preservação do pedido

- **Problema e sintomas observados:** ao desligar “Informar entrega?” durante a emissão, o pedido comercial podia passar a mostrar retirada, e a NF-e 55 ainda usava modalidade 4. O pedido deve permanecer como foi salvo; a seleção fiscal desligada deve gerar `modFrete=9`.
- **Causa raiz técnica comprovada:** `NfeEmissionModal.tsx:77-88` cria uma cópia de contexto fiscal com `shipping.deliveryMethod` ajustado à modalidade definida para a NF. `useNfeEmissionActions.ts:229-234` encaminha essa cópia ao backfill de snapshots dos itens. `nfeSnapshotBackfillService.ts` usava a cópia como `currentOrder` de `updateOrder`; a atualização completa então tomava a modalidade fiscal como base comercial e podia persistir essa alteração junto com os itens. Além disso, `resolveDefaultTransport('55', 'pickup')` indicava transporte por conta do cliente, resultando em `modFrete=4` mesmo com o controle de entrega desligado.
- **Arquivos e linhas modificados:** `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeSnapshotBackfillService.ts:32-40,60-68` atualiza apenas snapshots fiscais de itens em modo `metadataOnly`, sem usar a cópia fiscal como base; `shared-utils/fiscalTransportModel.ts:34-56,58-85,87-151` mapeia transporte desligado para `9` nos dois modelos e mantém o `4` dos snapshots que declaram transporte pelo destinatário; `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeTransportSection.tsx:82-99,172-179` atualiza os textos das modalidades 4/9 e o aviso do estado sem transporte; `erp/src/pages/utils/nfe/__tests__/transportFiscalRules.test.ts:201-211,413-458` atualiza as expectativas existentes para o padrão desligado; `docs/fiscal/README.md:9,31` aponta a regra atual e qualifica a referência histórica; este histórico registra causa e solução.
- **Solução técnica:** o backfill chama `updateOrder` sem `currentOrder` e com `metadataOnly: true`. O serviço parte do snapshot comercial persistido no banco e mescla somente os itens fiscais, preservando entrega, retirada e demais campos do pedido. Quando o controle está desligado, os dois modelos enviam `hasTransport=false`/`modFrete=9` no contexto fiscal; esse valor fica registrado definitivamente no snapshot da tentativa e no XML da NF, sem alterar a logística salva no pedido. A NF-e 55 continua usando `modFrete=4` se o transporte por conta do destinatário estiver explicitamente definido.
- **Base oficial:** o [MOC 7.0, Anexo I, Grupo X, campo X02](https://www.nfe.fazenda.gov.br/PORTAl/exibirArquivo.aspx?conteudo=J+I+v4eN00E%3D) lista `9` como “Sem Ocorrência de Transporte” para NF-e/NFC-e; a escolha de usar esse código quando o controle do emissor está desligado segue a solicitação do usuário.
- **Validação:** inspeção estática dos caminhos da cópia fiscal, backfill, snapshot de emissão e serializer; expectativas existentes de Vitest atualizadas, mas os testes não foram executados nesta solicitação; `git diff --check`. Nenhuma emissão, chamada à SEFAZ ou escrita em banco remoto foi realizada.

## Exibição do NCM e Descrição Oficial da SEFAZ diretamente no campo Select

- **Problema e especificação do usuário:** O campo select/combobox de NCM (tanto no cadastro de produto quanto na emissão de nota fiscal) exibia somente o número do NCM, dificultando a conferência e leitura imediata da descrição oficial sem precisar abrir a listagem ou depender de elementos externos. O usuário solicitou explicitamente: *"o campo de ncm, o select deve conter o numero do ncm - descrição do ncm do sefaz, pra poder ler a descrição já no select do ncm"*.
- **Causa raiz técnica comprovada:** Os componentes `NcmSelect.tsx` (usado nas linhas dos itens da nota fiscal e configurações) e `ProductNcmSelector.tsx` (usado na aba Fiscal do cadastro de produtos) mantinham o estado do input/select vinculado estritamente ao código numérico (`val` ou `code`, ex: `'94035000'`). Ao selecionar um NCM ou carregar dados existentes, o valor atribuído ao input omitia a descrição oficial.
- **Arquivos modificados:**
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NcmSelect.tsx`:
    - Adicionadas funções utilitárias `formatNcmDisplay(code, description)` e `parseNcmCode(value)`.
    - Ao selecionar uma opção do dropdown ou ao receber `value` e `description`, o input passa a exibir o formato `{código} - {descrição oficial SEFAZ}` (ex: `94035000 - Móveis de madeira, do tipo utilizado em quartos de dormir`).
    - Atributo `title` adicionado ao input para leitura completa em tooltip caso o texto ultrapasse a largura visível.
    - O `onChange` propaga o código limpo de 8 dígitos para o modelo fiscal/XML SEFAZ e, opcionalmente, a descrição como segundo parâmetro.
    - `onFocus` executa `e.target.select()` para permitir digitação/substituição ágil de novo termo ou código.
    - `onBlur` consulta a vigência no catálogo e formata automaticamente se um código válido de 8 dígitos foi digitado.
  - `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.tsx`:
    - O input do NCM na aba Fiscal exibe o formato `{código} - {descrição}` ao ser carregado do estado ou selecionado do catálogo.
    - O estado do formulário (`formData.fiscal.ncm`) permanece estritamente com o código limpo de 8 dígitos (garantindo validação Zod e schema SEFAZ íntegros), enquanto `formData.fiscal.ncmDescription` armazena a descrição oficial.
    - Sincronização automática quando a consulta assíncrona do catálogo `getCatalogEntry` retorna a descrição oficial.
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeItemRow.tsx`:
    - Repasse de `description={item.fiscal?.ncmDescription}` e atualização simultânea de `ncm` e `ncmDescription` no callback `onChange` do `NcmSelect`.
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NcmSelect.test.tsx` e `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.test.tsx`:
    - Testes unitários atualizados e novos testes adicionados garantindo que o select contém `{código} - {descrição}` e propaga corretamente para a nota e para o cadastro.
- **Validações e testes executados:**
  - 63 testes unitários aprovados em 2.28s com Vitest.
  - Zero CC-e (conforme FISCAL-016).
  - Sem uso de Supabase local / Docker.

## Gatilho de NCM no cadastro: 3 campos obrigatórios, disparo ao desfocar (onBlur) e bloqueio quando NCM já preenchido

- **Problema e especificação do usuário:**
  1. A seleção de NCM pela IA no cadastro deve ocorrer somente quando **nome do produto**, **categoria** e **descrição** estiverem todos preenchidos.
  2. O disparo deve ocorrer ao **desfocar (`onBlur`)** o último campo desses três que sofrer alteração real (ex: de vazio para preenchido ou mudança de valor).
  3. Se alguma característica de **material** estiver preenchida (`formData.material` ou `technicalValues['Material']` / `technicalValues['Estrutura']`), ela deve ser enviada como contexto adicional para a IA.
  4. A primeira escolha de NCM é automática quando esses 3 campos estiverem preenchidos e o campo desfocado. Porém, se houver qualquer alteração subsequente nesses campos, mas o produto **já tiver um NCM escolhido**, **NÃO deve gerar nova solicitação à IA**. O foco é gerar exclusivamente quando houver alteração nesses campos **E** o NCM **não tiver nada selecionado**.
- **Causa raiz técnica comprovada:** O hook `useProductJevClassification.ts` dependia anteriormente de debounce contínuo enquanto o usuário digitava e não impunha a obrigatoriedade estrita simultânea dos 3 campos (`name`, `category` e `description`). Além disso, não existia o método `onFieldBlur` para captura imediata do evento de perda de foco (`onBlurCapture`) nos inputs e no `<textarea>` da descrição, nem o bloqueio explícito de reclassificação quando `formData.fiscal?.ncm` já estava definido.
- **Arquivos modificados:**
  - `erp/src/pages/App/Products/hooks/fiscal/useProductJevClassification.ts`:
    - Validação dos 3 campos obrigatórios: `isNameFilled` (mínimo 3 caracteres), `isCategoryFilled` (ID ou nome preenchido) e `isDescriptionFilled` (não vazio). Se faltar qualquer um dos 3, a requisição é bloqueada.
    - Bloqueio estrito quando NCM já existe (`hasNcm = Boolean(ncm)`): cancela sugestões e aborta sem chamar a IA (`fetch`).
    - Exposição do método `onFieldBlur(fieldName?: string)` que cancela timers e executa a classificação imediatamente na perda de foco com alteração real (`signature !== lastRequested.current`).
    - Detecção de foco ativo (`isActivelyTyping`) no debounce de segurança para não interromper a digitação do usuário antes do blur.
    - Inicialização de `lastRequested.current` com a assinatura atual quando o formulário abre com NCM já definido, impedindo disparos indevidos se o NCM for limpo sem alteração nos 3 campos.
  - `erp/src/pages/App/Products/hooks/form/useProductDraftCapture.ts`:
    - Adicionada a opção `onFieldBlur?: (fieldName?: string) => void` e propagação do evento em `handleDraftFieldBlurCapture`, `handleDraftSelectChangeCapture` e `handleDraftSearchOptionClickCapture`.
  - `erp/src/pages/App/Products/modals/ProductFormModal.tsx`:
    - Conexão de `onFieldBlur: jev.onFieldBlur` em `useProductDraftCapture`.
  - `erp/src/pages/App/Products/components/tabs/ProductDescriptionTab.tsx`:
    - Adicionada prop `onBlur?: () => void` conectada ao `<textarea>` e aos callbacks de geração de descrição com IA.
  - `erp/src/pages/App/Products/components/form/ProductFormTabContent.tsx`:
    - Repasse de `onBlur={() => jev.onFieldBlur?.('description')}` ao `ProductDescriptionTab`.
  - `erp/src/pages/App/Products/hooks/fiscal/useProductJevClassification.test.tsx`:
    - 6 novos testes unitários cobrindo todos os cenários estritos (falta de descrição, falta de categoria, nome curto, bloqueio quando NCM já existe, disparo via `onFieldBlur` com 3 campos, e reclassificação somente após limpar NCM com alteração nos campos). Total de 15/15 testes aprovados.
- **Validações e testes executados:**
  - 61 testes unitários aprovados em 2.88s abrangendo todo o ecossistema de NCM (`ncmInferenceService`, `useProductJevClassification`, `useNfeItemEnrichment`, `ProductNcmSelector`, `NcmSelect`, `productJevCore`, `productJevEndpoint`).
  - Zero CC-e (conforme FISCAL-016).
  - Sem uso de Supabase local / Docker.

## Texto branco em NF e NFH no estado de alerta

- **Problema observado:** os rótulos NF e NFH em estado `reissue_required`, com fundo âmbar, estavam usando texto marrom escuro, contrariando a preferência visual solicitada para manter o texto dos rótulos sempre branco.
- **Causa raiz comprovada:** `AWAITING_REISSUE_CLASS` em `OrderFiscalBadge.tsx` definia explicitamente `text-[#3b1900]`; o mesmo estilo era compartilhado pelos selos de produção (NF) e homologação (NFH).
- **Arquivos e linhas modificados:** `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.tsx:19-21` define texto branco; `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.test.tsx:134,146` alinha a expectativa existente; `docs/fiscal/README.md:9,45` aponta a preferência vigente; este histórico registra a decisão (`:3-9`).
- **Solução técnica:** o estado âmbar `reissue_required` agora usa `text-white` no rótulo compartilhado por NF e NFH. Ícones, fundo, estado fiscal e ações do selo não mudam.
- **Validação:** inspeção estática do estilo compartilhado e `git diff --check` após a edição. Testes automatizados não foram executados nesta solicitação.

## Rascunhos sem indicadores fiscais e de estoque na lista de vendas

- **Problema e sintomas:** pedidos de venda em `draft` podiam mostrar NF/NFH, o botão de etiquetagem e o indicador de movimentação de estoque nos cards e nas linhas, embora ainda fossem rascunhos.
- **Causa raiz comprovada:** os componentes que renderizam NF/NFH (`OrderCardHeader` e `OrderHistoryRow`) não excluíam pedidos `draft`; em `OrderOperationalBadges`, a etiqueta de estoque e `InventoryMovementBadge` também não tinham essa condição. O selo Bling já possuía guarda de status, mas ela não cobria esses três indicadores.
- **Arquivos e linhas modificados:** `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderHistoryCard/OrderCardHeader.tsx:83` e `OrderHistoryRow.tsx:293` ocultam NF/NFH em rascunhos; `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderOperationalBadges.tsx:67-71,224-226` oculta etiqueta e movimentação; `docs/fiscal/README.md:9` e este histórico (`:3-9`) registram a correção.
- **Solução técnica:** as chamadas de NF/NFH, o botão de etiquetagem e o `InventoryMovementBadge` agora só são renderizados quando o pedido não está em `draft`. O status do pedido e os demais indicadores operacionais permanecem independentes; nenhum estado fiscal ou de estoque é alterado.
- **Validação:** revisão estática das condições e `git diff --check` após a edição. Testes automatizados não foram executados nesta solicitação.

## Credenciais canônicas no runner de leitura da Central

- **Continuidade do launcher:** modo `support-provision` encaminha a operação Vitest separada de provisionamento expressamente autorizada; `support-owned` executa o harness Playwright que confere vínculos reais e restringe escritas aos IDs da Central dessa execução; `support-cleanup` faz a prévia de retenção e só arquiva com os gates e a reserva de eventos autorizados. Usam a mesma origem Vercel Development; não criam artefatos fiscais nem executam os runners fiscais. Fixtures, DDL e limites da Central estão no [registro próprio](../integracoes/central-de-atendimento-fixtures-proposta-2026-10-21.md).

- **Problema e causa comprovada:** o navegador conseguia entrar com um administrador salvo em `erp/.env.local`, mas esse usuário recebia 403 no gate real do operador de teste. Executar `vercel env run` dentro do ERP permitia carregar esse arquivo local com identidade diferente da configuração oficial de Development.
- **Arquivos e linhas:** `scripts/run-vercel-env-dev.cjs:22` adiciona o modo `support-readonly` ao launcher compartilhado; `package.json:13` e `erp/package.json:66` encaminham o runner; `erp/tests/support-readonly/support-login.spec.ts:3` confere origem do ambiente, usuário real e resposta 204 do gate antes da navegação.
- **Solução:** reutilizar o launcher oficial, vinculado ao projeto Vercel correto e executado a partir de `.vercel`, com credenciais somente em memória. O teste troca a sessão local quando ela não corresponde ao operador configurado. Não modifica o autorizador fiscal nem relaxa o gate.
- **Validação:** Playwright 1/1 aprovado na porta 5173, gate 204, Inbox visível e mídia sem sessão recusada com 401. Sem fixture gravada, transmissão fiscal, alteração comercial ou chamada à Meta. A primeira tentativa encontrou um módulo Zod antigo no cache de transformação do Vite; após nova notificação do arquivo, os exports e a navegação foram conferidos novamente.

## Endpoints de Atendimento no adaptador HTTP de desenvolvimento

- **Problema e causa comprovada:** a UI da Central na porta 5173 recebia `404 — Rota não encontrada: /api/whatsapp-media`. O fallback em `scripts/local-fiscal-dev-server.cjs` roteava somente endpoints fiscais e o operador de teste. A listagem de conversas respondia 200; a falha era do roteamento HTTP de mídia.
- **Arquivos modificados:** `scripts/local-fiscal-dev-server.cjs` (resolução de handler e ramo das rotas WhatsApp; coleta do corpo e adaptador da requisição); `scripts/build-customer-support-api.cjs` (novo bundle de desenvolvimento); `package.json` (`dev:api:serve`); `.gitignore` (bundle gerado); `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts` (leitura de bytes já coletados); `erp/src/pages/App/CustomerSupport/__tests__/customerSupportLocalApi.test.ts` (provas HTTP). Os pontos e linhas finais estão no relatório [de continuidade da Central](../integracoes/central-de-atendimento-comandos-2026-10-21.md).
- **Solução:** os três caminhos WhatsApp usam o mesmo handler consolidado, incluindo a autorização de mídia e o bloqueio de despacho. O adaptador preserva o Buffer original para HMAC; a concatenação acontece antes da decodificação UTF-8, evitando corromper caracteres divididos entre chunks. O ramo fiscal existente continua com seu contrato de query/body/resposta. Nenhuma regra fiscal, XML, transmissão ou dado comercial foi alterado.
- **Validação:** cinco testes Vitest do adaptador HTTP passaram: health/rota inexistente; mídia sem sessão (401) em dois caminhos; despacho (403) em dois caminhos; assinatura inválida (401) e segredo ausente em produção (503); corpo UTF-8 dividido entre chunks com assinatura correta (200). O último payload tem `entry: []` e a prova bloqueia qualquer fetch externo: não chama banco, Meta ou SEFAZ. A prova não certifica fluxos fiscais nem persistência autenticada. Revalidação pela UI de desenvolvimento registrada no relatório da Central após reinício da API.

## Seleção de NCM pelo Jev com orçamento global de tokens e contextos separados

- **Objetivo:** usar o Jev como decisor de NCM, com um teto operacional para evitar loops, chamadas repetidas e gasto inesperado.
- **Cadastro de produto:** o endpoint envia nome, título, descrição, material e categoria disponíveis no formulário. O Jev escolhe somente entre candidatos retornados pelo catálogo; o servidor valida novamente que o NCM escolhido está ativo e vigente antes de devolver a sugestão.
- **Emissão de nota:** para um produto sem NCM válido já cadastrado, o emissor chama o mesmo endpoint com `source: "invoice"` e somente o título/nome do item. O caminho local de inferência semântica não decide o NCM nesse fluxo. NCM cadastrado e vigente, snapshots fiscais e notas autorizadas continuam preservados.
- **Proteção de gasto e repetição:** a API estima os tokens de entrada e reserva atomicamente o orçamento em Supabase antes de chamar o Jev. O teto compartilhado entre instâncias é 2.000 tokens estimados em janela móvel de 60 segundos. A requisição reduz o prompt a até oito candidatos NCM e só inclui escolha automática de categoria quando o catálogo tem até 16 opções; acima disso, a categoria permanece manual. Chamadas idênticas em andamento são recusadas; um resultado idêntico é reutilizado por até 60 segundos após nova validação de categoria/NCM. Após a resposta, o servidor substitui a estimativa pelo `usage.input_tokens` reportado, quando disponível; em falhas, mantém a reserva pelo restante da janela. O frontend mantém debounce/controle de requisição e o servidor é a proteção autoritativa contra concorrência e repetição.
- **Arquivos:** `api/products/classify.ts`; `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts`; `supabase/migrations/20261021140000_jev_classification_token_budget.sql`; `docs/fiscal/README.md`.
- **Ativação e validação:** a migration foi preparada localmente, mas não aplicada no Supabase remoto; sem a RPC disponível, o endpoint falha fechado e não chama o Jev. A mudança não foi publicada na Vercel. Testes e build não foram executados nesta solicitação.

## Inferência semântica e seleção automática de NCM em todas as categorias (criação de produto e emissão de NF)

- **Problema identificado e sintomas observados:** No campo de NCM da criação do produto e da emissão de nota fiscal de saída, o NCM precisava ser suposto/selecionado automaticamente conforme o nome do produto. Na emissão de nota fiscal, foi exigido especificamente que se o produto for cadastrado, deve buscar a descrição cadastrada (`products.description`), categoria e material para alimentar a inferência; se não for cadastrado, deve usar estritamente o nome do item na linha do pedido (`item.description`). Além disso, a inferência semântica exemplificada para guarda-roupa (onde guarda-roupa implica dormitório/quarto e móvel de madeira padrão `94035000`) precisava abranger todas as categorias de produtos (cozinha, escritório, estofados, colchões, camas box, artigos de cama, sala/estar e qualquer outra categoria através de busca dinâmica no catálogo de NCMs ativos da loja).
- **Causa raiz técnica comprovada:** O emissor fiscal e o cadastro de produtos não compartilhavam um motor central de inferência semântica determinística e busca dinâmica no catálogo. No emissor, itens cadastrados não tinham sua `description` recuperada em lote do banco de dados, dependendo apenas do texto da linha do pedido. No cadastro, o NCM gerava apenas banner de sugestão pendente em vez de preencher o formulário quando vazio, e não exibia a descrição oficial do NCM selecionado como feedback visual.
- **Arquivos modificados:**
  - `shared-utils/ncmClassification.ts`: Centralização das constantes oficiais NCM (Capítulo 94 do SH) e função pura `resolveSemanticNcmCode` cobrindo dormitório (`94035000`/`94032000`), cozinha (`94034000`), escritório (`94033000`/`94031000`), estofados/assentos (`94016100`/`94017100`/`94016900`/`94017900`), colchões/bases (`94042100`/`94042900`/`94041000`), artigos de cama/têxteis (`94049000`), e móveis em geral (`94036000`).
  - `erp/src/services/fiscal/ncmInferenceService.ts`: Criação do serviço central de inferência determinística com fallback dinâmico para busca em catálogo (`ncmService.searchNcms`) cobrindo 100% das categorias e validação estrita de atividade e vigência em data corrente (`ncmService.getCatalogEntry`).
  - `erp/src/services/fiscal/ncmService.ts`: Exposição de `inferProductNcm` e re-exportação para consumo uniforme em todo o ERP.
  - `api/products/classificationCore.ts`: Otimização dos termos de busca de NCM (`buildNcmSearchTerms`) e padronização das regras de semântica.
  - `api/products/classify.ts`: Preservação de `description` e `material` para itens de nota fiscal com produtos cadastrados (`source: 'invoice'`).
  - `erp/src/pages/App/Products/hooks/fiscal/useProductJevClassification.ts`: Preenchimento automático do NCM no cadastro quando o campo fiscal estiver vazio, com confirmação de vigência ativa.
  - `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.tsx`: Exibição da descrição oficial do NCM ativo selecionado como feedback visual imediato abaixo do input.
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts`: Busca em lote da descrição cadastrada (`products.description`), categoria e material para itens cadastrados; uso restrito do nome do item para itens não cadastrados; inferência central automática e preenchimento de `ncm` e `ncmDescription`.
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeItemRow.tsx`: Renderização da descrição oficial do NCM sob o campo `NcmSelect`.
  - Testes unitários dedicados em:
    - `erp/src/services/fiscal/ncmInferenceService.test.ts` (13 testes)
    - `erp/src/pages/App/Products/hooks/fiscal/useProductJevClassification.test.tsx` (9 testes)
    - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.test.tsx` (8 testes, incluindo testes de produto cadastrado vs não cadastrado)
    - `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.test.tsx` (5 testes)
    - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NcmSelect.test.tsx` (6 testes)
    - `erp/src/pages/App/Products/hooks/fiscal/productJevCore.test.ts` (5 testes)
    - `erp/src/pages/App/Products/hooks/fiscal/productJevEndpoint.test.ts` (9 testes)
- **Solução técnica implementada:**
  1. Criação do serviço central de inferência `ncmInferenceService.ts`.
  2. Implementação das regras determinísticas para todas as famílias do Capítulo 94 da NCM/SH, além de busca por similaridade em todo o catálogo de NCMs ativos para outras categorias.
  3. No emissor fiscal de saída: consulta atômica de `description`, `category` e `material` em `products` para itens cadastrados; isolamento estrito para itens não cadastrados, usando apenas o nome do pedido.
  4. Validação estrita de vigência (`start_date`, `end_date`, `active`, `is_active`) garantindo que nenhum NCM inativo ou expirado seja pré-selecionado.
  5. Campo permanece 100% editável e com busca interativa via autocomplete caso o usuário deseje alterar o código.
  6. Feedback visual com descrição oficial em verde no cadastro de produtos e no modal fiscal de emissão.
- **Validações e testes executados:**
  - 55 testes unitários executados e 100% aprovados em 2.24s com Vitest/happy-dom.
  - Zero CC-e (conforme FISCAL-016).
  - Sem uso de Supabase local / Docker.

## Classificação automática de NCM no cadastro e na emissão

- **Problema observado:** o cadastro não encaminhava o rótulo da categoria selecionada junto do ID; na emissão, uma inferência local sem resultado podia deixar o campo vazio. A regra de guarda-roupa também dependia apenas da escolha do Jev.
- **Causa raiz técnica:** os dois fluxos não compartilhavam uma precedência única para NCM salvo, inferência, catálogo e fallback. A classificação do cadastro não recebia sempre o nome da categoria selecionada, e o endpoint não priorizava o código determinístico de móvel de dormitório.
- **Arquivos modificados:** `shared-utils/ncmClassification.ts`; `api/products/classificationCore.ts`; `api/products/classify.ts`; `erp/src/pages/App/Products/hooks/fiscal/useProductJevClassification.ts`; `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts`; `erp/src/services/fiscal/ncmInferenceService.ts`; `erp/src/services/fiscal/ncmService.ts`; `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts`; testes focados dos dois fluxos; `docs/fiscal/README.md` e este histórico.
- **Solução técnica:** no cadastro, nome, título, categoria selecionada, descrição e material alimentam a busca e a classificação do Jev. Na emissão, a inferência central tenta os dados fiscais salvos; se não resolver, a API usa `source: "invoice"` e envia somente o título do item. Guarda-roupa, roupeiro e móveis de quarto presumidos de madeira recebem `94035000` somente após conferência de atividade e vigência; material explicitamente não madeireiro impede essa regra. O candidato também é conferido no catálogo antes de preencher o campo. NCM já salvo e válido, escolha manual, snapshots/rascunhos e XML de nota autorizada permanecem preservados; se a classificação ou o catálogo falharem, o campo continua editável.
- **Base de classificação:** a Receita Federal identifica `9403.50.00` como “Móveis de madeira, do tipo utilizado em quartos de dormir” ([Solução de Consulta da Receita Federal](https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=58494)); o catálogo Supabase consultado nesta revisão confirma o código ativo desde `2022-04-01`, sem data de término.
- **Validação:** 49 testes focados em 7 arquivos passaram: 27 de cadastro/classificador, 8 de emissão, 13 de inferência central e 1 de ordenação do catálogo. ESLint dos arquivos ERP conferidos não apontou erros (2 avisos de variáveis não usadas). O TypeScript isolado da API/classificação passou; o `tsc --project tsconfig.fiscal.json` ainda aponta erros fora do caminho de NCM (`NfeFiscalIssueModal.tsx`, `FiscalIssueCard.tsx` e `commercialScheduling`), sem erros nos arquivos de NCM após a correção da importação do tipo no emissor. `git diff --check` passou. Nenhuma emissão/transmissão fiscal foi realizada.

## Preenchimento automático de NCM no cadastro e na emissão de saída

- **Problema observado:** o cadastro de produto apresentava uma sugestão de NCM aguardando clique em “aceitar”, em vez de preencher o campo. Na emissão, itens sem NCM ficavam em branco porque a API de classificação não era chamada pelo enriquecimento do emissor. A busca também podia deixar categoria/material de fora e não normalizava “geroupa”.
- **Causa raiz:** a classificação automática do cadastro estava ligada apenas à caixa de sugestão, e o caminho da emissão só reaproveitava snapshots/rascunhos. A extração de termos do endpoint `api/products/classify.ts` priorizava o título e limitava a busca aos primeiros cinco termos.
- **Arquivos modificados:** `shared-utils/ncmClassification.ts`; `api/products/classificationCore.ts`; `api/products/classify.ts`; `erp/src/pages/App/Products/hooks/fiscal/useProductJevClassification.ts`; testes de classificação em `erp/src/pages/App/Products/hooks/fiscal/`; `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts`; `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/item-enrichment/itemFiscalMerger.ts`; testes do enriquecimento do emissor; `docs/fiscal/README.md`.
- **Solução:** quando o campo está vazio, o cadastro e o emissor classificam usando o nome, categoria e material disponíveis; a API carrega a categoria salva do produto quando necessário. Só preenchem automaticamente com candidato confirmado como ativo e vigente no catálogo. Nomes com “guarda-roupa”, “roupeiro”, “closet”, “armário de quarto” e a variante “geroupa” selecionam `94035000` para móvel presumido de madeira, desde que o material/título não indique aço, metal, plástico, vidro, alumínio ou outro material não madeireiro. Se o catálogo ou o serviço falhar, o campo segue editável. NCM já salvo, escolha manual e dados recuperados de snapshot/rascunho são preservados; na presença de nota autorizada, o XML histórico continua sendo a fonte exclusiva e não é reclassificado.
- **Base de classificação:** a Receita Federal identifica `9403.50.00` como “Móveis de madeira, do tipo utilizado em quartos de dormir” ([Solução de Consulta da Receita Federal](https://normas.receita.fazenda.gov.br/sijut2consulta/anexoOutros.action?idArquivoBinario=58494)); o catálogo Supabase consultado nesta revisão confirma o código ativo desde `2022-04-01`, sem data de término.
- **Validação:** 25 testes focados em cadastro/classificação e 5 testes do enriquecimento da emissão passaram; ESLint dos arquivos alterados e TypeScript isolado dos módulos de API/classificação passaram. O `tsc --project tsconfig.fiscal.json` ainda aponta erros fora dos arquivos desta alteração (`NfeFiscalIssueModal.tsx`, `FiscalIssueCard.tsx` e `commercialScheduling`). `git diff --check` executado. Nenhuma emissão/transmissão fiscal foi realizada.

## Presença NFC-e e identificação alinhadas ao controle “Informar entrega?”

- **Problema e sintomas observados:** o controle de entrega definido no emissor podia divergir da presença e da obrigatoriedade de CPF/CNPJ calculadas pelo modal, backend e serializador. Uma NFC-e sem entrega podia herdar `indPres` não presencial do contexto ou ser validada contra `shipping.deliveryMethod='delivery'` persistido, apesar da NF estar definida sem transporte.
- **Causa raiz técnica comprovada:** `fiscalPresence` convertia para `indPres=1` somente o `indPres=4` legado; os demais indicadores persistidos continuavam ativando a exigência de identificação. Além disso, `resolveRecipientRequirementsForModal` e `NfeItemsSection` usavam a modalidade comercial do pedido em vez da modalidade fiscal escolhida para a NF, e o serializer comparava a presença fiscal com o método comercial persistido. O backend e o emissor não compartilhavam a mesma resolução para os dois estados do controle.
- **Arquivos e linhas modificados:** `shared-utils/fiscalDocumentModel.ts:145-156` define a presença 1 da NFC-e em retirada; `shared-utils/fiscalTransportModel.ts:34-55` centraliza a modalidade efetiva; `api/nfe/normalSaleRuleSet.ts:10-16,135-140` aplica a modalidade ao cálculo e transporte do documento; `api/nfe/fiscalXmlSerializer.ts:6,76-104` confere entrega/retirada com o estado da tentativa; `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/utils/nfeModalCalculations.ts:4,65-86` e `NfeEmissionModal.tsx:223-229` calculam a exigência do destinatário usando o controle atual; `nfe-modal/components/NfeEmissionPanels.tsx:230` e `nfe-modal/NfeItemsSection.tsx:10,41,58-64,111-115` encaminham e usam a modalidade atual nos itens; `erp/server/nfe/emit.cjs:3837-3848,4073-4088,5646-5652` é o bundle fiscal regenerado; os mapas gerados `erp/server/nfe/emit.cjs.map:1`, `audit-order-edit.cjs.map:1`, `cancel.cjs.map:1` e `consult.cjs.map:1` acompanham as fontes atualizadas; `docs/fiscal/README.md:9` adiciona esta referência.
- **Solução técnica:** ao desligar “Informar entrega?” na NFC-e, todos esses caminhos tratam a operação como retirada presencial (`indPres=1`), mesmo que o pedido comercial tenha sido salvo como entrega ou guarde outro indicador de presença. Ao ligar o controle, a NFC-e usa entrega (`indPres=4`). Os casos que atingem o limite fiscal de valor continuam exigindo identificação; a NF-e modelo 55 mantém sua regra própria. O pedido comercial não é alterado.
- **Base normativa:** aplica a matriz já registrada em [CPF opcional na retirada NFC-e sem transporte](historico-correcoes-2026-10-20.md#cpf-opcional-na-retirada-nfc-e-sem-transporte), fundamentada no Regulamento do ICMS do Paraná e no MOC 7.0, Anexo I. Este ajuste não amplia a dispensa de identificação por valor nem altera a exigência de NF-e modelo 55.
- **Validação:** inspeção estática dos caminhos compartilhados e build dos handlers fiscais com `node erp/scripts/build-fiscal.cjs`; testes automatizados não foram executados nesta solicitação. Nenhuma consulta/escrita remota ou transmissão à SEFAZ foi realizada.
