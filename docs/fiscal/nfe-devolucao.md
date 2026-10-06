# NF-e de devolução: regras do formulário e limites fiscais

## Escopo habilitado

O formulário de devolução usa uma política central definida em `shared-utils/fiscalOperationContext.ts` (`getFiscalFormRules`). A mesma política fornece valores fixos de XML; o cliente a usa para montar a revisão e as rotas `api/nfe/operation-drafts.ts` e `api/nfe/transmit-operation-draft.ts` a usam antes de salvar e transmitir.

O cenário atualmente habilitado é restrito: NF-e modelo 55 original válida e autorizada, mesmo pedido e ambiente, operação interna PR→PR, destinatário original consumidor final não contribuinte e retorno físico registrado como entregue à loja (`store_delivery`). O CFOP é determinado por item original. Nenhum cenário interestadual está habilitado.

O sistema não presume uma matriz tributária de devolução. Só permite preparar e transmitir quando as bases e os valores tributários da linha original e os totais ICMS relevantes são zero. Se houver tributação não zerada, a devolução permanece bloqueada até existir matriz fiscal aprovada e testada para esse cenário. A classificação original é mostrada sem edição; não se transforma isso em autorização para qualquer CST/CSOSN.

## Auditoria dos campos e controles

“Venda normal” abaixo descreve o modal de emissão de saída em `SalesOrder/OrderActions/nfe-modal`. “Devolução” descreve o fluxo fiscal iniciado na devolução comercial, usando o seletor de NF-e original e o modal de rascunho fiscal. Valores fiscais gerados, como a referência da origem, não são seleções do usuário.

| Campo / controle | Venda normal | Devolução | Visibilidade e opções na devolução | Editável? |
|---|---|---|---|---|
| Pedido / operação de origem | Pedido de venda aberto no modal de saída. | Pedido de devolução atendido, ligado à venda. O identificador fica fixo; itens/quantidades vêm das alocações fiscais. | Mostra o pedido vinculado e os itens alocados; não oferece outro pedido. | Não |
| NF-e de origem | Não há referência obrigatória a uma NF-e de saída anterior. | Seletor mostra somente documentos de saída autorizados que correspondem às alocações; chave, modelo, série, número e ambiente são conferidos no servidor. Ambiguidade sem correspondência de itens bloqueia a escolha. | A seleção é limitada às notas apresentadas pelo servidor. A nota original precisa ser modelo 55 e autorização válida. | Seleção entre origens elegíveis; metadados não editáveis |
| Ambiente fiscal | O usuário escolhe Homologação ou Produção antes de abrir o modal; Produção permanece desativada no seletor atual. | Herdado do documento original, exibido no modal e fixo no rascunho. Documento, rascunho e transmissão precisam continuar no mesmo ambiente. | Não oferece troca de ambiente. | Não |
| Modelo fiscal | Não há select no modal principal; é resolvido pelo contexto da venda/entrega entre os modelos suportados. | Apenas NF-e modelo 55. | Não mostra NFC-e 65 nem outro modelo. | Não |
| Finalidade fiscal | O modal normal mostra “Uso / consumo próprio” ou “Revenda”; isso alimenta a classificação da venda e não é uma seleção de finalidade fiscal de devolução. | `finNFe=4` fixo (devolução); `tpNF=0` fixo (entrada). | Não mostra Normal, Complementar ou Ajuste. | Não |
| Número, série e chave da nova nota | Número em prévia; a reserva válida é feita no servidor. Série vem da configuração fiscal. | Gerados pelo fluxo fiscal e pela sequência do ambiente da origem. O rascunho não aceita número, série ou chave digitados livremente. | Sem campo para escolher número/série/chave. | Não |
| Indicadores de destinatário/operação | Indicadores derivam do destinatário, modelo e operação comercial. | `idDest=1`, `indFinal=1`, `indIEDest=9` e `indPres=0`, somente no cenário interno aprovado. | Cenários interestaduais, destinatário contribuinte ou não final são bloqueados; não há seletor para substituí-los. | Não |
| Identificação do destinatário | CPF/CNPJ pode ser preenchido/editado; os demais dados são carregados do cadastro do cliente e sujeitos às validações da emissão normal. | Copiada do destinatário da NF-e original; a devolução não permite escolher outro CPF/CNPJ. | Exibida em somente leitura; inconsistências no documento de origem bloqueiam a preparação. | Não |
| Item / produto | Itens do pedido. Os dados fiscais podem ser expandidos para edição conforme as regras da emissão normal. | Somente itens e quantidades ligados às alocações aprovadas contra os itens faturados na NF-e original. | Produto, NCM, descrição, unidade, preço e quantidades de origem não podem ser substituídos por outro item. | Não; CFOP tem controle separado |
| CFOP por item | Busca por código/descrição e select de CFOP; o catálogo e o validador consideram o escopo da venda. Códigos incompatíveis com operação interestadual ficam bloqueados. | Select limitado aos CFOPs de devolução permitidos pela direção, cenário interno, origem da mercadoria e ST do item original. | 5102/6102 de venda não aparecem como opções de devolução; 6933 não é usado para venda de mercadoria. CFOP sem regra aprovada deixa o item bloqueado. Exemplos cobertos: 5102 sem ST→1202; 5101 sem ST→1201; 5405/ST de mercadoria de terceiros→1411. | Sim, somente entre opções do item; servidor valida novamente |
| NCM | Pesquisa/seleção de NCM no item da venda. | Preservado do XML do item original. | Sem catálogo ou edição livre. | Não |
| CST/CSOSN | Select da emissão normal apresenta as opções do regime no componente; a classificação final passa pelas validações fiscais da venda. | Não apresenta o catálogo indiscriminado. Usa a classificação original compatível e a exibe em somente leitura no único caso sem bases/valores tributários habilitado. | Qualquer base ou valor tributário diferente de zero bloqueia; não há escolha manual de CSOSN/CST para contornar a ausência da matriz. | Não |
| Origem da mercadoria / CEST | Selects disponíveis no painel fiscal do item normal; exigência de CEST depende do produto/regra aplicável. | Preservados do item fiscal original, sem edição. | O CFOP candidato também considera origem e ST. Combinações sem regra correspondente bloqueiam. | Não |
| Tributos do item | Revisáveis segundo o fluxo normal de emissão e suas regras. | XML fiscal derivado do item original e da quantidade devolvida; classificação aparece somente para leitura. | Apenas bases e valores zerados são aceitos hoje. ICMS/DIFAL/FCP, ST ou outro valor não são presumidos. | Não |
| Natureza da operação | Não há select de natureza no modal normal; é preenchida pela preparação fiscal de venda. | Uma única opção fixa: “Devolução de mercadoria”. | Select desabilitado com somente essa opção. “Venda de mercadoria” não é oferecida. | Não |
| Documento fiscal referenciado | Não há referência a uma origem anterior. | Referência automática à chave de acesso da NF-e original. | Não permite pesquisar nem escolher arbitrariamente outra chave. | Não |
| Item original referenciado | Não aplicável na venda original. | Cada item devolvido é vinculado ao `nItem` original conforme a alocação comercial/fiscal; o XML grava a referência de chave e item. | Referência automática; não há campo para digitar o número de item. | Não |
| Transporte | Modalidade depende de entrega/retirada, modelo e responsável: própria empresa, destinatário ou transportadora; identificação de terceiro só aparece quando aplicável. | Modalidade 9, sem transporte fiscal adicional, fixa no único método de retorno suportado. | Não copia a modalidade da venda original. Retorno por coleta fica bloqueado até haver regra aprovada de transporte para esse cenário. | Não |
| Pagamento fiscal | Aba mostra os pagamentos comerciais registrados no pedido e reconcilia valores; não oferece um novo select de meio de pagamento fiscal. | `tPag=90`, “Sem pagamento”, e `vPag=0,00`, fixos. | PIX, dinheiro, cartão, boleto e pagamentos da venda não aparecem como opções. | Não |
| Totais | Calculados/revisados no fluxo da nota de saída. | Totais comerciais são recalculados para os itens/quantidades da devolução. Totais tributários só são aceitos quando a condição de bases/valores zerados é satisfeita. | Exibição somente leitura; o usuário não altera os totais fiscais no rascunho de devolução. | Não |
| Observação fiscal | O modal de venda não expõe campo de observação fiscal livre. | `infCpl` gerada automaticamente informa a chave da NF-e e que itens/quantidades estão identificados por item. | Texto de devolução aparece somente nesse contexto e não pode ser editado. | Não |
| Justificativa de estorno | Não existe na venda normal. | Não aparece na devolução; pertence ao fluxo separado de estorno fiscal. | Oculta no modo de devolução. | Não aplicável |
| Confirmações de revisão | Confirmações e validações próprias da emissão normal. | Confirmação de classificação/valores tributários zerados e confirmação de totais/referências; em Produção, confirmação adicional de transmissão. | Só confirmações pertinentes ao rascunho; não habilitam cenário fiscal bloqueado. | Sim, confirmação explícita |

## Regra central e validação no servidor

`getFiscalFormRules(context, scenario)` informa campos visíveis, ocultos, somente leitura e obrigatórios; modelos, finalidades, CFOPs, pagamentos, transporte, natureza e valores fixos. `getFiscalFormXmlDefaults` gera os blocos fixos de natureza, pagamento e transporte a partir da mesma política.

O modal usa a configuração para exibir os controles e valores permitidos. As rotas de criação/revisão e transmissão recarregam o documento de origem, o pedido, as alocações e o ambiente; conferem modelo/finalidade, natureza, destinatário, pagamento, transporte, CFOP por item, produto, tributos e vínculos. Uma requisição direta com valor incompatível é rejeitada antes da reserva/transmissão. Uma tentativa SEFAZ já iniciada e incerta segue para reconciliação da mesma chave; não é retransmitida como nova nota.

A ação também depende da existência de NF-e de saída autorizada vinculada ao mesmo pedido. Tentativa, erro, rejeição, denegação, reserva ou número sem autorização não atendem a condição. Se não houver documento válido, a interface e o servidor bloqueiam com a mensagem: “Não é possível emitir NF-e de devolução porque este pedido não possui NF-e de saída autorizada.”

## Cenários ainda sem matriz aprovada

Não habilitar emissão interestadual PR→SC ou PR→qualquer outra UF. Antes de aprovar essa extensão, o responsável fiscal precisa definir, por cenário: PJ contribuinte; PJ não contribuinte; pessoa física/consumidor final não contribuinte; CSOSN/CST e demais grupos tributários; DIFAL/FCP; CFOP; origem; mercadoria com/sem ST; transporte; modelo; e referências de documento/item. Até lá, as opções não são expostas e o servidor bloqueia qualquer tentativa.

Também não estão habilitados retorno por coleta, destinatário contribuinte/não final, bases/valores tributários diferentes de zero e combinações de origem/ST sem CFOP catalogado. Criar a devolução comercial/logística e confirmar o retorno físico continua sendo um fluxo separado; a emissão fiscal não cria movimento de estoque, financeiro ou status comercial.

## Fontes fiscais consultadas

- [Portal Nacional NF-e — NT 2025.002-RTC](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=pD4YrecPV6s%3D): referência de item/documento e leiaute de NF-e; a aplicabilidade da versão vigente deve ser conferida antes de cada evolução do XML.
- [SEFA/PR — FAQ sobre devolução por não contribuinte](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/43): orientação estadual consultada para devoluções. O fluxo do produto também segue a política operacional registrada em `AGENTS.md`; antes de alterar o momento fiscal em relação ao retorno físico, revisar essa orientação com o responsável fiscal.
- [RICMS/PR — Decreto nº 7.871/2017](https://www.fazenda.pr.gov.br/sites/default/arquivos_restritos/files/documento/2020-06/106201707871.pdf).

Estas fontes dão contexto para revisão; não constituem aprovação da matriz tributária que ainda falta. Nenhuma transmissão SEFAZ foi executada nesta implementação.
