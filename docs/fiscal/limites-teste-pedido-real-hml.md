# Limites de emissão com pedidos reais em homologação

Estratégia definida pelo usuário em 30/09/2026: interromper a criação de pedidos e dados comerciais fictícios; validar o fluxo normal com pedidos reais existentes, exclusivamente na SEFAZ-PR de homologação. Testes automatizados com fixtures/mocks continuam preservados, mas não comprovam autorização real.

## Primeiro pedido

- NF-e modelo 55, `tpAmb=2`, venda interna no Paraná, emitente CRT 1 conforme cadastro.
- Um item físico cadastrado e sua variação original, uma forma de pagamento identificada e valores reconciliados. O pedido escolhido inclui seu frete verdadeiro, sem alterar valores comerciais. Sem desconto, serviço, devolução, ST, DIFAL ou outra operação especial nesta primeira etapa.
- Destinatário e endereço fiscal reais e completos no cadastro disponível. Não inventar CPF/CNPJ, CEP, inscrição estadual ou dados ausentes para viabilizar a emissão.
- NCM, CFOP, origem, PIS, COFINS e demais tributos vêm dos dados/regras existentes. CSOSN 103 é apenas o padrão HML quando não há exceção ou seleção explícita. Código/grupo sem suporte bloqueia a transmissão.
- Nenhum teto monetário artificial: o limite é o total verdadeiro do pedido escolhido. Não reduzir quantidade/preço nem remover itens do pedido para caber no cenário.
- Uma autorização por pedido/modelo/ambiente. Retry usa a mesma tentativa, número, chave e XML; resposta incerta exige consulta antes de retransmitir.

## Dados e efeitos permitidos

- Leitura do pedido/cadastros originais; gravação do snapshot fiscal imutável, reserva na sequência HML e documento fiscal identificado como homologação.
- XML, chave, protocolo, rejeições, histórico de tentativas e item fiscal autorizado armazenados em ambiente 2. Produção permanece bloqueada no backend.
- Pedido comercial, quantidades, estoque, reservas, pagamentos, financeiro, contas a receber e indicadores operacionais não podem ser alterados pela emissão HML.
- Registrar e comparar a revisão/hash do pedido e os vínculos operacionais antes/depois. Não exigir ausência de movimentos anteriores de uma venda verdadeira; verificar que a emissão não criou ou modificou movimentos.
- Se o pedido sofrer alteração legítima concorrente durante a validação, interromper a atribuição de evidência ao teste e reconciliar a diferença. Não desfazer movimentações operacionais para obter um relatório sem diferenças.
- Falha ao salvar autorização não autoriza novo número: preservar XML/tentativa e reconciliar pela chave original. Não apagar fatos fiscais confirmados.

## Expansão depois da primeira autorização

Selecionar pedidos distintos existentes: múltiplos produtos; desconto; frete; diferentes pagamentos. Validar somente as combinações cobertas pelo fluxo atual e respeitar as exceções fiscais. Serviços seguem a composição fiscal existente quando aplicável; não implementar novas espécies de documentos/operações para ampliar o teste.

## Auditoria inicial e candidatos (histórico anterior ao fluxo normal)

- Carregamento das rotas fiscais corrigido; `dpl_ByPmV8BipMCvJW8TKGMt1hh34gpx` passou na inicialização remota Node 24 e nas verificações autenticadas de endpoints.
- Pedido **3012**, ID `9f2a2597-146f-4bbd-8d36-23b91f62e2d2`, é candidato comercial: atendido, um item, quantidade 1, R$ 120,00, sem desconto/frete, pagamento de R$ 120,00 em cartão. Não foi transmitido nem alterado.
- Pedido 3012 contém NCM no produto, mas seu snapshot de cliente não traz CPF/CNPJ nem endereço fiscal estruturado. O cadastro real precisa ser localizado/validado antes de considerar o pedido elegível. O candidato 3182 apresenta a mesma ausência no snapshot. Não preencher esses dados com valores fictícios.
- Releitura do cadastro original `people`: ambos os clientes foram localizados, mas não há CPF/CNPJ preenchido nem CEP em formato fiscal verificável. Uma consulta de candidatos com os critérios simples e esses dados completos não retornou pedido elegível. Nenhum pedido real foi alterado ou transmitido. Indicação de outro pedido/correção com dados reais é necessária antes de usar esses candidatos.
- Consulta agregada, sem dados pessoais: três pedidos atendem aos critérios comerciais simples e possuem NCM; nenhum dos três tem CPF/CNPJ preenchido no cadastro original do destinatário. Portanto a identificação fiscal é uma pendência comprovada, independentemente do formato do endereço.
- O backend/RPC de transmissão atualmente implementado usa `HML_TECHNICAL_V1`, exige pedido `TEST_AUT_*`, rascunho excluído e pagamento técnico. Portanto não atende ainda à estratégia de pedido real. Não marcar pedido real como sintético nem relaxar esse predicado como atalho: adaptar o fluxo normal, reaproveitando snapshot, leases, serializer e persistência atômica, mantendo ambiente 2 obrigatório.
- Uma tentativa sintética anterior à mudança de estratégia foi bloqueada antes da reserva e do SOAP por configuração A1/responsável técnico/CSRT. Nenhuma autorização SEFAZ foi obtida. Essa massa não será reutilizada para comprovar o fluxo com pedidos reais.
- `scripts/testing/nfe-hml-live.cjs` deixou de criar pedidos fictícios e passou a exigir o ID de uma venda real existente. Compara hashes/conteúdo dos registros comerciais e vínculos de estoque/financeiro antes/depois, respeitando movimentos anteriores. A versão atual do backend ainda bloqueará essa venda pela restrição técnica; o script não torna a emissão real disponível por si só.

## Critério de conclusão

Resposta real de autorização da SEFAZ-PR em homologação, XML assinado válido, chave e protocolo correspondentes persistidos, item fiscal gravado, recuperação idempotente do mesmo resultado e evidência de ausência de efeitos comerciais novos. Passar em testes/endpoint/XSD sem autorização real não conclui a validação. Produção permanece pendente de sua matriz fiscal e liberação própria.

## Estado atual em 30/09/2026

- Pedido escolhido: **3474**, ID `dc0641a1-f554-4769-a864-314c46a80f2e`: um produto existente, quantidade 1, R$ 349,00, frete R$ 30,00, cartão de crédito R$ 379,00. Nenhum valor foi inventado ou modificado. A elegibilidade completa ainda depende do preflight fiscal.
- O fluxo `HML_NORMAL_SALE_V1` reaproveita snapshot, assinatura, validação XSD, transporte, leases e persistência fiscal, com ambiente 2 obrigatório. A migração remota `20260930201939_nfe_modal_selections_and_real_order_hml` corresponde às migrations locais 1438/1439.
- A publicação `dpl_EbhuwDff7QDzaDj9pvh7Ky9au5Vh` está pronta e inclui o bloqueio de exceções CFOP/alíquotas. As funções fiscais carregam e os endpoints autenticados executam suas validações. Isso comprova inicialização, não autorização da SEFAZ.
- Playwright autenticado abriu o modal pelo fluxo normal do pedido 3474 e confirmou a identificação de homologação. Não acionou transmissão.
- O readiness anterior identificou **`responsibleTechnician.csrtId`** inválido. A usuária apresentou a confirmação do token ativo de homologação com ID 2 e vínculo com o sistema MoranteHub. Foi configurado `NFE_ID_CSRT_HOMOLOGACAO=02`, preservando o segredo existente. A nova publicação retorna `configurationIssues: []`. A API de configuração não retorna o conteúdo de variáveis sensíveis; ausência de valor legível nessa consulta não comprova que estejam vazias. Não usar o CSRT de produção.
- Playwright acionou a emissão do pedido 3474 pelo modal. Os cinco campos conferem entre formulário, payload, snapshot imutável e XML assinado persistido. O transporte retornou `HML_TRANSMISSION_UNCERTAIN`; não existe autorização comprovada.
- Documento fiscal `a9c29dd4-be12-46c2-9a8b-3effd1852b09`, requisição `a682418b-2a7b-4b74-aa62-1fd75f048bbd`, série 900, número 700, ambiente 2, status pendente, sem protocolo. O XML utiliza `ICMSSN102`, CSOSN 103 e origem 0.
- A consulta da mesma chave retornou `HML_RECONCILIATION_REQUIRED`, mantendo a retransmissão bloqueada. Não gerar outro número nem apagar essa tentativa.
- Hashes/conteúdo de pedido, itens comerciais, pagamentos, movimentos de estoque, contas a receber e transações financeiras permaneceram iguais antes/depois da tentativa e da consulta. Isso comprova a ausência de alterações nesses vínculos observados; a autorização/protocolo e os pedidos mais complexos permanecem pendentes.
- Os testes controlados cobrem os cinco campos individualmente e em conjunto até o XML do transporte, rejeitam divergências e preservam edições ao fechar/reabrir o modal. Suas respostas simuladas não são evidência de autorização real.
- Os 10 testes focados da matriz de venda real passaram, incluindo bloqueio de CFOP/alíquota específica do cadastro. TypeScript fiscal e lint focado passaram. Não repetir builds sem mudança ou evidência nova.
- Advisors remotos antes/depois: nenhum novo alerta fiscal; os alertas anteriores permanecem fora do escopo desta correção.
- Rollback, falhas transacionais e concorrência das migrations novas ainda precisam de PostgreSQL isolado. Docker está indisponível; esses testes não serão executados de forma destrutiva no banco operacional.
