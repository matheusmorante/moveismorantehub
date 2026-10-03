> **Registro histórico:** preserve este relatório como estado observado na época. As instruções antigas sobre Docker/Supabase local foram substituídas pela política em [`SUPABASE_REMOTE_TEST_POLICY.md`](../testing/SUPABASE_REMOTE_TEST_POLICY.md). Os critérios de testes fiscais em homologação aqui descritos foram removidos em 2026-10-03 para redefinição e não são um roteiro vigente.

# Auditoria de domínio — Pedido → FiscalDocument → NF-e/NFC-e

## Diretriz de operação confirmada em 30/09/2026

- Para mercadorias da empresa no Simples Nacional, **CSOSN 102 é o valor inicial do sistema**. No formulário de emissão, o operador pode ajustar **NCM, CSOSN e CFOP por item** quando a classificação do caso exigir correção, inclusive após uma rejeição definitiva. O valor inicial segue a prioridade: linha já salva no pedido → variação/produto cadastrado → configuração fiscal geral → padrão 102 para CSOSN. A alteração no formulário não reescreve automaticamente o cadastro do produto.
- A escolha manual deve entrar como dado explícito da tentativa fiscal, ser validada pelo backend contra regime, operação e grupos tributários exigidos, e ficar na trilha da decisão/XML. O endpoint novo ainda aceita apenas a intenção de emissão e **não consome esses ajustes do formulário**; portanto, os seletores da interface não liberam a emissão hoje. Uma resposta SEFAZ incerta exige consulta da mesma chave antes de qualquer nova tentativa; não se altera o XML assinado de uma tentativa pendente.
- CSOSN 102 é uma preferência operacional informada pelo usuário, não uma inferência de que todo item/operação usa 102. Os outros códigos selecionáveis exigem seus respectivos dados tributários e suporte no serializer antes da transmissão.
- Para o primeiro cenário de **NF-e 55 de venda normal por emitente com CRT 1 (Simples Nacional)**, a orientação do [Portal Nacional da NF-e — perguntas frequentes do Simples Nacional](https://www.nfe.fazenda.gov.br/Portal/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=S%2FEAGUrzRyk%3D) indica **PIS CST 99 e COFINS CST 99**, com base/alíquota/valor zerados no exemplo de preenchimento. O teste sintético do serializer usa esse par. Em 30/09/2026, por instrução do operador, `settings.data.fiscalDefaults.pisCst/cofinsCst` foi alterado de `49/49` para `99/99` no projeto MoranteHub. A decisão com escopo, fonte e `productionApproved=false` foi registrada em `settings.data.fiscalDecisions.SIMPLES_NFE55_NORMAL_SALE_V1` e numa linha separada `settings.id=fiscal_decision_simples_nfe55_normal_sale_v1`, preservada mesmo se o formulário de configurações regravar o objeto `app`. O backend deve aplicar a decisão por cenário/CRT, sem estendê-la automaticamente a serviços, devoluções ou outros cenários.

## Atualização técnica em 30/09/2026

- O backend agora recebe `settings.data.fiscalDefaults` no `FiscalSnapshotCandidate`, mas trata esses valores como dados de configuração. `resolveFiscalDocument` exige uma matriz versionada, com responsável, vigência e determinação explícita; sem ela, continua retornando `APPROVED_FISCAL_RULESET_REQUIRED` antes de reservar número ou contatar a SEFAZ.
- `api/nfe/fiscalCore.ts` valida vínculo com o snapshot, trilha de decisões, itens, tributos, totais em centavos e múltiplos pagamentos. `api/nfe/fiscalXmlSerializer.ts` serializa apenas NF-e 55 de venda normal interna no PR, para um subconjunto explícito de grupos tributários; rejeita operações interestaduais, devolução/estorno, grupos não suportados e NFC-e 65. O serializer é puro e ainda não foi conectado à reserva/transmissão; `FISCAL_DOCUMENT_SERIALIZER_UNAVAILABLE` permanece como bloqueio.
- A consulta inicial, anterior à decisão acima, encontrou CRT 1 e `fiscalDefaults` com NCM 94036000, CFOP 5102, CSOSN 102, origem 0, CST 49 de PIS/COFINS e ICMS 0. A inspeção dos nomes das chaves de `settings.data` encontrou apenas `fiscalDefaults` como configuração fiscal/tributária; não havia matriz por operação/destinatário, aprovação ou vigência. Dos 510 produtos cadastrados, 244 têm NCM válido, 177 têm CFOP e 6 têm código ICMS, origem e CST de PIS/COFINS preenchidos. Nenhum dado pessoal, segredo ou XML operacional foi consultado.
- Um cenário **sintético** NF-e 55 passou por determinação, serialização, assinatura de teste e validação no XSD local `PL_010f_v1.04`. Essa evidência não valida a tributação real da empresa nem homologação SEFAZ. O código não usa os defaults do banco para inferir tributação ou liberar emissão.
- O XSD de `NFe` exige `Signature` após `infNFe`; a tentativa de validar diretamente o XML ainda não assinado falhou no teste focado. Antes de conectar o novo serializer ao transmissor, separar a validação estrutural pré-assinatura de uma validação XSD completa pós-assinatura. Os caminhos atuais que chamam o mesmo validador antes da assinatura precisam de revisão específica.
- Fonte de leiaute: [MOC 7.0 Anexo I no Portal Nacional](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J+I+v4eN00E%3D), referência oficial localizada em 30/09/2026; a abertura direta do portal retornou erro de redirecionamento nesta sessão. A ordem e a presença das tags implementadas foram verificadas contra o XSD oficial fixado no projeto e pelo teste de validação. A [SEFA/PR confirmou a exigência de CSRT para NF-e](https://sped.fazenda.pr.gov.br/NFe/Pagina/CSRT) em 30/09/2026, conforme NT 2018.005 v1.52. NTs e regras tributárias atuais ainda precisam ser conferidas para cada cenário antes de habilitá-lo.

**Data:** 2026-09-29  
**Escopo:** auditoria estática da emissão comercial de saída; NF-e modelo 55 e NFC-e modelo 65 no Paraná.  
**Resultado:** diagnóstico, desenho proposto e primeira etapa local do FiscalSnapshot. Nenhuma regra fiscal foi implementada ou presumida, nenhum registro operacional foi lido e nenhuma transmissão foi feita. Em 29/09/2026, uma continuação consultou somente metadados de schema/segurança do Supabase remoto pelo Dashboard autenticado, sem escrita. As migrations preparadas continuam locais e não foram aplicadas à base operacional.

## Conclusão executiva

O caminho básico de assinatura, validação estrutural XSD e SOAP/mTLS está presente. A fronteira de confiança e o conteúdo fiscal, porém, não estão prontos para produção:

1. O navegador ainda escolhe modelo e campos fiscais, monta o XML e o envia à API. A reserva agora tem uma RPC preparada para capturar `orders.order_data` e o perfil do emitente em snapshot privado, mas a API de emissão ainda não calcula nem reconstrói a nota a partir dele. A migration correspondente passou em banco temporário isolado e está pendente de aplicação na base operacional.
2. O builder serializa defaults tributários e valores zero, sem uma determinação fiscal rastreável por empresa, operação, destinatário, produto e vigência.
3. Foram corrigidos o offset da hora, o uso do mesmo instante para chave e `dhEmi`, e os fallbacks de município IBGE; a API ainda aceita o XML comum do cliente e não reconstrói toda a nota.
4. Há requisitos oficiais que precisam entrar no gate por perfil: a SEFA/PR exige CSRT/hashCSRT para NF-e desde fevereiro de 2026; IBS/CBS depende do CRT e da regra de vigência; cBenef depende de benefício aplicável. Não há dados suficientes para escolher valores por conta própria.

**Produção permanece bloqueada.** O gate XSD estrutural, mesmo atualizado para o pacote oficial vigente, não valida apuração tributária, credenciamento, CSRT, fatos comerciais nem a consistência da nota com a operação.

## 1. Fluxo observado

~~~mermaid
sequenceDiagram
    participant UI as ERP React
    participant DB as Supabase
    participant API as api/nfe/emit
    participant SEFAZ as SEFA/PR

    UI->>DB: lê pedido/pedido salvo e cadastro do produto
    UI->>UI: escolhe modelo e edita NCM/CFOP/CSOSN/origem
    UI->>UI: monta XML, chave e timestamp
    UI->>API: orderId + modelo solicitado + ambiente + idempotência
    API->>DB: RPC local captura order_data e reserva número
    DB-->>API: snapshotId + hash + número + instante
    API-->>UI: dados da reserva
    UI->>API: XML + snapshotId/hash + modelo + número/chave
    API->>DB: valida operador, pedido e vínculo com snapshot
    API->>DB: grava tentativa/XML recebido
    API->>API: assina o XML recebido e valida XSD
    API->>SEFAZ: SOAP 1.2 + mTLS
    SEFAZ-->>API: autorização/rejeição/resposta incerta
    API->>DB: persiste retorno e itens extraídos do XML
~~~

O número é reservado antes da emissão, agora pela RPC preparada para capturar o snapshot no mesmo commit. A API normal verifica que o pedido existe e se é `sale`/`showroom`, mas não recompõe as linhas fiscais a partir de `order_data`. A rota do rascunho de operação fiscal é outro fluxo, restrito a operação de retorno/estorno e revisão de blocos fiscais; não deve servir como motor da emissão de venda.

## 2. Inventário de dados e dependências fiscais

| Fonte / domínio | Dados disponíveis no modelo atual | Dependências no documento fiscal | Lacuna encontrada |
|---|---|---|---|
| **Pedido comercial** | `id`, `orderType`, `status`, `date`, `items`, vendedor, totais resumidos, cliente, frete, pagamentos; campos de assistência, devolução e vínculos também existem. O banco mantém o pedido em `order_data`. | Natureza/operação, `tpNF`, `finNFe`, `idDest`, `indFinal`, `indPres`, referências fiscais e quantidades/valores por item. | A emissão regular aceita só venda/showroom. A API não lê o `order_data` completo e não valida linhas, cliente, frete nem pagamentos contra o pedido salvo. |
| **Snapshot de item no pedido** | `orderItemId`, IDs opcionais de produto/variação, SKU/código, descrição, quantidade, preço, desconto, condição e item de serviço; componentes de serviço podem apontar para uma linha de produto. | `cProd`, `xProd`, `qCom`, `vUnCom`, `vProd`, `vDesc`, unidade, `indTot`, classificação e impostos do item. | O tipo `Item` não define `fiscal`; o modal acrescenta `fiscal` dinamicamente com `as any`. NCM/CEST e dados fiscais não são comprovadamente parte do snapshot histórico do pedido. A regra de negócio do ERP exige preservar snapshots comerciais antigos quando cadastro muda. |
| **Produto e variação** | `Product`/`Variation` modelam código, SKU, código de barras, unidade no produto, condição/novo-usado-salvado, combo e campos `FiscalInfo`: NCM, CEST, origem, CST/CSOSN, CFOP, CST PIS/COFINS, percentual ICMS, código de serviço e ISS. | NCM/CEST/GTIN, CFOP, origem, unidade comercial/tributável, ICMS/IPI/PIS/COFINS e demais grupos aplicáveis. | O `FiscalInfo` não contém uma decisão completa nem versão/vigência de regra. Não há modelo tipado encontrado para cBenef, situação detalhada e bases/valores de ICMS-ST/FCP/DIFAL, IBS/CBS/cClassTrib, ou trilha de fundamento. `barcode` existe no catálogo, mas o builder sempre informa `SEM GTIN`. Persistência e herança fiscal da variação precisam ser confirmadas na camada de produto; não presumir que a variação herda tudo do pai. |
| **Modal fiscal do navegador** | Busca produto/variação, permite editar NCM, CEST, CFOP, CSOSN/CST e origem antes da emissão. | Campos que alteram produto e tributos. | É uma entrada editável pelo cliente e enviada no pedido para a API; não é autoridade fiscal. CFOP/CST/origem podem ser diferentes do cadastro, sem aprovação/versionamento. A busca do catálogo só preenche NCM/CEST/CFOP; CST e origem recebem defaults do cliente/configuração. |
| **Cliente / destinatário** | Snapshot do pedido tem nome, CPF/CNPJ/documento legado, telefone/e-mail e endereço com CEP, rua, número, bairro, município e UF. | CPF/CNPJ, `xNome`, `enderDest`, `indIEDest`, `IE`, consumidor final/destino, país/UF e identificação específica quando aplicável. | Não há no tipo do snapshot IE nem estado de contribuinte de ICMS. O XML sempre escreve `indIEDest=9`; assim não distingue não contribuinte, contribuinte isento ou contribuinte com IE. Há endereço e documento com fallbacks de emissão, em vez de exigir/derivar dado fiscal confiável. |
| **Empresa / perfil fiscal** | `settings` tem nome, CNPJ, IE, IM, CRT, endereço/código IBGE, ambiente, séries/faixas, `cscId` e defaults fiscais simples. O arquivo de defaults inicia com CRT 1, NCM `94036000`, CFOP `5102`, CSOSN `102`, origem `0`, PIS/COFINS `49` e ICMS 0; esses defaults locais não provam o perfil de produção. | `emit`, `cMunFG`, `CRT`, regime, série/ambiente; responsável técnico e CSRT quando exigido; CSC/IdToken para QR Code NFC-e. | A configuração corrente de produção não foi verificada. As rotas servidoras NF-e passaram a serializar `infRespTec/idCSRT/hashCSRT` em emissões novas e bloqueiam novas tentativas sem CSRT válido; ainda faltam configurar/confirmar as variáveis seguras e provar em homologação. O XML comum ainda nasce no cliente. CSRT do fornecedor de software é distinto do CSC da NFC-e. |
| **Serviços e montagem** | Pedido suporta linhas `service`, preço/desconto, `linkedProductOrderItemId`, assistência e `assistanceServiceValue`; `Product` também modela código de serviço/ISS. | Definir natureza do serviço, município de incidência, código de serviço e documento fiscal adequado; ou regra fiscal aprovada de composição com mercadoria. | O builder retira serviços dos itens e soma serviços vinculados dentro de `vProd`; serviços sem vínculo viram `vOutro`. Não foi encontrada a regra fiscal aprovada para decidir quando serviço/montagem compõe mercadoria, usa NF-e ou exige NFS-e. **REQUER VALIDAÇÃO DO RESPONSÁVEL FISCAL.** |
| **Frete e entrega** | Valor do frete, `delivery`/`pickup`, endereço efetivo, distância e dados de agendamento. | `vFrete`, modalidade `modFrete`, eventual transportador, volumes, peso e demais dados de transporte. | O XML usa `modFrete=0` para toda entrega e `9` para retirada; a modalidade de entrega não informa quem juridicamente paga/realiza o frete. O bloco `transp` contém apenas `modFrete`. Transportador e volumes não estão modelados no pedido atual. |
| **Pagamentos** | Lista com `method: string`, valor, taxa/tipo de taxa e status; resumo com total da venda, pago, saldo, taxas e troco. | Um ou vários `detPag`, meio padronizado, valor por meio, informações de cartão quando pertinentes e troco. | O builder analisa somente o primeiro método e declara `vPag=vNF` para esse único meio, ignorando valores/status dos demais pagamentos, saldo e troco. A string livre não é contrato fiscal de meio de pagamento. |
| **Tempo e chave** | A reserva de numeração agora devolve o instante UTC do servidor; o fluxo normal deriva AAMM e `dhEmi` desse mesmo instante em `America/Sao_Paulo`. | `dhEmi` precisa carregar o offset local correto e AAMM corresponder ao mesmo instante. | O erro objetivo de offset foi corrigido. A API ainda recebe XML do cliente e não reconstrói nem compara horário/chave com o instante reservado; autoridade temporal e XML server-side continuam pendentes. |
| **Histórico da tentativa** | `nfe_documents` guarda XML, protocolo e situação; após autorização itens/tributos são extraídos do XML para `nfe_document_items`. A migration local proposta acrescenta `fiscal_snapshot_id` e tabela privada de snapshots. | Provar exatamente o documento transmitido, snapshot de origem, decisão e versão de regra usadas. | O snapshot proposto guarda fatos/revisão do pedido e hash, mas ainda não contém determinação fiscal nem vincula semanticamente cada valor do XML aos fatos. A migration passou em banco isolado, mas não foi aplicada na base operacional. Itens detalhados continuam sincronizados depois da autorização. |

## 3. Decisões atuais e defaults que não podem ser promovidos a regra

| Decisão no código | Comportamento observado | Ação de auditoria |
|---|---|---|
| Modelo | `deliveryMethod === 'pickup'` escolhe 65; qualquer outro valor escolhe 55. | Substituir por determinação no servidor baseada em operação, local/UF, destinatário, consumidor final, credenciamento e escopo comercial. A NFC-e no PR tem condições de uso próprias; retirada não é sinônimo de elegibilidade. **REQUER VALIDAÇÃO DO RESPONSÁVEL FISCAL.** |
| CFOP | Fallback `5102`, com escolha manual na UI. | Sem default de CFOP. Determinar pelo tipo de operação, origem/destino, finalidade, item e vigência. **REQUER VALIDAÇÃO DO RESPONSÁVEL FISCAL.** |
| ICMS | Fallback de CSOSN/CST `102`, origem `0`; serializa grupo ICMSSN baseado no valor escolhido. | Não assumir CRT/CSOSN compatível, origem do item ou ICMS sem regra aprovada e classificação do produto. **REQUER VALIDAÇÃO DO RESPONSÁVEL FISCAL.** |
| PIS/COFINS | O builder legado serializa CST `49` e base, alíquota e valor zero por item; totais também ficam zero. Ignora campos `pisCst`/`cofinsCst` configurados. | No primeiro cenário CRT 1/NF-e 55 de venda normal, usar a orientação oficial CST `99/99` com valores zero, determinada no backend. Outros cenários exigem regra própria; não promover o XML legado a Golden File. |
| Município do emitente e fato gerador | Os builders agora usam `settings.companyCMun` sem fallback para Curitiba e exigem sete dígitos IBGE; a reserva bloqueia configuração ausente e a API compara o `cMunFG` recebido com o cadastro persistido. O caminho de operação revisada lê do servidor. | Fonte única validada para `emit/enderEmit/cMun` e `cMunFG`; confirmar que a configuração corresponde ao estabelecimento e à operação antes de Produção. |
| Informação complementar | O texto fixo sobre Simples Nacional e crédito foi removido; permanece somente a referência ao pedido, escapada para XML. | Nenhuma afirmação fiscal fixa sem base. Outras informações complementares dependem da operação. **REQUER VALIDAÇÃO DO RESPONSÁVEL FISCAL.** |
| Unidade/GTIN | Serializa `UN` e `SEM GTIN` independentemente da unidade e código de barras cadastrados. | Resolver unidade e GTIN a partir do snapshot efetivo ou exigir ausência oficialmente classificada; considerar conversões da unidade comercial/tributável. |
| Endereço do destinatário | Builder tem fallbacks textuais/cadastrais; para todos os destinatários usa `indIEDest=9`. | Validar se o destinatário tem documento, endereço, IE e condição fiscal compatíveis com a operação/modelo. Não converter falta de dado em `não contribuinte`. |
| Serviços | Aloca valores em produto ou `vOutro` por vínculo comercial da linha. | Definir por regra fiscal assinada quando é composição de mercadoria e quando é serviço/documento separado. |

## 4. Requisitos normativos confirmados e condicionais

### Confirmados para a revisão do desenho

- O [MOC 7.0 — Anexo I](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=J+I+v4eN00E%3D) define leiaute e validações dos campos, mas não determina a classificação fiscal particular dos móveis ou do contribuinte. O XML deve ser consequência da determinação aprovada, não a origem dela.
- A [SEFA/PR exige idCSRT/hashCSRT na NF-e](https://sped.fazenda.pr.gov.br/NFe/Pagina/CSRT): validação no ambiente de teste desde 19/01/2026 e em produção desde 23/02/2026; a página remete à NT 2018.005 v1.52, publicada em 10/07/2025. As duas rotas servidoras NF-e geram `infRespTec`, `idCSRT` e `hashCSRT` (SHA-1 de CSRT + chave, digest em Base64) em documentos novos e bloqueiam novas emissões sem configuração válida. As variáveis `NFE_RESP_TECH_CNPJ`, `NFE_RESP_TECH_CONTACT`, `NFE_RESP_TECH_EMAIL`, `NFE_RESP_TECH_PHONE`, `NFE_CSRT_ID` e `NFE_CSRT_SECRET` precisam ser configuradas com os dados confirmados do fornecedor; isso e a homologação ainda não foram verificados. Retries antigos sem CSRT ficam bloqueados para não alterar XML imutável. A emissão modelo 65 permanece sem alteração até confirmar o escopo específico da SEFA/PR.

- A [NT 2025.002-RTC consultada no Portal Nacional](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=YFz9is%2BR6tw%3D) descreve `cMunFG` como código do município de ocorrência do fato gerador do ICMS, ocorrência 1-1, sete dígitos pela tabela IBGE (campo B12). A configuração precisa representar a operação/estabelecimento efetivos; o valor padrão local não comprova a situação cadastral atual.
- A [SEFA/PR exige cBenef quando a operação estiver contemplada por benefício](https://sped.fazenda.pr.gov.br/NFe/Pagina/CODIGO-DE-BENEFICIO-FISCAL); a tabela por CST foi atualizada em 17/07/2026. O modelo atual `FiscalInfo` e o serializador não têm campo nem regra de elegibilidade de cBenef. Não preencher por aproximação.
- Para modelo 65, consultar [credenciamento de emissores da NFC-e no PR](https://sped.fazenda.pr.gov.br/NFCe/Pagina/Credenciamento-de-emissores), incluindo pedido de uso do sistema e CSC, e as [regras oficiais do QR Code e web services](https://sped.fazenda.pr.gov.br/NFCe/Pagina/Web-Services-NFC-e). O cadastro tem só `cscId`; credenciais de homologação e produção precisam ser conferidas separadamente.
- Os [serviços oficiais PR para NFC-e](https://sped.fazenda.pr.gov.br/NFCe/Pagina/Web-Services-NFC-e) descrevem o modelo 65 para o autorizador estadual. A elegibilidade concreta da venda, inclusive consumidor, local e operação, deve ser formalizada em matriz aprovada. A interface atual usa apenas retirada/entrega.

### Dependentes do perfil tributário — não presumir

- O [cronograma oficial da NT 2025.002 — RTC](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=lWEyoabukyw%3D) distingue CRT 3 e os CRT 1/2/4. Para CRT 3, produção exige os grupos IBS/CBS e aplica calendário de 2026; para CRT 1/2/4 a própria orientação remete à tributação a partir de 2027. A configuração local padrão CRT 1 não prova o regime atual da empresa. O serializador não tem grupos IBS/CBS/cClassTrib. **O responsável fiscal deve confirmar o CRT real e indicar qual ramo do cronograma se aplica antes de classificar essa ausência como liberada ou bloqueadora.**
- O [portal oficial de Notas Técnicas](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=6WfrpZYE4Ik%3D) já lista NT 2025.002 v1.50 e NT 2026.004. O schema XSD PL_010f em uso comprova que os elementos estruturais estão disponíveis; não comprova que foram determinados e preenchidos corretamente. Mudanças normativas e tabelas como cClassTrib/cBenef precisam de versionamento e vigência.
- Confirmar se NT 2026.007, direcionada ao contribuinte exclusivo de IBS/CBS, alcança a empresa/operações deste emissor. Não presumir aplicabilidade nem ignorar sem checar enquadramento.

## 5. Decisões que precisam do responsável fiscal

Todos os itens abaixo ficam como **REQUER VALIDAÇÃO DO RESPONSÁVEL FISCAL**. A equipe técnica não deve preencher valores de demonstração como se fossem decisão definitiva.

1. CNPJ/estabelecimento emissor, CRT vigente, regime, IE, endereço/cMunFG e quais operações são autorizadas no sistema.
2. Escopo inicial por modelo: venda interna/interestadual, destinatário PF/PJ, contribuinte/isento/não contribuinte, presencial/remota, retirada/entrega; quando NF-e 55, NFC-e 65 ou bloqueio.
3. Para cada grupo de produto/variação e período: NCM, CEST quando aplicável, origem, unidade/GTIN, CFOP por cenário e tratamentos ICMS/CSOSN/CST, PIS/COFINS, IPI, ST/FCP/DIFAL e cBenef.
4. Tratamento de móveis novos/usados/salvados, combos, itens temporários, serviços de montagem e assistência; decidir documento e composição de valores sem alterar o histórico comercial.
5. Como calcular descontos, acréscimos, frete, troco, parcelas e múltiplas formas de pagamento; quais valores alimentam `vProd`, bases, `vNF` e cada `detPag`.
6. CRT efetivo para definir vigência e preenchimento de IBS/CBS; informar cClassTrib/benefícios e casos de incidência, redução, crédito ou não incidência apenas com referência aprovada.
7. Fornecedor do software e credencial CSRT, quando exigida, para o modelo 55; CSC/IdToken por ambiente para NFC-e; credenciamento e séries de homologação/produção.

## 6. Desenho proposto do Fiscal Core

O desenho separa fatos comerciais preservados de decisões fiscais versionadas. O snapshot fiscal registra exatamente quais fatos e versões produziram o documento; a regra de negócio não fica no serializador XML.

~~~mermaid
flowchart TD
    A[API recebe orderId + ambiente + idempotency key] --> B[Autentica operador fiscal]
    B --> C[Carrega order_data persistido e snapshot comercial]
    C --> D[Carrega perfil fiscal do emitente e versões aplicáveis]
    D --> E[Cria FiscalSnapshot imutável]
    E --> F[Determination Engine]
    F --> G{Há decisão faltante ou não aprovada?}
    G -- Sim --> H[Bloqueia sem transmitir e apresenta campos pendentes]
    G -- Não --> I[FiscalDocument tipado + trilha de decisões]
    I --> J[Reconcilia valores, itens, pagamentos e totais]
    J --> K[Reserva número e persiste tentativa/snapshot atomicamente]
    K --> L[Backend XML serializer]
    L --> M[XSD oficial + regras estruturais]
    M --> N[CSRT quando aplicável + assinatura A1]
    N --> O[SOAP/mTLS SEFAZ-PR]
    O --> P{Autorizado / rejeitado / desconhecido}
    P --> Q[Persiste resposta; desconhecido fica pendente para consulta]
    Q --> R[Reconciliação do documento e itens autorizados]
~~~

### Contrato conceitual

Este é um esboço de domínio, não uma proposta de regras ou valores tributários:

~~~ts
type FiscalSnapshot = {
  orderId: string;
  capturedAt: string;
  orderRevision: string;
  issuerProfileRevision: string;
  customer: CustomerFiscalFacts;
  operation: CommercialOperationFacts;
  shipping: ShippingFacts;
  payments: PaymentFacts[];
  items: CommercialItemSnapshot[];
};

type FiscalDocument = {
  snapshotHash: string;
  ruleSetVersion: string;
  model: '55' | '65'; // saída do motor, não entrada confiável do navegador
  environment: 1 | 2;
  issuer: ResolvedIssuer;
  recipient: ResolvedRecipient;
  operation: ResolvedFiscalOperation;
  items: DeterminedFiscalItem[];
  payments: DeterminedPayment[];
  totals: ReconciledFiscalTotals;
  decisions: FiscalDecisionTrace[];
};

type DeterminedFiscalItem = {
  product: CommercialItemSnapshot;
  classification: {
    ncm: string;
    cest?: string;
    origin: string;
    cfop: string;
    cBenef?: string;
    unit: ResolvedTaxUnit;
  };
  taxes: DeterminedTaxGroups; // variantes tipadas segundo CST/CSOSN e regras aprovadas
  decisions: FiscalDecisionTrace[];
};
~~~

`FiscalDecisionTrace` deve registrar fato de entrada, regra/tabela e versão/vigência, resultado, motivo e aprovador quando a decisão depender de cadastro fiscal. Se faltar dado ou existir conflito, o resultado é bloqueio explícito; nenhum valor padrão silencioso.

### Fronteira de API e persistência proposta

- **Entrada do navegador:** `orderId`, ambiente escolhido, confirmação explícita de produção e chave de idempotência. Modelo, chave, XML, tributos e número não são aceitos como autoridade do cliente.
- **Leitura:** API valida permissão e estado comercial, carrega pedido/snapshot persistido, perfil do emitente e revisões fiscais aplicáveis; verifica que os valores usados coincidem com os fatos do pedido.
- **Snapshot:** registrar antes da chamada externa o JSON fiscal completo, hash, instante, referências/versionamentos e trilha de determinação. Não reler cadastro mutável para retry nem alterar XML de uma tentativa existente.
- **Reserva:** depois da determinação, o servidor reserva sequência e registra tentativa/documento/snapshot na mesma RPC/transação com unicidade/idempotência. Falha fiscal antes da reserva não consome número; falha estrutural após reserva registra o consumo e não regride sequência.
- **XML:** serializer puro recebe apenas `FiscalDocument`; não decide CFOP, CST, alíquota, modelo nem enquadramento. Reconcilia `sum(itens)`, impostos, frete/desconto/outras despesas, `vNF` e `detPag` antes do XSD.
- **Transmissão:** XSD oficial, CSRT (quando exigido), A1/XMLDSig e SOAP/mTLS continuam no servidor. SOAP fica fora da transação local; resultado incerto é persistido como desconhecido/pendente e consultado antes de qualquer retransmissão.
- **Após autorização:** salvar resposta, protocolo, XML protocolado e linhas fiscais em transação local; se a SEFAZ autorizar e a persistência falhar, disparar reconciliação a partir da tentativa imutável, sem repetir emissão.

### Evidências locais para iniciar o FiscalSnapshot

- **Fonte canônica escolhida para o `FiscalSnapshot`: `orders.order_data`**, capturada por UUID no momento da emissão; essa escolha segue o contrato aprovado nesta tarefa e evita montar uma venda juntando versões mutáveis. `save_order_transaction` também grava `order_items` e `order_payments` na mesma transação, e os leitores de pedidos priorizam esses filhos normalizados. O snapshot fiscal não deve mesclar as cópias: uma futura checagem de paridade deve detectar divergência e bloquear a emissão. A migration local atual ainda não compara os filhos normalizados, portanto esse gate permanece pendente.
- A linha de pedido tem `version` (incrementada por trigger a cada `UPDATE`) e `updated_at`; ambas podem identificar a revisão lida pelo backend e detectar alteração concorrente antes da reserva. O retry deve continuar usando o snapshot/XML já persistido da tentativa original.
- O perfil do emitente fica em `settings.data`. Classificações fiscais vindas do React ou gravadas sem revisão/vigência no snapshot do produto não devem ser tratadas como determinações aprovadas.
- Hoje `reserve_nfe_outbound_emission` ainda recebe do cliente chave, número, série e XML. A etapa local acrescenta `prepare_nfe_fiscal_snapshot`: uma leitura pontual de `orders.order_data` por UUID, cópia filtrada do perfil do emitente e reserva da sequência na mesma transação que grava o snapshot. Um gatilho relaciona o documento comercial novo ao snapshot. A autoridade do XML/modelo e a determinação fiscal ainda precisam migrar para o backend; o JSON sozinho não conclui a migração.
- A migration local de endurecimento mantém `SELECT` para `authenticated` com `USING (true)` em `nfe_documents`. Não adicionar ali um snapshot completo com CPF/endereço sem restringir leitura; prefira armazenamento separado e privado, com acesso apenas do backend ou política por operador. A leitura posterior do Dashboard encontrou a Data API desabilitada para `nfe_documents` e somente a policy de leitura autenticada; o snapshot segue em tabela separada e privada.

## 7. Sequência de trabalho recomendada

1. **Contrato canônico inicial definido:** `orders.order_data` é a fonte de fatos comerciais do `FiscalSnapshot`; manter uma leitura pontual por pedido. Falta adicionar comparação com `order_items`/`order_payments` e bloquear divergências, sem mesclar os dados.
2. **Contrato tipado inicial** em `api/nfe/fiscalSnapshot.ts`: há `FiscalSnapshotCandidate`, `FiscalDocument`, grupos fiscais e trilha de decisão. A forma já existe, mas nenhum valor fiscal é considerado resolvido sem regra versionada e aprovada.
3. **Entrada nova movida ao backend em modo fail-closed**: recebe apenas `orderId`, ambiente, `emissionRequestId` e confirmação de produção; lê a revisão/pedido e perfil do emitente; modelo, série, número, chave e XML do cliente são recusados. Enquanto a matriz não existe, bloqueia antes de reservar; o snapshot candidate ainda não é persistido. A integração atômica de determinação + snapshot + tentativa + sequência continua pendente. O retry agora recebe somente `retryDocumentId` e confirmação de produção; recupera pedido, modelo, ambiente, chave, série, número e XML do documento persistido. O compare-and-set de `erro` para `processando` bloqueia retries concorrentes; A1 é validado antes dessa transição. A tela não oferece DANFE de retry enquanto não puder gerá-lo a partir dos dados originais armazenados. A rota especial de devolução/estorno continua separada.
4. **Obter a matriz assinada do contador/responsável fiscal** usando a lista da seção 5. Enquanto isso, não codificar alíquota/CST/CFOP nem escolher modelo por suposição.
5. **Implementar determinação, reconciliação e serializer server-side** a partir de casos aprovados; só então criar Golden Files aprovados e validar cada um contra XSD oficial.
6. **Provar persistência e concorrência** com banco isolado, incluindo sucesso, falhas, repetição, duas emissões concorrentes, cancelamento/reversão e privacidade/RLS; executar advisors antes de qualquer migration.
7. **Homologar no PR** modelo por modelo, cobrindo autorizado, rejeições conhecidas, consulta, retry 217, timeout/resposta perdida, valores mistos, serviço/frete quando aprovados, CSRT e as classes RTC aplicáveis. Registrar XML/hash, retorno SEFAZ, estado persistido e UI.
8. **Liberação de produção** somente com aceite do responsável fiscal, credenciamento/CSC/CSRT verificados, matriz HML revisada, rollback/reconciliação provados e variáveis do ambiente conferidas.

## 8. Evidências locais consultadas

- Entrada de emissão: `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.ts`, `erp/src/pages/utils/nfe/nfeService.ts`.
- Payload fiscal editável no ERP: `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeItemsSection.tsx` e `NfeItemRow.tsx`.
- Dados de domínio: `erp/src/pages/types/order.type.ts`, `items.type.ts`, `customerData.type.ts`, `Shipping.type.ts`, `payments.type.ts`, `product.type.ts`, `erp/src/pages/utils/settingsService.ts`.
- API principal: `api/nfe/emit.ts`; XSD/assinatura/SOAP em `api/nfe/schemaValidator.ts`, `api/nfe/nfeSigner.ts`, `api/nfe/sefazClient.ts`.
- Serialização atual: `erp/src/pages/utils/nfe/nfeXmlBuilder.ts`, `xml/xmlEmitterBlock.ts`, `xml/xmlDestBlock.ts`, `xml/xmlItemsBlock.ts`, `xml/xmlTotalsBlock.ts`, `serviceFiscalComposition.ts`.
- Persistência/estados: `supabase/migrations/20260903150000_create_nfe_documents.sql` e migrations posteriores de documentos fiscais.

**Limite de evidência:** o mapa CALM indica que os edges JavaScript têm confiança de referência cruzada reduzida/embeddings indisponíveis. O fluxo acima foi confirmado pelo código e pelos consumidores diretos identificados, mas a auditoria não certifica o estado efetivo do Supabase remoto, as variáveis de produção, credenciamento/certificados, nem a classificação de produtos real. O preflight local confirmou `morantehub` em `127.0.0.1`; o banco operacional local tem baseline incompleta e não recebeu esta migration. O teste PostgreSQL usou banco temporário, com tabelas mínimas de apoio, removido ao final.

## 9. Progresso da primeira etapa do FiscalSnapshot

- A chamada de reserva no backend recebe `orderId` e `emissionRequestId`. A RPC lê uma única linha de `orders` por ID, com `order_data`, revisão e estado, bloqueia a linha durante a captura, guarda apenas campos permitidos do perfil do emitente e reserva o número na mesma transação que grava o snapshot e seu SHA-256.
- A tabela `nfe_fiscal_snapshots` tem RLS e concessões restritas ao serviço fiscal. Uma tentativa de saída nova só é vinculada quando pedido, solicitação, modelo pedido, ambiente, série e número correspondem ao snapshot. A API compara também o hash recebido com o registrado.
- O teste local `scripts/testing/nfe-fiscal-snapshot-local.cjs` aplica 01434 e depois 01435 em banco PostgreSQL temporário. Confirma backfill de pedidos preexistentes para `version=1`, incremento por trigger, revisão no snapshot, hash, repetição da chave, duas reservas concorrentes, repetição concorrente, vínculo do documento, rejeição de divergência, privilégios e rollback da sequência após falha de inserção. O banco temporário é removido no `finally`; esse teste não certifica o schema remoto nem a cadeia completa de migrations.
- A emissão nova agora envia ao backend somente pedido, ambiente e chave de solicitação. A API busca a revisão do pedido e o perfil do emitente; rejeita modelo, série, número, chave ou XML do cliente. A rota antiga de reserva direta foi fechada para não consumir número fora do Fiscal Core. Sem uma matriz fiscal aprovada, o backend retorna bloqueio explícito antes de reservar número, validar XSD ou chamar a SEFAZ. A retransmissão autorizada recebe somente o ID do documento e a confirmação de produção; o servidor deriva metadados e XML da linha original, confere situação 217, modelo/ambiente/chave/número/série, CSRT quando aplicável e XSD. O documento só passa a `processando` se o compare-and-set vencer. Timeout mantém `pendente` e retorna metadados originais para reconciliação. O fluxo não atualiza o pedido com dados enviados pela tela e não gera DANFE com uma cópia possivelmente divergente do pedido atual.
- O retry foi coberto em testes unitários com Supabase e SOAP simulados: metadados adulterados no payload não influenciam documento/pedido/modelo/ambiente/XML; o XML original e endpoint HML são usados; conflito no compare-and-set impede transmissão; falta de A1 não altera o estado; timeout deixa resposta pendente. Isso não é evidência de transmissão SEFAZ real nem prova de mTLS/certificado de produção.
- Ainda faltam a matriz aprovada do responsável fiscal, o Determination Engine, reconciliação de totais, serializador server-side e persistência atômica da tentativa depois da determinação. A nova emissão não transmite atualmente; nenhum modelo 55/65 foi homologado nesta etapa. Produção permanece bloqueada.

## 10. Continuação: dependências remotas e segurança do Supabase

Esta verificação foi somente-leitura no projeto `hkoxhourxwlddgsfdgws` (produção), pela sessão autenticada do Dashboard. Foram inspecionados metadados de schema, policies, funções, triggers e extensões; nenhum registro comercial/financeiro foi lido e nenhuma escrita remota foi executada. O conector Supabase não estava disponível; o SQL Editor permaneceu fechado conforme a instrução anterior.

### Dependências diretas da migration FiscalSnapshot

| Objeto/efeito | Necessidade da migration | Estado observado no remoto |
|---|---|---|
| `public.orders` | `id`, `order_type`, `status`, `order_data`, `version`, `updated_at`; lê uma linha e reserva a revisão | A tabela e os campos comerciais existem; `updated_at` existe, `version` não. `updated_at` não é equivalente a uma revisão inteira monotônica. |
| `public.settings` | `id`, `data`; lê `id = 'app'` para montar o perfil seguro do emitente | Tabela e colunas existem. |
| `public.nfe_sequences` | chave única `(modelo, serie, ambiente)` e campos `ultimo_numero`, `updated_at` | Tabela e os seis campos esperados existem. |
| `public.nfe_documents` | `order_id`, `document_type`, `emission_request_id`, `modelo`, `ambiente`, `serie`, `numero_nfe`; recebe FK e trigger de vínculo | Tabela e campos exigidos pelo trigger existem. `fiscal_snapshot_id` ainda não existe. |
| `extensions.pgcrypto` | `extensions.digest(..., 'sha256')` | Extensão `pgcrypto` está habilitada no schema `extensions`, como a migration espera. |
| `public.nfe_fiscal_snapshots` | tabela privada da tentativa, hash e número reservado | Não existe no remoto; sua criação continua pendente. |
| `service_role` | chamada da RPC e leitura/escrita do snapshot pelo backend | Role existe no projeto. A configuração de grants por objeto continua pendente de consulta ACL específica. |

Portanto, a dependência transitiva da migration histórica de versionamento para o FiscalSnapshot é somente a revisão efetiva de `orders`: coluna `orders.version` e trigger de incremento. `financial_transactions.version`, os recibos de sync e o RPC móvel não são chamados pela migration/RPC do FiscalSnapshot.

### Efeitos da migration histórica de versionamento

| Efeito de `20260908190000_add_versioning_and_sync_rpc.sql` | Estado remoto | Relevância/ação |
|---|---|---|
| `orders.version` | Ausente | Bloqueia a RPC do FiscalSnapshot. Migration corretiva local preparada abaixo. |
| `financial_transactions.version` | Ausente | Não bloqueia NF-e; é dependência do versionamento financeiro/offline. |
| `sync_operation_receipts` + RLS | Tabela ausente | Não bloqueia NF-e; necessária para idempotência do sync móvel. |
| `increment_entity_version()` | Função ausente | Sem função remota de incremento com esse nome. |
| `trg_increment_orders_version` | Trigger ausente | Nenhum trigger equivalente por nome/efeito apareceu no inventário remoto de triggers. |
| `trg_increment_financial_transactions_version` | Trigger ausente | Nenhum trigger equivalente apareceu; tabela continua sem `version`. |
| `sync_entity_operation(...)` | RPC ausente no catálogo remoto | `mobile/src/services/offline/offlineSyncManager.ts` chama essa RPC; o sync de pedidos depende de uma implementação remota. |
| `REVOKE PUBLIC` / `GRANT authenticated` da RPC | Não aplicável | A função não existe no remoto, então os grants previstos não foram instalados. |

O histórico local da RPC está como `SECURITY DEFINER`, verifica `auth.uid()` mas não valida a permissão do ator sobre o pedido antes de executar o patch. Como ela contorna as policies da tabela, **não deve ser restaurada literalmente**. A fila móvel tem uma dependência funcional real, mas a autorização por pedido, allowlist do patch e a política de idempotência precisam de revisão própria antes de recolocar esse RPC. O campo `orders.updated_at` não substitui `version`, pois timestamp não oferece a comparação monotônica que o cliente móvel usa.

### Correção fiscal local preparada

A migration [20260930001434_add_orders_fiscal_revision.sql](../../supabase/migrations/20260930001434_add_orders_fiscal_revision.sql) é uma migration nova, aditiva e intencionalmente menor que a histórica. Está ordenada imediatamente antes de `20260930001435_nfe_fiscal_snapshot.sql` e:

- cria `orders.version` com valor inicial 1, repara valores nulos se houver coluna parcial;
- usa a função de trigger de incremento e atualiza `updated_at` em cada `UPDATE`;
- não cria a tabela de recibos nem restaura o RPC de sync inseguro.

Rollback seguro: antes de instalar o FiscalSnapshot, pode-se parar o incremento removendo o trigger e manter a coluna/fatos gravados. Depois de instalar o FiscalSnapshot, não remover `orders.version`: snapshots passam a depender dela. Nenhuma migration foi aplicada ao remoto.

### Security Advisor — alcance real e correção proposta

| Objeto | Evidência remota | Classificação e correção candidata |
|---|---|---|
| `public.accounts_receivable` | RLS desabilitada; Dashboard avisa que a tabela pode ser acessada por qualquer pessoa via Data API; policies `SELECT` e `INSERT` aplicadas a `public` | **Exposição real de dados financeiros e escrita.** Habilitar RLS, remover policies permissivas e restringir leitura/escrita aos papéis financeiros autorizados. O ERP usa acesso direto ao Supabase para listar, inserir e atualizar recebíveis; não revogar `authenticated` sem criar/testar a policy equivalente. |
| `public.product_materials` | RLS desabilitada, nenhuma policy; mesmo aviso de acesso pela Data API | **Exposição real de integridade; confidencialidade baixa** (catálogo de nomes). O ERP lê, insere e remove materiais diretamente. Manter leitura autenticada se necessária e restringir escrita a administrador/gestor; retirar acesso anônimo. |
| `public.order_fallback_telemetry` | RLS desabilitada, nenhuma policy; aviso de acesso pela Data API | **Exposição real desnecessária.** A migration local armazena contadores e `last_order_id`; o trigger `SECURITY DEFINER` atualiza a tabela e nenhum consumidor do ERP foi encontrado. Tornar o objeto privado e retirar privilégios Data API de `PUBLIC`, `anon` e `authenticated`; preservar a escrita interna do trigger. |
| `public.inventory_move_identity_audit` | View listada no remoto e Security Advisor marca `Security Definer View`; a definição local projeta IDs de movimentações/produtos/variações e `identity_status`, com `GRANT SELECT TO authenticated` | **Risco de bypass RLS confirmado; exposição efetiva via Data API condicionada ao grant atual.** O Dashboard de Roles/Policies não expôs a ACL da view, então o grant remoto exato permanece não confirmado. Nenhum consumidor do ERP foi encontrado. Correção candidata: `security_invoker = true` e revogar acesso de API que não seja necessário; validar policies da tabela base. |

Para os três objetos com RLS desligada, os avisos do Dashboard comprovam possibilidade de acesso via Data API, mas a interface não mostra a matriz de grants por role. Para `accounts_receivable`, policies marcadas `public` e o aviso de acesso são evidência direta da exposição. **Não aplicar agora**: `accounts_receivable` e `product_materials` são consumidas diretamente pelo ERP, e os grants/policies precisam respeitar o modelo real de papéis e permissões configuráveis. A matriz atual dá acesso financeiro padrão a gestor/contador, enquanto parte das permissões é configurável no ERP. O próximo draft de segurança deve confirmar primeiro esses grants com consulta de catálogo somente-leitura e testar os perfis/fluxos no banco isolado.

O risco da view deriva do comportamento padrão do PostgreSQL: views podem avaliar permissões e RLS sob o proprietário; `security_invoker = true` faz a verificação sob o usuário chamador. Ver [Views no Supabase](https://supabase.com/docs/guides/database/views) e [RLS no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security). Grants autorizam o acesso ao objeto e RLS filtra as linhas; uma policy não corrige um grant amplo por si só.

### Validação local e próximos gates

- `node scripts/testing/nfe-fiscal-snapshot-local.cjs`: aprovado anteriormente, em banco temporário, cobrindo repetição, concorrência de reserva, vínculo, privilégios e rollback da sequência.
- `node scripts/testing/nfe-order-revision-local.cjs`: aprovado nesta rodada. Aplicou a migration corretiva seguida da FiscalSnapshot em banco temporário; comprovou backfill em versão 1, incremento para 2, captura da revisão no snapshot, retry imutável após novo update e rollback da sequência em conflito. O banco temporário foi removido.
- `node --check scripts/testing/nfe-order-revision-local.cjs`: aprovado. O preflight confirmou Supabase local `morantehub` em `127.0.0.1:54321` e PostgreSQL em `127.0.0.1:54322`; não houve `db reset` nem escrita remota.
- A correção local ainda não passou por advisors contra a cadeia real: o manifesto/baseline local segue incompleto. A migration também não foi aplicada em produção nem homologação.

Sequência revisada: confirmar ACLs com fonte somente-leitura → preparar policies/grants sem quebrar os consumidores do ERP → testar autorização e negações no banco isolado → aplicar a correção `orders.version` antes da FiscalSnapshot em homologação → validar FiscalSnapshot e sync móvel separadamente → continuar homologação SEFAZ 55/65. Produção continua bloqueada.

## 11. Reconciliação mínima do ledger para a trilha FiscalSnapshot

Escopo desta etapa: preparar uma estratégia para publicar somente `20260930001434_add_orders_fiscal_revision.sql` e `20260930001435_nfe_fiscal_snapshot.sql`. Não inclui migrations de segurança ou sync móvel, não reconcilia as 204 migrations completas e não autoriza escrita remota.

**Atualização:** os passos abaixo registram a leitura histórica do ledger e do Dashboard. A recomendação antiga de obter/criar um destino HML foi substituída pela decisão da seção 12: não criar projeto/branch HML. Qualquer referência abaixo a “homologação” como destino de migrations deve ser lida como uma futura aplicação seletiva no Supabase operacional, somente após preflight e autorização explícita; por enquanto, ambas permanecem locais.

### Evidência e limite da consulta

- Em 30/09/2026, a página `Database > Migrations` do projeto `hkoxhourxwlddgsfdgws` (`MoranteHub`, branch `main`, marcada **PRODUCTION**) mostrou 97 registros no ledger, com versão mais alta `20260929202020`.
- Não aparecem no ledger `20260930001434_add_orders_fiscal_revision` nem `20260930001435_nfe_fiscal_snapshot`. Ambas são posteriores ao maior registro remoto observado. Essa evidência confirma ausência por versão/nome no instante da consulta, mas não confirma o estado atual dos objetos do schema.
- Há migrations remotas candidatas a correspondência por finalidade/nome para duas versões locais intermediárias: `20260929200557_restrict_nfe_sequence_reservation` versus local `20260929201000_restrict_nfe_sequence_reservation`, e remota `20260929202020_create_atomic_nfe_cce_reservation` versus local `20260929202500_create_atomic_nfe_cce_reservation`. A lista confirma nomes/timestamps; os corpos SQL não foram comparados, então equivalência semântica ainda não está provada.
- O caminho pela CLI continua indisponível neste checkout (`ProjectRefNotLinkedError`; tentativa de link isolada falhou por transporte). A leitura foi feita no navegador interno autenticado, sem SQL Editor, sem ler linhas comerciais e sem escrita remota.
- O projeto visível está marcado **PRODUCTION**. A leitura não aplicou migrations. A decisão posterior de não criar HML significa que esse projeto operacional só poderá ser considerado numa futura implantação seletiva, após preflight atualizado, avaliação de impacto e autorização; a consulta antiga não é autorização.
- A navegação do Dashboard mostrou uma organização (`moveismorante`, plano Pro) e um projeto (`MoranteHub`, ref `hkoxhourxwlddgsfdgws`). A página Branching lista apenas a branch persistente `main`, marcada como produção, sem branches persistentes ou preview. **Não há ambiente Supabase HML identificado nesta conta**. Criar projeto/branch seria uma alteração fora da leitura solicitada e não foi feito.
- O preflight remoto de schema/ACL das migrations 01434/01435 não foi executado nem presumido a partir do `tpAmb=2` da SEFAZ. Homologação da SEFAZ e ambiente do banco são controles distintos.
- Os hashes SHA-256 dos arquivos locais nesta leitura são: `01434` = `6b835433d183e81086a966d1690011b6191ec74d32e45e62c8ef743c25f8257a`; `01435` = `4d89d4ac47f6140ed6bca9836a00069e5a08ae332b41e88e226442421d6f7bd9`. Eles identificam o conteúdo local, mas ainda não foram comparados a um artefato de release aprovado.

As migrations 29201000 e 29202500 não são dependências diretas da função `prepare_nfe_fiscal_snapshot` conforme o SQL local da 01435. A primeira restringe execução de `reserve_next_nfe_number`; a segunda reserva eventos CCE. Mesmo que os nomes remotos indiquem finalidade correspondente, manter ambas fora do conjunto seletivo até comparar os corpos e confirmar os efeitos reais.

### Decisão operacional

**Não reconciliar o ledger inteiro nem executar `db push` no diretório raiz para liberar o FiscalSnapshot.** O manifesto de certificação do schema continua `incomplete`, e o histórico tem versões divergentes; um push normal pode incluir mudanças locais fora desta trilha. Tampouco inserir/reparar registros de histórico para fingir que SQL foi aplicado.

O ledger remoto foi atualizado por leitura, mas o preflight do schema ainda precisa ser atualizado. O caminho estreito continua sendo preparar um conjunto isolado contendo exatamente as migrations 01434 e 01435, nessa ordem, sem as duas versões intermediárias locais. Antes de qualquer aplicação futura no Supabase operacional, comparar novamente colunas, tipos, defaults, nulabilidade, triggers e ACLs de `orders`, `settings`, `nfe_sequences` e `nfe_documents`; validar ausência das duas versões no ledger atual; calcular hashes finais após revisão e registrar o conjunto liberado. A aplicação permanece pendente.

Esse mecanismo seria uma implantação seletiva, **não uma reconciliação completa do ledger**. Depois dela, continuar proibido usar o diretório raiz com `db push` até um plano separado resolver os timestamps divergentes e o restante do histórico local-only. O corte remoto precisa confirmar que 01434/01435 são versões ausentes; se qualquer uma aparecer como aplicada, interromper e auditar o estado real em vez de repeti-la.

### Gates antes de qualquer escrita remota

1. Antes de uma eventual escrita, obter uma leitura atual do ledger/schema/ACL do Supabase operacional e guardar o resultado sem segredos. A leitura antiga pertence ao projeto de produção e não substitui esse preflight. Se `migration list --linked` for usado, confirmar o ref `hkoxhourxwlddgsfdgws` antes de prosseguir.
2. Fazer preflight dos objetos e grants diretamente usados pelas duas migrations. Se houver coluna, função, trigger, tabela ou índice parcial/divergente, parar para comparar a definição, sem confiar em `IF NOT EXISTS`.
3. Confirmar que o DDL revisado das migrations 01434/01435 está idêntico aos arquivos locais e manter evidência/hashes do SQL que será executado. O `UPDATE` corretivo em `orders.version` só deve alcançar linhas nulas se uma coluna parcial já existir; isso precisa aparecer no plano de impacto.
4. Executar `npm run advisors` conforme a política do repositório e revisar o resultado. Os achados de segurança de `accounts_receivable`, `product_materials`, `order_fallback_telemetry` e `inventory_move_identity_audit` continuam em trilha separada; nenhum deve ser embutido nessas migrations.
5. Testar em banco isolado representativo com pré-condições correspondentes ao schema remoto. Os testes focused já passaram, mas não certificam a cadeia raiz: `schema.expected.json` segue `incomplete`, por isso não usar `test:migrations`/`db reset` como selo da cadeia completa.
6. Exigir backup/PITR verificável e autorização explícita antes de qualquer escrita remota. Se autorizada depois de novo preflight, aplicar 01434 antes de 01435; parar no primeiro erro; não rodar CCE, alteração de ACL da RPC antiga, migrations de segurança ou outra migration no mesmo lote.
7. Validar pós-aplicação as funções, grants, trigger, versão inicial/incremento, captura no snapshot, idempotência e rollback em conflito. Só então continuar com homologação SEFAZ; isso não libera produção.

Se não for possível obter ledger/schema atuais ou provar o conjunto exato que será aplicado, a ação segura é manter ambas as migrations locais. Não usar `migration repair`, `--include-all` no diretório completo ou SQL Editor como atalho.

## 12. Decisão operacional atual: Docker local e sem projeto HML

Esta decisão de 30/09/2026 substitui a recomendação anterior de criar/obter um destino Supabase HML para as migrations fiscais:

- Não criar branch persistente HML, segundo projeto ou infraestrutura adicional. `main` continua sendo a base operacional; testes técnicos de banco usam Supabase local/Docker quando disponível.
- O preflight local do Supabase confirmou o projeto local `morantehub`; o teste temporário de PostgreSQL aplicou 01434 seguida de 01435 e removeu o banco ao final. Nenhuma migration foi aplicada no Supabase remoto, nenhum dado operacional foi consultado e nenhuma transmissão SEFAZ foi feita nesta continuação.
- A emissão de documentos novos está fechada no backend enquanto não existir determinação aprovada. A consulta do pedido é somente-leitura; a sequência não é reservada, nenhuma tentativa/snapshot é persistida e a SEFAZ não é contatada enquanto o motor fiscal retornar bloqueio.
- Quando o Fiscal Core estiver aprovado, a homologação SEFAZ poderá usar o Supabase remoto operacional com pedido/cliente/produtos/pagamentos sintéticos, sem contaminar estoque, financeiro ou indicadores. O backend deverá impor `tpAmb=2`, escolher exclusivamente endpoint oficial de homologação e nunca permitir fallback para produção. Segredos ficam no backend. Qualquer DDL, mudança de RLS, reset, falha injetada ou teste destrutivo continua restrito ao Docker isolado.
- A liberação remota das migrations 01434/01435 continua pendente de uma operação seletiva com preflight atual, comparação final de hashes, backup/PITR e autorização explícita. Não executar `db push` geral nem `migration repair`.

| Atividade | Estado atual | Dependência |
| --- | --- | --- |
| Migrations 01434 + 01435 | Testadas em PostgreSQL temporário local | Preflight e autorização antes de qualquer escrita remota |
| Contrato de entrada da nova emissão | Backend aceita apenas `orderId`, ambiente e chave de solicitação | Persistência final de tentativa ainda será integrada após determinação |
| Modelo, tributos e pagamentos | Emissão bloqueia; não há regra presumida | Matriz aprovada pelo responsável fiscal |
| XML server-side / XSD / assinatura / SOAP | Infraestrutura de transmissão existente; nova emissão não alcança essas etapas | FiscalDocument resolvido e serializador backend |
| Homologação SEFAZ-PR 55/65 | Não iniciada nesta etapa | Matriz, dados sintéticos isolados, configuração e credenciais verificadas |
| Produção | Bloqueada | Todos os gates fiscais, técnicos e homologatórios |

## 13. Implementação técnica HML 55 (30/09/2026)

**Registro histórico:** a configuração CSOSN 102 e as pendências abaixo foram atualizadas na seção 14. Não usar os valores antigos como padrão atual de homologação.

- A regra `HML_TECHNICAL_V1` foi adicionada ao backend para **um único pedido sintético** `TEST_AUT_<uuid>`, também identificado em `order_data.testRunId` e `order_data.fiscalScenario`. Exige pedido `draft` com `deleted=true`, produto temporário sem `productId`, destinatário sintético, venda interna no PR, um item sem desconto/frete e PIX integral em `fiscalTestPayments`; `order_data.payments` deve estar vazio. Essa regra não é aprovação tributária de produção.
- O backend lê a decisão persistida `fiscal_decision_simples_nfe55_normal_sale_v1` e exige CRT 1, modelo 55, venda normal, PIS/COFINS CST 99 com base/alíquota/valor zero e `productionApproved=false`. O CFOP 5102, CSOSN 102, origem 0 e NCM 94036000 são **somente valores da fixture sintética HML**. Pedidos comuns não entram nessa regra. A tentativa em `tpAmb=1` retorna `PRODUCTION_FISCAL_RULESET_REQUIRED`.
- O novo caminho usa `prepare_nfe_fiscal_snapshot` para snapshot e numeração, Fiscal Core, serializer server-side, CSRT, assinatura A1, XSD completo pós-assinatura e endpoint exclusivo NF-e 55 de homologação SEFA/PR. A migration `20260930001436_nfe_hml_atomic_result.sql` acrescenta trilha/versionamento e RPCs para reservar XML assinado, persistir protocolo e itens numa transação, e reativar a **mesma chave** após consulta 217.
- Estados: antes do SOAP, o XML assinado fica persistido como `processando`; timeout vira `pendente`; autorização e itens são confirmados juntos; rejeição vira `erro`; retry primeiro consulta a chave. Se a consulta confirmar autorização, reconcilia a mesma nota. Só um 217 confirmado permite retransmitir o XML original. Uma resposta SEFAZ ou persistência incerta não abre nova numeração automaticamente.
- Efeitos obrigatórios por estado: `processando` consome uma reserva fiscal e guarda XML/decisão; `pendente` preserva essa reserva sem criar outra; `homologada` grava protocolo e linhas fiscais numa RPC; `erro` preserva XML, rejeição e número para auditoria. O fluxo HML não confirma estoque nem financeiro. Uma transição posterior de `pendente` para `homologada` apenas reconcilia a mesma chave; cancelamento/inutilização são fluxos separados e não são simulados aqui.
- Evidência local: Vitest focado do Fiscal Core/serializer, assinatura e XSD HML passou; TypeScript da API passou; testes focados de fronteira API/ERP passaram individualmente. A execução simultânea dos dois testes de fronteira excedeu o timeout de 5 segundos durante carga de módulos, e ambos passaram quando isolados.
- **Implantação pendente:** `npm run advisors` falhou com `ECONNREFUSED 127.0.0.1:54322`; o preflight local também não encontrou Docker ativo. A migration 01436 e a alteração da 01435 ainda não foram exercitadas em PostgreSQL nesta versão. Não foram aplicadas ao Supabase operacional, e não houve transmissão real à SEFAZ. O remoto segue sem 01434/01435/01436 segundo a última leitura do ledger. Para liberar a homologação real, primeiro iniciar Docker Desktop manualmente, executar advisors e teste de integração/concorrência no Supabase local, depois preflight seletivo do schema remoto e aplicação das migrations revisadas. Confirmar também A1/CSRT no backend e isolamento de estoque, financeiro e indicadores para o pedido sintético.
- Leitura remota somente-leitura em `hkoxhourxwlddgsfdgws`: a decisão fiscal 99/99 segue persistida e com `productionApproved=false`; não existem `nfe_fiscal_snapshots` nem as RPCs novas. O `orders` remoto tem triggers que atualizam métricas diárias, enfileiram resumo de entrega e inserem itens/pagamentos fallback. A fixture endurecida (`draft`, `deleted=true`, pagamentos operacionais vazios, item temporário) evita a inclusão nas métricas diárias e em `order_payments` pelo fallback observado, mas o trigger de resumo ainda é disparado em qualquer INSERT/UPDATE. Portanto **não houve criação de pedido sintético no remoto** e o isolamento completo para uma transmissão HML real permanece pendente de prova/correção.

## 14. CSOSN 103 e implantação seletiva de homologação (30/09/2026)

O usuário solicitou CSOSN 103 como padrão editável dos itens sem exceção e, posteriormente, autorizou explicitamente aplicar a estrutura fiscal, publicar o backend e executar os testes no Supabase remoto enquanto o Docker estivesse indisponível. Essa autorização atualiza, para esta tarefa, a restrição operacional anterior das seções 12–13; não libera a tributação em produção.

- Configuração autoritativa: `settings.id = nfe55_hml_csosn_defaults_v1`, CSOSN 103, modelo 55, `environment=2`, CRT 1 e `productionApproved=false`. Confirmada por releitura após gravação. O registro `app` e os demais padrões tributários não foram alterados. Configurações Fiscais lê/salva esse registro via API autenticada; somente administrador altera o padrão.
- Precedência: regra específica aplicável → escolha manual → código já salvo no item → cadastro do produto → padrão do backend. Conflito entre regra específica e escolha manual bloqueia a operação. O catálogo remoto persiste `products.fiscal`; `product_variations` não possui coluna fiscal. A preparação não consulta uma coluna inexistente nem inventa armazenamento alternativo.
- O modal recebe CSOSN do backend; escolhas manuais sobrevivem à recarga de ambiente e são enviadas como `itemCsosnOverrides`. O snapshot captura a configuração/versionamento e as escolhas na transação da numeração. Repetir uma solicitação com outra escolha falha. Uma tentativa com XML persistido reutiliza o documento original.
- `shared-utils/fiscalIcmsGroups.ts` centraliza apenas o mapeamento estrutural: 102/103/300/400 usam `ICMSSN102`, com origem preservada. Nenhum serializer escolhe o padrão. NCM, CFOP, PIS, COFINS e outros tributos não são redefinidos por essa política. Exceções 101/201/202/203/500/900 permanecem selecionadas, mas o cenário técnico bloqueia a transmissão enquanto seus grupos/regras específicos não estiverem implementados.
- O Fiscal Core valida CRT e regras antes do SOAP. HML continua restrita à fixture técnica de um item temporário, venda interna no PR e destinatário sintético; não é uma matriz fiscal genérica para pedidos comerciais. Produção continua bloqueada.
- Implantação no projeto confirmado `hkoxhourxwlddgsfdgws`: migrations locais 01434/01435/01436/01437 aplicadas em um único lote transacional, registrado pelo conector como `20260930172744_nfe_hml_csosn_snapshot_atomic_isolation`. Sem `db push` geral nem reparo artificial do ledger. A revisão monotônica, snapshots, leases e proteção dos efeitos sintéticos foram confirmados no catálogo remoto. Os timestamps locais e o lote remoto diferem; futuras implantações devem considerar essa correspondência explícita.
- `01437` evita refresh de métricas e enfileiramento de resumos de entrega para statements inteiramente sintéticos. Transições/misturas com pedidos operacionais mantêm o efeito original. A fixture usa `items=[]` na coluna comercial, conservando o item fiscal em `order_data.items`; isso evita fallback de itens/pagamentos comerciais. Estoque e financeiro continuam sem efeitos. A consulta HML utiliza o mesmo pipeline de lease e persistência da emissão.
- Advisors consultados antes/depois: nenhum novo erro de segurança nos objetos fiscais. O aviso informativo de RLS sem policies em `nfe_fiscal_snapshots` é intencional: navegador sem grants; acesso somente `service_role`. Permanecem alertas anteriores fora deste escopo, incluindo `accounts_receivable`, view definer e funções antigas com search_path mutável; não foram corrigidos automaticamente.
- Teste PostgreSQL remoto `TEST_AUT_deabec7d-1d0a-478d-ab1e-2b688fc72d11`: isolamento, snapshot/configuração/CSOSN, idempotência, rejeição de troca da escolha, exclusão mútua de lease ativo, dono incorreto, rollback da segunda linha inválida, autorização idempotente e imutabilidade passaram. Uma transação externa reverteu a massa: 0 pedidos, 0 snapshots e 0 documentos retidos; linhas fiscais revertidas junto com o documento. Nenhuma fila de entrega/métrica/estoque/financeiro alterada. Protocolo de teste não foi confirmado permanentemente nem transmitido à SEFAZ. Esse teste não prova corrida com duas sessões simultâneas.
- Testes automatizados focados: configuração/API, preenchimento e falha do modal, exceções/seleções explícitas, serializer e assinatura/XSD, recuperação após timeout, fronteira do serviço e consulta HML passaram. TypeScript da API passou; lint focado passou. A checagem geral do ERP apresenta centenas de diagnósticos anteriores fora desta tarefa; as ocorrências introduzidas nos testes fiscais foram corrigidas.
- Publicação: chave `SUPABASE_SERVICE_ROLE_KEY` cadastrada como segredo do backend na Vercel; aliases existentes de responsável técnico e CSRT por ambiente reaproveitados. Entradas em `erp/api/nfe` carregam bundles gerados a partir da implementação única da raiz. Build inclui dependências compartilhadas e XSDs. Versões de validação usam URL isolada e `--skip-domain`; certificado/senhas/CSRT não são expostos em logs.

- Complemento de evidência PostgreSQL anterior: `TEST_AUT_01185522-8e68-4212-9246-a5c3cb220002` validou a preservação do caminho operacional fora do predicado HML, dentro de subtransação revertida. `TEST_AUT_eb693593-0486-457e-b1b3-3e425b0b7c7a` validou quatro pares de chamadas simultâneas da RPC de lease, sempre com um vencedor. A massa própria sem XML/protocolo foi removida: nenhum pedido/documento/snapshot desses testes ficou retido; a sequência técnica 997 permanece em 1 e não foi reiniciada. Nenhuma dessas chamadas transmitiu NF-e. Não repetir esses testes no remoto; a política atual restringe a continuação à homologação fiscal sintética controlada.

## 15. Diagnóstico e correção do carregamento na Vercel (30/09/2026)

- Causa confirmada nos logs de `dpl_B2YUJsU2YUjGQGb6mcqijzfY4Jrg`: `/var/task/api/nfe/item-defaults.js` continha `import`, mas pertencia ao escopo CommonJS da raiz. O resultado foi `SyntaxError: Cannot use import statement outside a module`. A implementação de `@vercel/node` usa a configuração TypeScript da entrada para seu grafo de dependências; a entrada do ERP herdava `module=ESNext`.
- Correção limitada às rotas `emit`, `consult`, `item-defaults`: `erp/scripts/build-fiscal.cjs` agrupa suas fontes internas em `.cjs` explícitos, gerados em `erp/server/nfe`. Pacotes externos preservam os próprios metadados de módulos e recursos WASM. Os wrappers ESM carregam esses bundles com normalização do export padrão. Não há segunda implementação fiscal nem mudança do formato de todo o ERP.
- Novo teste `npm run test:fiscal-startup --prefix erp`: processo Node limpo, sem certificado/CSRT/chave service_role, transpila e carrega os wrappers com importação ESM nativa, executa os três handlers e confere resposta 405. Também carrega `libxml2-wasm` e resolve o schema oficial. Passou em Node 22.18.0 e Node 24.21.0; TypeScript dos wrappers e lint focado passaram. Esse teste integra `build:fiscal`, executado antes do Vite.
- O build `dpl_B57Yc2ZKWggtWKhadaWmEWU3nXYs` revelou que a exclusão `scripts/` retirava os scripts novos também dentro do ERP. Foram adicionadas exceções específicas no `.vercelignore`. `vercel deploy --dry --json` confirmou os dois arquivos antes da próxima publicação, `dpl_ByPmV8BipMCvJW8TKGMt1hh34gpx`.
- Cada publicação acima decorreu de uma causa nova identificada em logs. A prova local de inicialização não equivale a autorização fiscal; endpoint, XML assinado, transmissão, protocolo persistido e recuperação ainda devem ser comprovados na versão publicada.
- `dpl_ByPmV8BipMCvJW8TKGMt1hh34gpx` concluiu o build; os logs comprovam carregamento/execução dos três handlers e WASM/XSD no Node 24.21.0 remoto. Em sua URL isolada, leitura autenticada de `item-defaults` retornou HTTP 200/CSOSN 103/ambiente 2; `emit` e `consult` receberam comandos vazios e responderam HTTP 400 JSON. Não houve exceção de inicialização nesses endpoints.

A evidência da emissão SEFAZ real e a promoção do deployment serão registradas ao concluir a tentativa.

## 16. Mudança para pedido real em homologação (30/09/2026)

Instrução posterior do usuário abandona as fixtures comerciais fictícias para prova SEFAZ e exige o fluxo normal sobre pedido real, sem efeitos comerciais. Os testes automatizados existentes permanecem. A configuração HML e a correção de carregamento são reaproveitadas; a regra/RPC exclusivamente sintética não deve ser apresentada como implementação do fluxo normal. O roteiro que reunia os critérios de execução foi removido em 2026-10-03 para redefinição; este registro permanece histórico e não constitui plano de teste vigente.

## 17. Integridade do modal e primeira tentativa com venda real (30/09/2026)

- Contrato completo de NCM, CFOP, origem, CEST e CSOSN confirmado pelo funcionário, validado sem coerção no backend e preservado no snapshot. Divergência entre escolhas, determinação fiscal e XML assinado bloqueia o SOAP. Escolhas provisórias não atualizam produtos nem o pedido.
- Testes controlados verificam os campos individualmente e simultaneamente até o XML do transporte e a preservação ao fechar/reabrir o modal. Edição literal inválida no NCM é enviada à validação, sem conservar silenciosamente o valor anterior. As respostas simuladas permanecem restritas aos testes.
- A matriz `HML_NORMAL_SALE_V1` reutiliza o pipeline fiscal e exige venda real elegível, dados verdadeiros, CRT 1, ambiente 2, município PR verificado na fonte IBGE, campos confirmados e exceções compatíveis. Produção continua bloqueada. O lote remoto `20260930201939_nfe_modal_selections_and_real_order_hml` corresponde às migrations 01438/01439; não cria efeitos comerciais.
- O ID do token ativo informado pela usuária foi configurado como `02` no campo HML da Vercel. O readiness da publicação `dpl_EbhuwDff7QDzaDj9pvh7Ky9au5Vh` retorna `configurationIssues: []`. O segredo CSRT foi preservado.
- Playwright abriu o pedido real 3474 e acionou sua emissão pelo modal, mantendo produto de R$ 349,00 e frete de R$ 30,00, total R$ 379,00. Conferência positiva dos cinco campos entre formulário, payload, snapshot e XML persistido; assinatura verificada independentemente com o certificado público do próprio XML. A1 válido até 25/09/2027.
- Documento `a9c29dd4-be12-46c2-9a8b-3effd1852b09`, série 900, número 700, ambiente 2: transmissão sem resposta confirmada (`HML_TRANSMISSION_UNCERTAIN`), status pendente, sem protocolo. Consulta da mesma chave também inconclusiva. Nenhuma autorização real foi obtida; não retransmitir nem reservar outro número até reconciliação.
- Conteúdo/hashes de pedido, itens, pagamentos, movimentos de estoque vinculados, contas a receber e transações financeiras permaneceram iguais na tentativa e na consulta. Advisors não apresentaram novos alertas fiscais após as migrations.
- O catch de transporte ocultava a causa; foi adicionado diagnóstico com whitelist de códigos de rede/TLS/status HTTP, sem serializar erro Axios, request, XML, chave privada ou segredo. Os 28 testes focados de diagnóstico, transmissão e consulta passaram; TypeScript fiscal e lint focado passaram. A publicação de diagnóstico será consultada pela mesma chave.
- Falhas e concorrência das migrations novas ainda dependem de banco PostgreSQL isolado; não foram testadas destrutivamente no Supabase operacional. Testes com pedidos comerciais mais complexos aguardam a primeira autorização real.
