# Replicação ERP Web → App Mobile: Notas Fiscais de Entrada

## Estado da auditoria

Auditoria em andamento. O código do ERP define comportamento e regras; o layout mobile pode reorganizar conteúdo para telas estreitas. O preview local está em `http://localhost:8081/?tab=estoque`, autenticado na porta local. A viewport do app observada é `375 × 929` CSS (tamanho M usado na conferência). Cliques com mouse do controle CUA falham (`Input.dispatchMouseEvent`), mas `press('Enter')` nos controles focáveis permite abrir componentes.

## Checklist por área/estado

### Lista e filtros

- [x] Mesmo filtro inicial: mês atual; opções mês anterior, ano atual, ano anterior, mês e intervalo personalizados.
- [x] Busca com debounce, limpeza e retorno à página 1.
- [x] Consulta paginada de 15 itens, ordenada por emissão decrescente.
- [x] Chave de acesso com 44 dígitos não fica limitada ao período selecionado.
- [x] Loading, erro e lista vazia são estados tratados no app.
- [x] App evita aplicar `ilike` ao campo inteiro `numero_nfe`; pesquisa por igualdade no número e por CNPJ/chave para termos numéricos.
- [x] Comparar lista principal e resultado da busca numérica `1337` no Web × App; ambos mostram NF-e #133744.
- [x] Comparar opções abertas do filtro de período; os seis rótulos coincidem.
- [x] Comparar busca sem resultados no Web × App; o cabeçalho e subtítulo mobile agora usam a mesma mensagem do ERP.
- [x] Conferir paginação por código e teste focado: página 1 consulta itens 0–14, página 2 consulta 15–29; controles exibem índices 1-based como o ERP.
- [ ] Comparar paginação com múltiplas páginas; os dados de referência disponíveis têm somente 1 página.

**Risco observado no código ERP, sem falha reproduzida:** a busca inclui `numero_nfe.ilike` para um campo numérico; ainda assim, o teste visual `1337` retornou a mesma NF-e no ERP e no app. Não há evidência nesta auditoria de diferença funcional de busca.

### Cartões/tabela e ações

- [x] App apresenta cartões para a lista; ERP apresenta tabela em telas XL e cartões abaixo de XL.
- [x] Toque no cartão abre detalhes; o menu oferece vínculos, XML e remoção.
- [x] Remoção pede confirmação e informa que recebimentos e vínculos não são afetados.
- [x] Menu aberto comparado: ERP e app oferecem gerenciar vínculos, baixar XML e remover.
- [ ] Comparar visualmente badges, confirmação de remoção e estado sem XML.
- [x] Predicado de vínculo dos badges alinhado ao ERP: usa `matchedProductId`/`matched_product_id` no item ou snapshot; `product_id` e `compositionLinks` sozinhos não encerram pendências. A nota de referência com 1 item sem vínculo continua exibindo pendência nos dois lados.
- [x] Alinhar o alerta de chave duplicada para incluir chave formatada, número/série, emitente e preservação da nota existente; comportamento verificado por inspeção do fluxo ERP e app. A confirmação visual com XML duplicado permanece pendente, pois exige submeter um arquivo real.
- [x] Removida a ação “Ver Detalhes completos” do menu mobile (não existe no menu do ERP; detalhes abrem pelo cartão) e alinhado o rótulo “Baixar XML”.

### Detalhes da NF-e

- [x] Emitente, destinatário, identificadores fiscais, datas, valores, impostos, observações e itens constam na implementação mobile.
- [x] Loading/indisponibilidade e lista de itens vazia são tratados.
- [x] Itens incluem descrição, código/EAN, NCM/CEST/CFOP, unidade, quantidade, valores, frete e tributos.
- [x] Comparar screenshots dos detalhes no app (375 × 929 CSS) e no ERP desktop. Número/série, chave, status, fornecedor/destinatário, dados fiscais, 27 itens, totais e tributos coincidem; layout mobile empilha as informações em uma coluna responsiva.
- [ ] Resolver divergência em “Recebida em”: ERP mostra 17/09/2026, app mostra 23/09/2026. Ambos mapeiam `updated_at`; a consulta mobile o seleciona explicitamente, enquanto a consulta ERP usa `*`. A diferença vem do valor/estado entregue à tela, não de um campo de mapeamento distinto demonstrado no código. Não trocar por `created_at` sem confirmar que esse campo produz o valor esperado.
- [x] Formatação de datas no resumo alinhada ao ERP: a parte ISO `YYYY-MM-DD` é formatada sem conversão de fuso. Isso elimina deslocamento de um dia; a diferença de valor observada (seis dias) continua sem causa confirmada.

### Importação XML e consulta SEFAZ

- [x] App seleciona XML via Document Picker; ERP também aceita arrastar e soltar no navegador (adaptação específica de plataforma).
- [x] Código mobile mantém leitura OCR/código de barras/QR da chave e consulta abrindo a página oficial SEFAZ com a chave preenchida; não chama `sefaz-inbound-sync`.
- [x] Scanner nativo usa `expo-camera`/`CameraView` e `expo-mlkit-ocr`; plugin `expo-camera` e descrição da permissão iOS foram registrados no `app.json`, com permissão Android confirmada na configuração Expo. O teste de câmera em dispositivo permanece pendente.
- [x] Extração de chave QR/barcode/OCR consolidada em helper focado: reconhece 44 dígitos contínuos, separados por espaços ou isolados em URL QR; rejeita payload sem chave única. Testes unitários focados passaram; teste com câmera real segue pendente por não conceder permissão no navegador.
- [x] Importação grava cabeçalho XML/itens, verifica chave duplicada e oferece gerenciamento de vínculos após salvar.
- [x] Comparar o estado inicial do modal de importação: campo da chave, scan, consulta SEFAZ, seleção XML e cancelamento estão presentes.
- [ ] Comparar estados: arquivo selecionado, chave escaneada, XML inválido/duplicado, sucesso e cancelamento.
- [x] Validar por código que parser mobile e parser ERP mantêm a mesma validação/modelagem; os testes focados do parser passaram anteriormente. A confirmação visual de arquivo válido/inválido e duplicado permanece pendente para não persistir uma NF de teste.
- [x] Confirmar adaptação mobile: controles de chave empilhados e modal ocupa a tela; no ERP o diálogo fica centralizado.
- [ ] Validar no navegador/câmera somente os estados que exigirem interação real, após teste focado.

### Acessibilidade e navegação automatizada

- [ ] Melhorar a semântica acessível das abas: hoje aparecem como `container`/texto sem role `tab`/`button`. A ativação por Enter funcionou quando a aba foi focada; a falha de clique permanece específica do transporte de automação e não prova falha de toque real.

## Validação focada registrada

Comando PowerShell (executado no diretório `mobile`): `$env:NODE_PATH = (Resolve-Path ..\erp\node_modules).Path; ..\erp\node_modules\.bin\vitest.cmd run --config vitest.config.ts src/features/stock/invoices/utils/invoiceList.test.ts`.

Mesmo comando, com o alvo `src/features/stock/invoices/utils/inboundXmlParser.test.ts`, para o parser XML.

Resultado: `invoiceList.test.ts` (4 testes) e `inboundXmlParser.test.ts` (3 testes) passaram em execuções focadas separadas. A primeira tentativa através do script do ERP não resolveu `vitest/config` a partir do diretório mobile; o comando acima forneceu o caminho de módulos do ERP sem instalar dependências adicionais.

Na alteração do menu de ações, `invoiceList.test.ts` voltou a passar (4 testes). A tentativa `tsc --noEmit -p tsconfig.json` terminou com `RangeError: Maximum call stack size exceeded` dentro do checker TypeScript, sem produzir diagnóstico do código alterado; typecheck permanece sem confirmação.

Após alinhar os critérios de vínculo e explicitar o cálculo da paginação por página zero-based, `invoiceList.test.ts` passou novamente com 5 testes, incluindo as faixas 0–14 e 15–29. A verificação visual da segunda página segue pendente por não haver mais de 15 notas na conta de referência.

Com a inclusão do formatador de data equivalente ao ERP, `invoiceList.test.ts` passou com 6 testes (inclui ISO com fuso, data ISO simples e data já formatada). `npx tsc --noEmit --pretty false -p tsconfig.json` continua falhando internamente com `RangeError: Maximum call stack size exceeded`; não houve diagnóstico do código. Não há script de lint definido no `mobile/package.json`.

Após consolidar extração QR/barcode/OCR, os testes focados `accessKey.test.ts` e `invoiceList.test.ts` passaram juntos (9 testes); o caso QR cobre uma chave isolada dentro de URL com dígitos adicionais. O typecheck continua reproduzindo o mesmo `RangeError` interno do TypeScript.

A alteração de tipografia em `InvoiceDetailsModal` é somente visual/CSS; foi verificada com captura de viewport M após HMR, sem executar suíte adicional.

Ajuste de texto do estado sem resultados foi validado com screenshot no preview em viewport mobile (`375 × 929` CSS); não se aplicou teste unitário a essa mudança exclusivamente textual.

## Comparação visual capturada

- Paginação do estado atual: ambos mostram 1 nota, `1 / 1` e controles anterior/próxima desabilitados. Os offsets de duas páginas passaram no teste focado; não há dataset visual com mais de 15 notas para comparar a segunda página.

- Lista principal: ERP e app mostram NF-e #133744, série 1, HORFRAN COMERCIAL ELETRO MOVEIS LTDA, emissão em 14/09/2026, 27 itens e R$ 5.967,88. Busca parcial `1337` retorna a mesma nota nos dois lados.
- ERP em viewport desktop usa cartão de uma coluna; app em viewport estreita usa cartão responsivo e controles compactos.
- Modal de período do app mostra as mesmas seis opções exibidas no seletor do ERP. Estado de intervalo personalizado foi conferido dos dois lados com agosto–setembro de 2026 e mesma nota encontrada.
- Busca sem resultado conferida nos dois previews. O título e subtítulo do app foram ajustados para coincidir com o ERP; screenshot após HMR confirmou o texto.
- Menu de ações conferido nos dois previews; “Gerenciar vínculos”, “Baixar XML” e “Remover NF de entrada” estão presentes nos dois. App mantinha uma ação extra de detalhes no menu; removida, pois o ERP abre os detalhes pelo cartão.
- Modal de vínculos aberto nos dois previews para NF-e #133744. Fornecedor, 27 itens, 26 vínculos existentes e valores exibidos nos itens conferidos coincidem. O ERP exibiu o banner “EMERGENCY KILL SWITCH ATIVADO — Mais de 200 requests em 5000ms” após abrir esse estado; parei a exploração desse modal no ERP para evitar novas leituras pesadas. O app carregou os 27 itens.
- Modal de importação: mesma finalidade e mesmos controles essenciais. Diferença de apresentação esperada por responsividade: tela cheia/fluxo vertical no app, diálogo centralizado com controles horizontais no ERP.
- Modal de detalhes comparado visualmente nos dois previews: conteúdo fiscal equivalente; modal vertical e rolável no app, centralizado e mais largo no ERP.
- Detalhes da NF-e #133744 abertos nos dois previews. Chave, status, CNPJ, emitente/destinatário, IE, natureza, protocolo, valores fiscais, observações e detalhes dos 27 itens (código, EAN, NCM/CEST/CFOP, quantidades, preços, frete e tributos) coincidem. O ERP mostra recebimento em 17/09/2026; app em 23/09/2026, embora os dois componentes leiam `updated_at`. A discrepância foi registrada sem substituir a data por outro campo sem evidência.
- A tipografia dos dados fiscais e dos itens do modal mobile foi aumentada levemente após a captura de viewport M mostrar textos excessivamente pequenos; nova captura após HMR confirmou melhor legibilidade e rolagem do conteúdo.
- Capturas foram feitas nos previews localhost autenticados já abertos. O app estava em `375 × 929` CSS. Nenhum arquivo foi selecionado; não houve gravação ou exclusão.

## Próxima etapa

Retomar pelos itens pendentes deste checklist: resolver a divergência da data de recebimento com evidência dos dados retornados, comparar badges/confirmação/estado sem XML e avançar pelos estados alternativos de importação sem persistir uma NF de teste. Validar a câmera em dispositivo quando houver ambiente nativo disponível. Não repetir a leitura pesada do modal de vínculos no ERP enquanto o kill switch estiver ativo.

## Handoff para continuar em outro PC

### Objetivo

Concluir a equivalência funcional e visual do módulo ERP Web **Notas Fiscais de Entrada** no app React Native, mantendo layout responsivo e trabalhando **uma aba/estado por vez**. O ERP é a referência de regras e comportamento; a organização visual pode se adaptar à tela mobile.

### Estado atual

- A auditoria e as diferenças encontradas estão registradas neste checklist. As comparações feitas cobrem lista, filtros, paginação disponível, menu de ações, detalhes, vínculos e estado inicial da importação.
- A extração da chave de acesso por OCR/QR/barcode está consolidada no helper focado; o app usa `expo-camera`/`CameraView` e `expo-mlkit-ocr` no nativo. O plugin e as permissões foram registrados em `mobile/app.json`; é necessário build nativo novo para essa configuração surtir efeito. Ainda falta validar em dispositivo.
- A consulta SEFAZ deve abrir o site oficial com a chave preenchida. Não chamar `sefaz-inbound-sync`.
- O alerta de duplicidade foi ajustado para mostrar chave agrupada, número/série e emitente, preservando a nota existente.
- Há uma diferença ainda sem causa comprovada em “Recebida em”: ERP mostra 17/09/2026 e app 23/09/2026, ambos lendo `updated_at`. Não trocar para `created_at` sem verificar o dado e o fluxo que define a data.
- O ERP ativou kill switch por mais de 200 requests/5s no modal de vínculos. Não repetir leituras pesadas desse estado enquanto estiver ativo.
- A lista de referência tem somente uma página; comparação visual da segunda página depende de dados com mais de 15 notas.
- As abas compactas de Estoque e Operações também receberam o ajuste solicitado de remover separador superior/espaço, mantendo-as encostadas ao cabeçalho. Preservar esse trabalho no checkout.

### Próximas ações, em ordem

1. Conferir a origem/dado de `updated_at` e o caminho que alimenta “Recebida em” no ERP e no app; documentar a causa antes de alterar o mapeamento.
2. Comparar visualmente os badges de vínculo, a confirmação cancelável de remoção e o estado de NF sem XML.
3. Conferir estados alternativos do importador (chave escaneada, arquivo inválido, duplicado, sucesso e cancelamento) sem importar XML real nem gravar nota de teste em produção.
4. Validar OCR/QR/barcode com câmera em dispositivo nativo e confirmar extração de chave de 44 dígitos. A prévia web não substitui esse teste.
5. Fechar itens de acessibilidade das abas, e repetir apenas as verificações focadas necessárias após cada correção.
6. Atualizar os checkboxes e registrar resultados neste documento; encerrar quando não houver diferenças conhecidas sem justificativa técnica.

### Regras de acesso e validação

- Para autenticação e comparação local, usar **localhost nas portas 80 ou 81**. Não usar endereço LAN nem porta 82. Previews conhecidos durante esta auditoria: ERP em `http://localhost:5173` e app Expo Web em `http://localhost:8081/?tab=estoque`; confirmar os endereços disponíveis no novo PC.
- Não usar Docker. Preferir preview local e navegador quando a comparação visual for necessária. Não conceder permissão de câmera ao navegador para simular a câmera nativa.
- Após mudança de código, executar primeiro somente o teste focado do módulo alterado. Subir para integração ou Playwright só se o escopo realmente envolver fluxo integrado. Para mudanças pequenas de texto/CSS, fazer validação mínima (TypeScript/lint quando disponível e, no máximo, inspeção visual); suíte completa fica para CI no push/PR.
- Não executar importação, exclusão ou consulta que persista dados reais durante a comparação. A gravação de XML/itens foi autorizada para a implementação, mas não é necessária para validar os estados visuais pendentes.

### Comandos e limitações já conhecidos

Teste focado de lista/chave, a partir de `mobile` (adapte o shell/caminho do ambiente):

```powershell
$env:NODE_PATH = (Resolve-Path ..\erp\node_modules).Path
..\erp\node_modules\.bin\vitest.cmd run --config vitest.config.ts src/features/stock/invoices/utils/accessKey.test.ts src/features/stock/invoices/utils/invoiceList.test.ts
```

Último resultado registrado: dois arquivos, 9 testes passaram. Os testes focados do parser XML e da lista também passaram anteriormente; consulte o histórico de validação acima antes de repetir.

O `tsc --noEmit --pretty false -p tsconfig.json` falhou dentro do checker TypeScript (`RangeError: Maximum call stack size exceeded`), sem diagnóstico do projeto. `mobile/package.json` não define script de lint. `git diff --check` estava limpo na última verificação. O workspace contém outras alterações do usuário além da NF-e; preserve-as e confira `git status` antes de qualquer commit.
