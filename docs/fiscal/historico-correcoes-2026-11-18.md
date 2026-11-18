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
