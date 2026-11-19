# Histórico de correções fiscais — 18/11/2026

## CFOP interestadual visível e editável para revisão sem liberar emissão

### Problema observado

Na emissão de NF-e para outra UF, o CFOP do item aparecia em branco e as opções interestaduais ficavam desativadas. O CFOP existente também podia ser apagado ao abrir a seção de itens.

### Causa raiz comprovada

`resolveNfeItemCfopOptions` não encontra uma regra `APPROVED` para as rotas interestaduais vigentes. Por isso, retorna CFOP padrão vazio e as opções recebem conflitos da matriz como motivo de desativação. `NfeItemsSection` copiava esse padrão vazio para o item sem preservar uma seleção existente, enquanto `NfeItemRow` ocultava qualquer valor cuja opção estivesse desativada. Além disso, os campos fiscais avançados começavam recolhidos.

### Arquivos e linhas alterados

- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeItemsSection.tsx:4-8,166-250,277-283,307-314`: mantém a resolução fiscal original; transforma apenas candidatos estruturalmente compatíveis em editáveis para revisão; sugere 6102 para mercadoria de terceiros e 6108 quando o destinatário é não contribuinte; preserva seleções ainda válidas, expande os campos fiscais em operação interestadual e informa que a emissão continua bloqueada.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeItemRow.tsx:19-39,89-90,275-282,331-332`: abre os campos fiscais avançados para operação interestadual e identifica candidatos editáveis como opções para revisão, sem apresentá-los como aprovados.
- `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/domain/itemFiscalCfopOptions.ts:32`: acrescenta ao tipo de opção o indicador de revisão, sem mudar o resultado da matriz.
- `docs/fiscal/auditoria-cfop-nfe-nfce.md:18-19,64`: atualiza a descrição do seletor para refletir o comportamento de revisão e a trava de emissão.
- `docs/fiscal/matriz-saida-interestadual.md:78`: esclarece que o CFOP sugerido na tela é apenas candidato para revisão, condicionado à origem e ao destinatário.
- `docs/fiscal/README.md:3,8`: atualiza a data de reconciliação e adiciona este registro às referências atuais.

### Trava fiscal preservada

Não foi alterada a validação server-side em `api/nfe/normal-sale/interstateValidation.ts`. Como não há rota interestadual `APPROVED`, a NF-e continua bloqueada antes da reserva de numeração ou contato com a SEFAZ. A edição de 6102/6108 no formulário serve para revisão do candidato e não aprova CSOSN, ICMS, ST, DIFAL ou FCP.

A seleção padrão considera o tipo de mercadoria e o destinatário: 6102 classifica a venda interestadual de mercadoria de terceiros; 6108 é o candidato de venda desse tipo destinada a não contribuinte. A tabela oficial do CONFAZ descreve essas classificações em [6102](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24) e [6108](https://www.confaz.fazenda.gov.br/legislacao/ajustes/sinief/cfop_cvsn_1-6.24). A classificação do CFOP não define, por si só, o tratamento tributário.

### Validação

- Revisão estática do fluxo do modal e do bloqueio server-side; `git diff --check` executado.
- Testes automatizados e transmissão fiscal não foram executados nesta alteração.
- O aplicativo móvel não contém o modal de emissão normal de NF-e; o caminho afetado é exclusivo do ERP.

## Remoção do vínculo manual de serviço com produto

### Problema observado

O formulário de venda/orçamento permitia escolher manualmente produtos da venda para vincular a uma linha de serviço. O operador pediu a remoção desse campo e do fluxo de seleção correspondente.

### Causa raiz comprovada

O seletor era montado em `BodyRow` como uma lista de caixas de seleção e enviado ao pedido por `linkedProductOrderItemIds`/`linkedProductOrderItemId`. O mesmo controle era passado aos layouts desktop e mobile e aparecia no editor modal de itens do orçamento. A composição fiscal atual consome esses metadados: serviços sem vínculo válido permanecem pendentes e `xmlItemsBlock` bloqueia a preparação do XML. A auditoria de domínio ainda marca como **REQUER VALIDAÇÃO DO RESPONSÁVEL FISCAL** a decisão sobre quando serviço/montagem compõe mercadoria ou requer tratamento/documento próprio.

### Arquivos e linhas alterados

- `erp/src/pages/App/SalesOrder/ItemsTable/Body.tsx:273-307`: deixa de montar e repassar a lista de linhas de produto às linhas do formulário.
- `erp/src/pages/App/SalesOrder/ItemsTable/BodyRow.tsx:16,43,132-191`: remove a prop `productItems`, a lista de seleção, a atualização de vínculos e o nó visual compartilhado.
- `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowDesktop.tsx:50,226`: remove o vínculo visual do layout desktop.
- `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowMobile.tsx:55,93,251-261`: remove a prop e o seletor dos layouts mobile e do editor modal; observação fica independente do vínculo.
- `erp/src/pages/App/SalesOrder/__tests__/itemsTableTabs.test.tsx:163-192`: substitui a cobertura de seleção manual por regressão que confirma ausência do controle e preservação do metadado antigo no item.
- `erp/src/pages/App/SalesOrder/__tests__/salesOrderItemHandlingOptions.test.tsx:57-304`: remove as props obsoletas dos cenários que renderizam as linhas desktop/mobile.
- `docs/fiscal/README.md:9`: inclui esta correção nas referências vigentes.

### Comportamento fiscal preservado

Esta alteração remove apenas o controle comercial. Ela não apaga campos de vínculos já persistidos, não reescreve snapshots de pedidos/notas existentes e não modifica o cálculo fiscal. O seletor manual não existe no caminho mobile nativo, então não houve alteração nesse cliente. Como a regra fiscal para serviços/montagem segue pendente de validação, uma nova linha de serviço sem vínculo válido continuará bloqueada na preparação da NF-e; não foi criada uma regra presumida para permitir emissão ou alterar `vOutro`/`vProd`.

### Validação

- Comando: `npm run test:unit -- src/pages/App/SalesOrder/__tests__/itemsTableTabs.test.tsx src/pages/App/SalesOrder/__tests__/salesOrderItemHandlingOptions.test.tsx src/pages/utils/nfe/__tests__/serviceFiscalComposition.test.ts` (executado em `erp`). Resultado: 9 aprovações em `serviceFiscalComposition.test.ts`, 7 em `salesOrderItemHandlingOptions.test.tsx`; em `itemsTableTabs.test.tsx`, a nova regressão passou e 4 outras expectativas falharam: contador “3 itens”, ordem de itens, expansão de serviço e campo de descrição de produto.
- `git diff --check` executado sem erros; o Git reportou apenas avisos de conversão de finais de linha em arquivos já modificados.
- Busca estática confirmou que não há seletor de vínculo de serviço em `mobile/src` e que o texto do controle só permanece na asserção negativa do teste.
