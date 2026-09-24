# Replicação ERP Web → App Mobile: Notas Fiscais de Entrada

## Estado da auditoria

Auditoria em andamento. O código do ERP define comportamento e regras; o layout mobile pode reorganizar conteúdo para telas estreitas. O preview local está em `http://localhost:8081/?tab=estoque`. Cliques com mouse do controle CUA falham (`Input.dispatchMouseEvent`), mas a API Playwright conectada à aba ativa permite abrir componentes com `press('Enter')`. O screenshot disponível mostra viewport estreita; a conferência no tamanho M solicitado continua pendente.

## Checklist por área/estado

### Lista e filtros

- [x] Mesmo filtro inicial: mês atual; opções mês anterior, ano atual, ano anterior, mês e intervalo personalizados.
- [x] Busca com debounce, limpeza e retorno à página 1.
- [x] Consulta paginada de 15 itens, ordenada por emissão decrescente.
- [x] Chave de acesso com 44 dígitos não fica limitada ao período selecionado.
- [x] Loading, erro e lista vazia são estados tratados no app.
- [x] App evita aplicar `ilike` ao campo inteiro `numero_nfe`; pesquisa por igualdade no número e por CNPJ/chave para termos numéricos.
- [x] Comparar lista principal e resultado da busca numérica `1337` no Web × App.
- [x] Comparar opções abertas do filtro de período; os seis rótulos coincidem.
- [x] Comparar busca sem resultados no Web × App; o cabeçalho e subtítulo mobile agora usam a mesma mensagem do ERP.
- [ ] Comparar paginação com múltiplas páginas; os dados de referência disponíveis têm somente 1 página.

**Diferença observada no código ERP:** a busca numérica do ERP inclui `numero_nfe.ilike`, embora `numero_nfe` seja `INTEGER` no schema. Isso pode falhar no servidor e acionar o fallback de cache local. O app mantém operadores compatíveis com o tipo e não replica a falha. O campo da chave de acesso também contém o número da NF-e, permitindo busca parcial por número sem converter a coluna inteira em texto.

### Cartões/tabela e ações

- [x] App apresenta cartões para a lista; ERP apresenta tabela em telas XL e cartões abaixo de XL.
- [x] Toque no cartão abre detalhes; menu oferece vínculos, XML, detalhes e remoção.
- [x] Remoção pede confirmação e informa que recebimentos e vínculos não são afetados.
- [ ] Comparar visualmente badges, menu aberto, confirmação e estado sem XML.

### Detalhes da NF-e

- [x] Emitente, destinatário, identificadores fiscais, datas, valores, impostos, observações e itens constam na implementação mobile.
- [x] Loading/indisponibilidade e lista de itens vazia são tratados.
- [x] Itens incluem descrição, código/EAN, NCM/CEST/CFOP, unidade, quantidade, valores, frete e tributos.
- [ ] Comparar screenshots do modal em viewport M no mobile e no desktop. O modal do app foi capturado no estado real de 27 itens, mas a interação de abrir os detalhes no ERP ainda não foi acionada pelo navegador.

### Importação XML e consulta SEFAZ

- [x] App seleciona XML via Document Picker; ERP também aceita arrastar e soltar no navegador (adaptação específica de plataforma).
- [x] Código mobile mantém leitura OCR/código de barras/QR da chave e consulta abrindo a página oficial SEFAZ com a chave preenchida; não chama `sefaz-inbound-sync`.
- [x] Importação grava cabeçalho XML/itens, verifica chave duplicada e oferece gerenciamento de vínculos após salvar.
- [x] Comparar o estado inicial do modal de importação: campo da chave, scan, consulta SEFAZ, seleção XML e cancelamento estão presentes.
- [ ] Comparar estados: arquivo selecionado, chave escaneada, XML inválido/duplicado, sucesso e cancelamento.
- [x] Confirmar adaptação mobile: controles de chave empilhados e modal ocupa a tela; no ERP o diálogo fica centralizado.
- [ ] Validar no navegador/câmera somente os estados que exigirem interação real, após teste focado.

### Acessibilidade e navegação automatizada

- [ ] Melhorar a semântica acessível das abas: hoje aparecem como `container`/texto sem role `tab`/`button`. A ativação por Enter funcionou quando a aba foi focada; a falha de clique permanece específica do transporte de automação e não prova falha de toque real.

## Validação focada registrada

Comando PowerShell (executado no diretório `mobile`): `$env:NODE_PATH = (Resolve-Path ..\erp\node_modules).Path; ..\erp\node_modules\.bin\vitest.cmd run --config vitest.config.ts src/features/stock/invoices/utils/invoiceList.test.ts`.

Mesmo comando, com o alvo `src/features/stock/invoices/utils/inboundXmlParser.test.ts`, para o parser XML.

Resultado: `invoiceList.test.ts` (4 testes) e `inboundXmlParser.test.ts` (3 testes) passaram em execuções focadas separadas. A primeira tentativa através do script do ERP não resolveu `vitest/config` a partir do diretório mobile; o comando acima forneceu o caminho de módulos do ERP sem instalar dependências adicionais.

Ajuste de texto do estado sem resultados foi validado com screenshot no preview em viewport mobile (`375 × 929` CSS); não se aplicou teste unitário a essa mudança exclusivamente textual.

## Comparação visual capturada

- Lista principal: ERP e app mostram NF-e #133744, série 1, HORFRAN COMERCIAL ELETRO MOVEIS LTDA, emissão em 14/09/2026, 27 itens e R$ 5.967,88. Busca parcial `1337` retorna a mesma nota nos dois lados.
- ERP em viewport desktop usa cartão de uma coluna; app em viewport estreita usa cartão responsivo e controles compactos.
- Modal de período do app mostra as mesmas seis opções exibidas no seletor do ERP. Estado de intervalo personalizado foi conferido dos dois lados com agosto–setembro de 2026 e mesma nota encontrada.
- Busca sem resultado conferida nos dois previews. O título e subtítulo do app foram ajustados para coincidir com o ERP; screenshot após HMR confirmou o texto.
- Modal de importação: mesma finalidade e mesmos controles essenciais. Diferença de apresentação esperada por responsividade: tela cheia/fluxo vertical no app, diálogo centralizado com controles horizontais no ERP.
- Modal de detalhes capturado no app a 375 × 929 CSS: 27 itens, totais, fornecedor/destinatário, tributos e observações visíveis/roláveis; comparação visual correspondente com o ERP segue pendente.
- Capturas foram feitas nos previews localhost autenticados já abertos. O ERP foi temporariamente exibido a 390 × 844 e restaurado ao terminar. Nenhum arquivo foi selecionado; não houve escrita ou exclusão.

## Próxima etapa

Repetir a conferência no viewport M; depois percorrer detalhes, menu/remoção cancelável, busca vazia, período personalizado e estados alternativos de importação um por vez. Resolver diferenças funcionais/visuais observadas antes de encerrar.
