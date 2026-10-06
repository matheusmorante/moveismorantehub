# Auditoria de CFOP e matriz tributária interestadual

## Decisão

O CFOP descreve a operação. Ele não define sozinho CSOSN, ICMS, ST, DIFAL ou FCP. O catálogo semântico do ERP classifica CFOPs e permite mostrar candidatos compatíveis com o destino físico, mas somente uma regra server-side `APPROVED`, completa e sem conflito pode determinar os tributos e liberar a emissão.

Não há regra PR→SC aprovada no repositório. A [auditoria normativa de 06/10/2026](matriz-interestadual-pr-sc.md) revisou as dez famílias originais e expandiu o inventário de `api/nfe/interstateTaxMatrix.ts` para 24 combinações: **20 DRAFT e 4 BLOCKED**, com tratamento executável nulo. O servidor retorna `HML_INTERSTATE_MATRIX_NOT_APPROVED` e bloqueia antes da reserva de snapshot/número, assinatura e contato com a SEFAZ. Cadastrar `6102` ou `6108` no catálogo não muda esse bloqueio.

## Classificação de CFOP

| CFOP | Classificação semântica | Uso no modal | Estado da regra tributária |
| --- | --- | --- | --- |
| 5102 | Venda interna de mercadoria de terceiros | Opção habilitada somente no cenário HML interno já aprovado | A única regra habilitada deste fluxo é PR→PR, produto de terceiros sem ST |
| 6102 | Venda interestadual de mercadoria de terceiros | Candidato desabilitado em operação interestadual | DRAFT; não autoriza emissão |
| 6108 | Venda interestadual de mercadoria de terceiros para não contribuinte | Candidato condicional desabilitado; não deve ser usado para contribuinte | DRAFT; incidência e tratamento de ST dependem do cenário |
| 5403 | Venda interna de mercadoria de terceiros na condição de substituto tributário | Exibido conforme escopo e produto, desabilitado sem matriz aplicável | Sem regra aprovada neste fluxo |
| 6403 | Venda interestadual de mercadoria de terceiros na condição de substituto tributário | Candidato conforme escopo/ST, desabilitado | Sem regra aprovada neste fluxo |
| 6933 | Prestação de serviço sujeita ao ISSQN para fora do Estado | Apenas item de serviço; nunca venda de produto | Regra de serviço específica necessária |

O campo `active` do catálogo significa que o CFOP está classificado para consulta. Não significa que a operação fiscal esteja aprovada. CFOPs de mercadoria não são convertidos em CFOP de serviço, e os códigos `610x` nunca são aceitos como CFOP interno.

## Local físico que determina o escopo

- Entrega com endereço cadastral selecionado: usa a UF do endereço do cliente.
- Entrega com endereço personalizado (`useCustomerAddress=false`): usa exclusivamente o endereço de entrega personalizado. Se ele não tiver UF válida, o contexto fica indeterminado e bloqueia.
- Retirada: usa o estabelecimento emitente, exceto quando há `pickupAddress` explícito. A UF cadastral do cliente não transforma retirada em operação interestadual.
- A UF do emitente deve estar configurada; não há fallback para PR.
- Modelo 65 permanece restrito a operação interna. Modelo 55 é candidato estrutural para uma operação interestadual, condicionado à matriz tributária aprovada.

## Cenários PR→SC cadastrados como DRAFT

Escopo deste inventário inicial: ambiente HML (2), NF-e modelo 55, emitente PR/CRT 1 (Simples Nacional), venda de mercadoria de terceiros. Os rótulos CFOP abaixo são apenas candidatos para revisão.

| Destinatário | Consumidor final | Produto com ST | CFOP candidato para análise | CSOSN | ICMS | DIFAL | FCP |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PJ contribuinte | Não | Não | 6102 | Pendente | Pendente | Pendente | Pendente |
| PJ contribuinte | Não | Sim | Pendente conforme responsabilidade/protocolo | Pendente | Pendente | Pendente | Pendente |
| PJ contribuinte | Sim | Não | 6102 | Pendente | Pendente | Pendente | Pendente |
| PJ contribuinte | Sim | Sim | Pendente conforme responsabilidade/protocolo | Pendente | Pendente | Pendente | Pendente |
| PJ com IE isenta | Sim | Não | Pendente | Pendente | Pendente | Pendente | Pendente |
| PJ com IE isenta | Sim | Sim | Pendente | Pendente | Pendente | Pendente | Pendente |
| PJ não contribuinte | Sim | Não | 6108 candidato | Pendente | Pendente | Pendente | Pendente |
| PJ não contribuinte | Sim | Sim | 6108 candidato, sujeito a validação de ST | Pendente | Pendente | Pendente | Pendente |
| Pessoa física não contribuinte | Sim | Não | 6108 candidato | Pendente | Pendente | Pendente | Pendente |
| Pessoa física não contribuinte | Sim | Sim | 6108 candidato, sujeito a validação de ST | Pendente | Pendente | Pendente | Pendente |

Para aprovar qualquer linha ainda devem ser definidos, por cenário e produto, origem da mercadoria (código 0–8), NCM, CEST quando houver, natureza de terceiros/produção própria, condição explícita de ST, CSOSN, grupo e base/alíquotas de ICMS, papel de substituto/substituído e protocolo aplicável, incidência/responsável/base/alíquotas/partilha do DIFAL, incidência/base/alíquota/recolhimento de FCP, vigência e referências oficiais. Nenhuma incidência é tratada como `false` por falta de informação. CEST presente ou ausente, isoladamente, não determina ST.

### Referência normativa da revisão

- O [Portal Nacional da NF-e](https://www.nfe.fazenda.gov.br/portal/informe.aspx?AspxAutoDetectCookieSupport=1&ehctg=false) publica a tabela/classificação de CFOP; isso não fornece, por si só, a matriz tributária PR→SC.
- A [matriz normativa PR → SC](matriz-interestadual-pr-sc.md) contém fontes nacionais/PR/SC, vigência, análise das dez linhas originais, inventário completo, protocolos históricos descartados e motivos de não aprovação. Consultas de SP não fundamentam qualquer tratamento executável.
- A [FAQ da SEFA/PR sobre DIFAL](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/12) não resolve, sozinha, todas as hipóteses de saída PR→SC deste inventário.

## Garantias de execução

1. `resolveInterstateFiscalMatrix` ignora `DRAFT` para determinação de tributos e só considera `APPROVED` com critérios, tratamento, vigência e fonte completos.
2. Ausência de fatos necessários, regra ausente, regra incompleta ou empate entre regras termina em bloqueio; não há fallback silencioso.
3. A validação ocorre em `createHmlNormalSaleRuleSet`, chamado antes da RPC que prepara o snapshot fiscal numerado. A falha registra `numberReserved: false` e `sefazContacted: false`.
4. O modal apresenta os CFOPs semânticos do contexto, com 6102/6108 desabilitados enquanto não houver aprovação. PR→PR só habilita 5102 na regra atual.
5. Nenhuma transmissão foi iniciada durante esta alteração.

## Evidência a registrar na implementação

Executar os testes focados da matriz, política do modelo fiscal, serviço de validação do modal e regras HML. Os testes devem provar: cenário DRAFT bloqueado, resolução sintética apenas para verificar o seletor com uma regra APPROVED completa, conflito/incompletude bloqueando, retirada interna apesar da UF cadastral externa, endereço personalizado alterando o escopo, e nenhum número reservado no bloqueio interestadual.
