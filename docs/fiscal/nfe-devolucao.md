# NF-e de devolução: regras do formulário, transporte e limites de suporte

## Escopo implementado

O formulário e as validações usam a política central `getFiscalFormRules(operationContext)` em `shared-utils/fiscalOperationContext.ts`. O backend recompõe o contexto a partir do pedido de devolução, da NF-e original, das configurações fiscais do estabelecimento e das alocações de itens. Valores informados pelo navegador não são autoridade para método de retorno, destinatário, pagamento, CFOP, tributos ou transporte.

O pedido persiste hoje `store_delivery` (cliente já levou a mercadoria à loja) ou `store_collection` (coleta própria da empresa). O backend normaliza esses valores para `CLIENT_DELIVERED` e `COMPANY_PICKUP` no contexto fiscal. O método não é pedido novamente no modal. Se ele não estiver persistido, a emissão fica bloqueada como `UNSUPPORTED_BY_ERP`; o status `fulfilled` não é usado para inventá-lo.

O escopo atualmente emitível continua limitado a NF-e modelo 55, com NF-e de saída original autorizada, mesmo pedido e ambiente, retorno físico concluído, destinatário original não contribuinte e consumidor final, operação interna, e dados tributários de origem sem bases/valores não zerados. Isso descreve a capacidade atual do ERP; não declara proibições gerais da SEFAZ ou da legislação.

## Categorias usadas

| Categoria | Significado |
|---|---|
| `SEFAZ_REQUIRED` | Campo ou combinação exigidos por schema/regra objetiva de validação vigente. |
| `FISCAL_RULE` | Consequência da natureza da operação ou regra tributária aplicável. |
| `PROJECT_POLICY` | Decisão explícita do fluxo deste ERP. |
| `UNSUPPORTED_BY_ERP` | Cenário possível em tese, mas sem implementação segura neste produto. |
| `TEMPORARY_BLOCK` | Bloqueio até aprovação da matriz, atualização de catálogo ou evidência/teste exigido. |

`UNSUPPORTED_BY_ERP` e `TEMPORARY_BLOCK` nunca significam que a operação seja fiscalmente proibida.

## Matriz de regras e capacidade

| Regra/cenário | Status | Origem | Motivo | Implementado? |
|---|---|---|---|---|
| `finNFe=4` e CFOP classificado como devolução por item | `SEFAZ_REQUIRED` | MOC/Anexo I, regra 327 | A validação 327 só aceita CFOP de devolução em documento com finalidade de devolução. | Sim; finalidade fixa e CFOP filtrado por tipo, escopo, origem e ST. |
| CFOP interno/interestadual da devolução | `SEFAZ_REQUIRED` + `FISCAL_RULE` | Tabela oficial CFOP e operação de origem | Escopo vem das UFs e da NF-e original; entrada interna usa a família `1xxx`, interestadual a `2xxx`. | Parcial; opções saem do catálogo semântico do ERP. Ausência de correspondência bloqueia sem escolher CFOP genérico. |
| Sincronização do catálogo local com a Tabela CFOP oficial vigente | `TEMPORARY_BLOCK` | Projeto | O catálogo é versionado no código e não é importado/atualizado automaticamente pelo Portal Nacional. A publicação oficial consultada é de 04/09/2026. | Parcial; manter revisão do catálogo e bloquear códigos sem classificação. |
| Método `CLIENT_DELIVERED` | `PROJECT_POLICY` | Pedido de devolução e códigos oficiais de modalidade | O pedido indica que o cliente trouxe a mercadoria. O ERP interpreta o cliente, que é o destinatário no documento de entrada, como responsável por transporte próprio: `modFrete=4`. | Sim, valor fixo e validado novamente no servidor. Se houve transportador contratado/terceiro, o pedido atual não descreve esse fato; esse cenário não deve usar esta regra. |
| Método `COMPANY_PICKUP` | `PROJECT_POLICY` | Pedido de devolução e códigos oficiais de modalidade | O pedido indica coleta própria da empresa emitente: `modFrete=3`. | Sim, valor fixo e validado novamente no servidor. Coleta por transportador contratado não está coberta pelo método atual. |
| `modFrete=9` | `FISCAL_RULE` | MOC/Notas Técnicas | Significa sem ocorrência de transporte. Não é padrão de devolução e não é usado para nenhum dos dois métodos persistidos acima, pois ambos descrevem deslocamento físico. | Sim; payload `9` diverge do contexto e é rejeitado antes da reserva de número. |
| Transportador terceiro, veículos e dados adicionais de transporte | `UNSUPPORTED_BY_ERP` | Projeto | O pedido atual não persiste contratação de transportador nem dados suficientes para distinguir esse caso de transporte próprio. | Não; não oferecer seleção fiscal livre no modal. |
| Devolução interestadual | `TEMPORARY_BLOCK` | Projeto | Devolução interestadual é uma operação possível. A transmissão fica bloqueada até matriz por cenário tributário e validação de origem, contribuinte/consumidor, ST e destino. | Parcial; o domínio resolve o escopo e filtra CFOP de entrada compatível (ex.: venda original `6102` → opção de devolução `2202`), mas o servidor não permite preparar/transmitir sem a matriz aprovada. |
| Bases ou valores tributários originais diferentes de zero | `UNSUPPORTED_BY_ERP` | Projeto, pendente de matriz fiscal | Uma devolução pode precisar refletir tributos da operação original. O ERP ainda não aprovou a reprodução por regime, ICMS, ST, IPI, FCP, IBS/CBS, IS e cenário. | Bloqueado. O backend examina os grupos tributários por item e os grupos de totais; não troca bases, alíquotas ou valores por zero para fazer a nota passar. |
| Destinatário contribuinte ou não consumidor final | `UNSUPPORTED_BY_ERP` | Projeto, pendente de matriz fiscal | O fluxo aprovado do ERP cobre somente destinatário não contribuinte e consumidor final. | Não; backend rejeita antes da reserva. |
| Pagamento `tPag=90` e `vPag=0` | `PROJECT_POLICY` | Domínio do ERP, compatível com as validações de pagamento | A NF-e de devolução deste fluxo não representa pagamento/reembolso. A validação 904 rejeita `tPag=90` com `vPag` diferente de zero; a regra 865 também contém exceções para `finNFe=4` e `tPag=90`. | Sim; fixo no modal e validado antes da transmissão. Reembolso permanece no pedido/comercial. |
| Modelo 55 | `PROJECT_POLICY` | Escopo do produto | O ERP implementa devolução pela NF-e modelo 55 neste fluxo. Isso não é uma conclusão geral de que toda devolução deva usar exclusivamente modelo 55. | Sim; modelo 65 não aparece nem é aceito pela API. |
| Referência e vínculo à NF-e original | `FISCAL_RULE` + `PROJECT_POLICY` | Leiaute/regra vigente e integridade do fluxo | O original deve estar autorizado, ser de saída, corresponder ao pedido e ambiente e sustentar itens/quantidades devolvidos. Não se aceita chave livre nem escolha arbitrária quando houver ambiguidade. | Sim; chave, autorização, protocolo, CNPJ, ambiente, modelo, itens, alocações e saldo já devolvido são revalidados no servidor. |
| Retorno físico antes da emissão fiscal | `PROJECT_POLICY` | Regra operacional documentada do ERP | Criar a devolução não prova que a mercadoria retornou. A coleta deve ser confirmada como Coletada; entrega à loja, como Recebida. | Sim; a API exige devolução atendida e não gera movimento comercial, estoque ou financeiro. |

## Contexto logístico e `modFrete`

O contexto usado pelo formulário contém a operação, finalidade, modelo, UF do emitente, UF do destinatário original, escopo, regime tributário, condição fiscal do destinatário, método persistido, modalidade resolvida e referência da NF-e original. O cliente envia revisões; o servidor recarrega esses fatos e rejeita divergências antes de reservar número e antes da transmissão.

| Método persistido | Movimento registrado | Modalidade resolvida | Dados adicionais atuais | Situação |
|---|---|---|---|---|
| `store_delivery` → `CLIENT_DELIVERED` | Cliente trouxe a mercadoria ao estabelecimento; o retorno físico já foi concluído. | `4` — transporte próprio por conta do destinatário, sob a semântica operacional do pedido. | Sem transportador terceiro/veículo informado pelo pedido. Se a realidade diferir, a regra não cobre o caso. | Suportado no cenário interno aprovado; transmissão continua sujeita à matriz tributária. |
| `store_collection` → `COMPANY_PICKUP` | A empresa fez a coleta no endereço do cliente; retorno físico confirmado. | `3` — transporte próprio por conta do emitente. | Sem transportador terceiro/veículo informado pelo pedido. | Suportado no cenário interno aprovado; transmissão continua sujeita à matriz tributária. |
| método ausente/desconhecido | Movimento não demonstrado pelo registro fiscal. | Nenhum valor presumido. | O status `fulfilled` sozinho não determina quem transportou. | Bloqueado como `UNSUPPORTED_BY_ERP`. |
| transportador terceiro | Movimento pode ter ocorrido, mas o pedido não registra contratante/transportador. | `0`, `1` ou `2` não são escolhidos automaticamente. | O modal não cria um segundo campo logístico independente. | Bloqueado até o dado ser registrado e validado na origem. |

Os códigos `3` e `4` seguem as definições oficiais “transporte próprio por conta do remetente” e “transporte próprio por conta do destinatário”. A NT 2021.004 também valida que, quando CPF/CNPJ do transportador é informado, ele corresponda ao emitente no modo 3 ou ao destinatário no modo 4; a regra citada não se aplica quando esse documento não é informado. A aplicação desses papéis a cada método é uma regra do produto baseada nos atores registrados no pedido. `9` só é apropriado quando realmente não há ocorrência de transporte; não equivale a “devolução”.

## Auditoria dos campos e controles

“Venda normal” descreve o modal de emissão de saída. “Devolução” descreve a preparação fiscal depois do retorno físico confirmado.

| Campo/controle | Venda normal | Devolução | Regra na devolução | Editável? |
|---|---|---|---|---|
| Pedido/operação de origem | Pedido de venda. | Pedido de devolução vinculado à venda. | ID, venda de origem e itens/quantidades alocados são carregados do servidor. | Não |
| NF-e original | Não é referência necessária à venda inicial. | Documento de saída original autorizado. | Chave, modelo, série, número, ambiente, protocolo, itens e vínculo são verificados no servidor. Ambiguidade bloqueia. | Não selecionar chave livre |
| Ambiente | Escolhido pelo fluxo normal e sujeito às permissões do ambiente. | Herdado da NF-e original. | Documento, rascunho e transmissão devem usar o mesmo ambiente. | Não |
| Modelo | Resolvido pelo fluxo de saída. | Modelo 55 no escopo atual. | Modelo 65 não é opção do fluxo. | Não |
| Finalidade/tipo da operação | Finalidade e tipo aplicáveis à venda. | `finNFe=4`, `tpNF=0`. | Fixos; Normal, Complementar e Ajuste não são oferecidos. | Não |
| UF e indicadores de destino | Derivados do emitente/destinatário e da operação. | UFs são lidas do documento original e da configuração fiscal. | `idDest` acompanha o escopo; interestadual permanece bloqueado por matriz pendente. | Não |
| Destinatário | Carregado/editável conforme regra da venda. | Copiado do destinatário da NF-e original. | Sem troca de CPF/CNPJ ou endereço no rascunho. | Não |
| Itens e quantidades | Vêm do pedido de venda. | Vinculados ao `nItem` original por alocação aprovada. | Sem substituição do produto; limite devolvível e devoluções anteriores revalidados. | Não |
| CFOP por item | Opções da venda normal. | CFOP com `operationType=customer_return`, direção de entrada, escopo e atributos do item original. | Catálogo filtra por UF, origem de mercadoria e ST. `6933` de serviço não entra para mercadoria. | Somente dentro das opções; servidor confere novamente |
| NCM/origem/CEST/classificação | Campos da emissão normal conforme cadastro e cenário. | Derivados do XML fiscal original e somente leitura. | Não há escolha de CST/CSOSN independente para contornar a matriz. | Não |
| Tributos do item/totais | Revisados pela matriz de saída. | Recalculados proporcionalmente para itens/quantidades quando o cenário suportado tem valores zerados. | Qualquer base/valor original não zerado bloqueia; nenhum imposto é zerado silenciosamente. | Não |
| Natureza da operação | Definida pelo fluxo de venda. | “Devolução de mercadoria”, fixa. | Não oferece “Venda de mercadoria”. | Não |
| Transporte | Depende da venda original. | Vem do método persistido no pedido: modo 4 ou 3. | Não copia a modalidade da venda original; não há select independente no modal. | Não |
| Pagamento fiscal | Apresenta o tratamento fiscal dos pagamentos da venda. | `tPag=90`, `vPag=0,00`. | PIX, dinheiro, cartão, boleto e reembolso não são opções deste documento. | Não |
| Observações/referência de item | Texto conforme emissão normal. | Referência da chave e dos itens originais gerada pelo fluxo. | Sem edição de chave/item de origem. | Não |
| Confirmações | Confirmações da emissão normal. | Confirmação da revisão e, em Produção, da transmissão. | Confirmações não liberam cenário sem matriz ou divergente do pedido. | Sim, confirmações explícitas |

## Validações do servidor

Antes de preparar ou salvar revisão, o backend recarrega o pedido, método logístico, NF-e original, ambiente, autorização, alocações e itens. Antes de reservar número ou transmitir, recompõe o mesmo `operationContext`, determina novamente a modalidade, natureza, pagamento, destinatário e opções de CFOP e compara com a revisão persistida. Payload direto com outra modalidade, chave, destinatário, item, pagamento, CFOP ou tributo é rejeitado.

Uma tentativa de transmissão incerta continua no fluxo idempotente de reconciliação da mesma chave; não se cria outra nota automaticamente. Nenhuma emissão real foi executada nesta revisão.

## Fontes fiscais consultadas

- [Portal Nacional NF-e — MOC 7.0, Anexo I e regras de validação](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J+I+v4eN00E%3D) — finalidade de devolução/CFOP e leiaute.
- [Portal Nacional NF-e — NT 2018.005](https://www.nfe.fazenda.gov.br/PORTal/exibirArquivo.aspx?conteudo=vZguLua3oPM%3D) — modalidades `0`, `1`, `2`, `3`, `4` e `9`.
- [Portal Nacional NF-e — NT 2021.004](https://www.nfe.fazenda.gov.br/PORTal/exibirArquivo.aspx?conteudo=mCodklBEULU%3D) — regra para transporte próprio por conta do emitente em NF-e de entrada.
- [Portal Nacional NF-e — NT 2020.004](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=trSXReoZPuY%3D) — validações de pagamento 865 e 904.
- [Portal Nacional NF-e — documentos diversos e Tabela CFOP vigente](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=%2FNJarYc9nus%3D) — publicação consultada em 04/09/2026.
- [SEFA/PR — FAQ sobre devolução por não contribuinte](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/43).
- [RICMS/PR — Decreto nº 7.871/2017](https://www.fazenda.pr.gov.br/sites/default/arquivos_restritos/files/documento/2020-06/106201707871.pdf).

As fontes sustentam a semântica dos campos e validações citadas; a política do ERP e a matriz tributária continuam sendo responsabilidade do sistema e de aprovação fiscal. A existência de CFOP no catálogo, isoladamente, não aprova uma combinação tributária.
