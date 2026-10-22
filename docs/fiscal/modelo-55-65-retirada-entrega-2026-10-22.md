# Guia para gerente e vendas: modelos 55 e 65, retirada e entrega

**Revisado em 22/10/2026.** Esta documentação descreve o caminho de emissão normal de venda varejista no Paraná presente no checkout. O PDF [guia para gerente e vendedores](../../output/pdf/guia-modelo-55-65-retirada-entrega.pdf) explica o mesmo assunto sem exigir conhecimento de programação.

## Limites da regra explicada

A política local `PR_RETAIL_2026_10` trata do modelo de documento para a venda normal varejista com emitente do Paraná e CRT 1. Ela não declara todas as operações fiscais do estado ou do país cobertas. Devolução, remessa, transferência, retorno, exportação e importação seguem documentos e matrizes próprias. Uma decisão que indique NF-e 55 também não fornece, sozinha, o tratamento de impostos necessário para aquela operação.

Para o caminho comum coberto, a NFC-e 65 pode ser selecionada em venda varejista a consumidor final dentro do Paraná quando não exista fator que conduza à NF-e 55, como revenda, destino interestadual, valor fiscal de R$ 200.000 ou mais, exigência de crédito ou outro requisito fiscal. Consumidor final pode ser pessoa física ou empresa; a finalidade da compra, e não o nome/tipo da pessoa isoladamente, faz a distinção relevante. A regra fiscal paranaense não reconhece NFC-e como documento que transfira crédito de ICMS.

O Ajuste SINIEF 11/25 que previa direcionar destinatários CNPJ à NF-e 55 foi revogado pelo Ajuste SINIEF 12/26. Não se deve apresentar o tipo de documento do comprador (CPF versus CNPJ) como regra universal para escolher o modelo. A situação de contribuinte do ICMS e uma exigência de crédito continuam a merecer verificação: os campos de pessoa e inscrição estadual podem pedir NF-e 55 ou impedir o uso de NFC-e no caminho comum.

## Decisão no emissor

### Finalidade e fatos do pedido

A abertura do modal de emissão não conserva a modalidade salva do pedido: a opção “Informar entrega?” começa como **Não** e reinicia como “Não” ao abrir o modal. A pessoa emissora deve marcar **Sim** se a mercadoria será entregue, e **Não** se o cliente fará a retirada registrada na loja. O botão descreve a nota que será preparada; alterná-lo não grava uma alteração logística no pedido.

A preparação utiliza uma cópia do pedido com essa modalidade fiscal para identificar local, UF, presença e requisitos de destinatário. O emissor confere os fatos e calcula a mesma decisão; o modelo escolhido no navegador não tem autoridade própria. O documento e os dados usados na nota passam por uma conferência final antes do envio. O pedido comercial persiste a modalidade que já estava registrada.

Na entrega, o escopo geográfico considera o endereço efetivo escolhido para a entrega. Na retirada, o escopo usa o endereço de retirada quando fornecido; caso contrário, assume o estabelecimento emitente. Isso significa que endereço residencial do cliente em outra UF, por si só, não muda a UF escolhida para uma retirada no estabelecimento. **Limite operacional:** se o cliente retirar fisicamente no Paraná e levar a mercadoria para outra UF como parte já combinada da venda, o endereço de retirada usado automaticamente não comprova o destino final. É preciso verificar a operação concreta e a matriz tributária com a gerência antes de usar o caminho de venda normal.

### Razões que apontam para a NF-e 55

| Fato confirmado | O que o emissor faz |
| --- | --- |
| Compra para revenda; destinatário não é consumidor final | Indica modelo 55. |
| Operação interestadual ou exportação | Indica 55; a venda interestadual continua bloqueada se não houver matriz fiscal aprovada para seu cenário. |
| Total fiscal igual ou superior a R$ 200.000 | Indica 55, inclusive exatamente no limite. |
| Devolução, transferência, remessa, retorno, importação, Administração Pública, crédito fiscal ou outra exigência | Indica ou exige regra própria de 55; não reutilizar a matriz tributária da venda normal sem aprovação. |
| Fato ausente, UF não confirmada ou operação ainda ambígua | Interrompe ou bloqueia a decisão; completar a informação em vez de presumir. |

### Retirada, entrega e transporte no fluxo habitual

A modalidade da mercadoria é distinta de quem contrata ou faz o transporte. O usuário informa a modalidade pelo controle da emissão. Para entrega habitual, o sistema pré-seleciona entrega pela própria empresa; a regra de transporte própria usa modalidade de frete 3. Quando houver entrega por terceiro, é possível informar o transportador real; o campo de quem contrata o frete separa conta do remetente (0), destinatário (1) ou terceiro (2). Uma entrega sem escolha de terceiro não inventa transportadora.

Sem entrega, a NFC-e 65 é emitida sem ocorrência de transporte (9). Uma retirada normal em NF-e 55 também usa 9. A função de regra interna conhece o caso de transporte próprio por conta do destinatário em NF-e 55 (4), mas o fluxo habitual na tela inicia sem entrega; a tela não permite escolher isoladamente “cliente transporta” nessa modalidade. Isso não deve ser apresentado ao vendedor como botão comum de retirada.

Para a NFC-e 65, há coerência obrigatória entre entrega em domicílio e transporte indicado. O emissor fixa a presença em entrega quando “Sim” está selecionado, preenche o frete próprio conforme a matriz e inclui o grupo de transporte sem dados fictícios de terceiro. A ausência de frete cobrado não muda o fato de que a mercadoria vai ser transportada pelo estabelecimento. O controle de entrega também não apaga valor de frete/taxa registrado na venda.

### Identificação do destinatário

Na NFC-e presencial abaixo de R$ 10.000, CPF/CNPJ pode ficar sem preenchimento, se o comprador não solicitar identificação. No valor de R$ 10.000 ou mais, é obrigatório. Em operação não presencial, incluindo entrega em domicílio, CPF/CNPJ e endereço do destinatário são obrigatórios em qualquer valor. Em NFC-e, o sistema oferece retirada presencial ou entrega não presencial como opções usuais.

Na venda normal doméstica com NF-e 55 a matriz do emissor exige documento de identificação e endereço do destinatário. Em operação fora do escopo da venda normal, verificar a matriz própria antes de presumir essa regra.

O documento de cliente não seleciona 55 por ser CNPJ; PF e PJ podem ser consumidor final. CPF/CNPJ deve estar válido e corresponder ao tipo de pessoa. Se o cadastro indicar contribuinte de ICMS, IE, ou cliente empresa solicitar crédito, chamar a gerência: NFC-e exige destinatário não contribuinte no caminho configurado.

## Cenários usados para ilustrar o guia

| Situação de balcão | Modelo/caminho indicado | Confirmar |
| --- | --- | --- |
| PF, R$ 569, retirada presencial no PR | 65; identificação pode ser opcional | Cliente não pediu CPF na nota. |
| PF, R$ 569, entrega no PR | 65 em venda compatível | CPF e endereço são exigidos mesmo abaixo de R$ 10 mil. |
| Empresa compra material para uso próprio no PR, venda compatível | 65 pode ser elegível | Dados fiscais e ausência de exigência de crédito/contribuinte. |
| Pessoa compra exatamente R$ 10.000 em retirada | 65 pode ser elegível | CPF/CNPJ é obrigatório no limite. |
| Consumidor compra R$ 200.000 na venda normal | 55 | É o limite inclusivo da política. |
| Compra para revenda | 55 | Finalidade “Revenda” e matriz fiscal da operação. |
| Entrega no PR para cliente domiciliado em SC | 65 pode ser elegível | O local físico desta entrega e a situação fiscal real do cliente. |
| Destino efetivo em SC, inclusive quando cliente retira | 55 esperado para interestadual | Gerência valida destino comprovável e matriz interestadual antes de emitir; valor não aprova tributação. |

## Fontes e limites desta conferência

Fontes normativas e públicas consultadas em 22/10/2026:

1. [Paraná: NPF 100/2014 sobre a NFC-e, itens 1.2 e 1.3](https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/103201400100.pdf).
2. [CONFAZ: Ajuste SINIEF 19/16, cláusula quarta, redação vigente e histórico das alterações](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2016/AJ_019_16); [Ajuste SINIEF 09/26, identificação/endereço em operações não presenciais](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2026/AJ009_26); [Ajuste SINIEF 12/26, revogação da proibição introduzida pelo Ajuste 11/25](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2026/AJ012_26).
3. [CONFAZ: MOC 7, Anexo I, grupos de identificação do local e regras de validação do transporte](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf).
4. Documentação do MoranteHub consultada: `docs/fiscal/README.md`, `invariantes-arquiteturais.md`, `historico-correcoes-2026-10-14.md`, `revisao-fluxos-saida-2026-10-13.md`, `historico-correcoes-2026-10-22.md` e `decisao-modelo-varejo-pr.md`.

Implementação focal conferida: `shared-utils/fiscalDocumentModel.ts` e `shared-utils/fiscalTransportModel.ts`; `shared-utils/fiscal-cfop-model/scope.ts`; `erp/src/pages/App/SalesOrder/OrderActions/NfeEmissionModal.tsx` e `NfeTransportSection.tsx`; `api/nfe/normalSaleRuleSet.ts`, `fiscalCore.ts`, `normal-sale/interstateValidation.ts` e `fiscalXmlSerializer.ts`. O foco dessa revisão é leitura local do fluxo normal de emissão, não uma declaração de cobertura tributária geral, resultado de emissão remota ou de implantação da versão atual.

Para caracterizar a cobertura automatizada durante esta produção, foram rodados cinco conjuntos Vitest já existentes ligados à decisão de modelo, geografia, transporte, montagem do documento e preparação da venda normal: **119 passaram e 2 falharam**. Ambas as falhas se referem ao texto `derivedReason` esperado em dois cenários da matriz de transporte; a regra atual devolve outra descrição. As falhas não foram alteradas no escopo documental e também não são tratadas como prova de rejeição ou autorização pela SEFAZ. Nenhuma transmissão fiscal foi realizada para criar este PDF.
