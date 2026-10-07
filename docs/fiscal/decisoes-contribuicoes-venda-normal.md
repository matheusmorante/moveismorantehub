# PIS/COFINS na venda normal: decisões por modelo

Consulta e implementação: **07/10/2026**. Emitente cadastrado como CRT 1, UF PR.

## Decisão adotada

`decision_simples_nfe55_normal_sale_v1` continua restrita ao modelo 55. A NFC-e
usa o identificador próprio `decision_simples_nfce65_normal_sale_v1`. Os registros
correspondentes em `settings` têm o prefixo `fiscal_`.

O core pode calcular valores coincidentes com a mesma implementação, mas exige
uma decisão com `scope.model` igual ao modelo determinado para a operação. Não
aceita uma lista de modelos nem usa a decisão 55 como autorização para emitir 65.
Essa regra vale em Homologação e Produção.

## Auditoria de origem

| Dado | Origem encontrada | Conclusão |
|---|---|---|
| PIS/COFINS CST 99, base/alíquota/valor zero, modelo 55 | Decisão persistida, confirmada pelo operador em 30/09/2026, com URL do FAQ nacional | Tem origem fiscal identificada; não foi criado para fazer o teste HML passar |
| CRT 1 e UF PR | Cadastro `settings.app` | São fatos do emitente; não aprovam sozinhos todas as operações e todos os produtos |
| CFOP, CSOSN, NCM e origem | Seleção dos itens e cadastros próprios | Não fazem parte da decisão de PIS/COFINS; o core preserva as seleções confirmadas e valida o cenário suportado |
| CFOP 5102, CSOSN 102, NCM 94036000 e origem 0 da fixture técnica | `HML_TECHNICAL_V1` | Valores sintéticos não são promovidos a padrões de uma venda real |
| CSOSN 103 da configuração HML | Registro exclusivo de ambiente 2, com `productionApproved=false` | Não é fallback da regra comum nem padrão automático de Produção |
| Decisão própria de PIS/COFINS do modelo 65 | Não há registro em `settings` | A implementação não fabrica nem ativa esse registro |

O campo legado `productionApproved` da decisão de contribuições era metadado de
liberação. Ele não determina CST, alíquota ou modelo. A liberação operacional de
Produção continua na política da emissão, com flag, confirmação, reserva e
reconciliação próprias. A decisão 55 não foi regravada para alterar esse campo.

## Fontes oficiais consultadas

- [Portal Nacional — FAQ do Simples Nacional](https://www.nfe.fazenda.gov.br/Portal/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=S%2FEAGUrzRyk%3D): orientação de PIS/COFINS CST 99 com valores zerados. A abertura direta apresentou redirecionamento; o conteúdo foi recuperado pela busca indexada na própria fonte oficial.
- [Portal Nacional — Orientação de Preenchimento da NF-e v2.02, de 04/02/2015](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5W9aeeSeghM%3D), página 20/39: recomendações a ME/EPP optante pelo Simples Nacional, com PISOutr/COFINSOutr CST 99 e valores zerados. O exemplo XML usa quantidade; a explicação adjacente também apresenta a modalidade percentual com base, alíquota e valor zero. Conteúdo recuperado pela busca oficial após falha de abertura direta.
- [CONFAZ — MOC 7.0, Anexo I, revisão 7.03](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf): leiaute conjunto de NF-e/NFC-e, grupos Q/S para PIS/COFINS e N10d para CSOSN 102/103/300/400. O documento confirma os grupos XML; não decide o enquadramento concreto de cada mercadoria.
- [Paraná — Decreto 5.144/2024](https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=exibirImpressao&codAto=321819), tabela VI: CSOSN 103 representa isenção por faixa de receita bruta; não é código genérico de toda empresa do Simples.
- [SEFAZ/RJ — guia NFC-e, atualização indicada de 29/04/2025](https://portal.fazenda.rj.gov.br/dfe/wp-content/uploads/sites/17/2023/01/DF-e_NFC-e.pdf): o conteúdo oficial indexado também apresenta CST 99 zerado para NFC-e de optantes pelo Simples. A abertura direta foi bloqueada pela segurança do portal. É corroboração de outro estado; não foi usada como aprovação da operação da empresa no Paraná.

Consulta limitada à origem e ao isolamento das decisões de contribuições. Não
equivale a revisão integral das NTs/RTC vigentes ou mudança do pacote XSD fixado.

## NFC-e 65: decisão própria em análise

Identidade proposta: `decision_simples_nfce65_normal_sale_v1`.

| Propriedade | Estado da análise |
|---|---|
| Modelo | 65, exclusivamente |
| Emitente | CRT 1, PR |
| Operação candidata | Venda interna normal de mercadorias a consumidor final |
| Tratamento candidato | PIS/COFINS CST 99, base/alíquota/valor zero |
| Fundamento técnico | Os grupos correspondentes existem no leiaute da NFC-e; há orientação oficial compatível para o Simples |
| Aplicação concreta | Ainda não determinada de forma independente para as vendas 65 da empresa e eventuais regimes específicos das contribuições |
| Estado | **DRAFT; não persistida nem ativa** |

A lacuna é a abrangência fiscal real dessa operação, inclusive eventual incidência
monofásica ou substituição tributária de PIS/COFINS. Não se trata de exigir nova
evidência de homologação, novo plano ou outro checklist de go-live. Uma decisão
futura deverá declarar seu próprio escopo e sua origem; se coincidir com a 55,
compartilhará o cálculo sem compartilhar a identidade.

## Implementação e efeitos

- `normalSaleRuleSet.ts` contém a regra de negócio comum aos ambientes 1/2.
- `hmlNormalSaleRuleSet.ts` é o adaptador de compatibilidade de Homologação; a
  fixture técnica continua separada e exclusiva de ambiente 2.
- A leitura de preflight carrega as duas chaves de decisão. O snapshot canônico
  seleciona e trava a chave do modelo dentro da transação da reserva existente.
- Falta de decisão ou modelo incorreto bloqueia antes de reservar um novo número.
  Um snapshot já congelado com contribuição de outro modelo é rejeitado sem ser
  reescrito. XMLs e documentos históricos não foram migrados.
- A emissão normal de Produção está conectada à política comum de reserva,
  persistência e reconciliação, com flag e confirmação do ambiente no backend.
  A ausência da decisão própria 65 ainda bloqueia esse modelo antes de reserva.
  Ver [implementação e evidências](emissao-normal-reserva-reconciliacao.md).
- Esta alteração não cria efeitos de estoque, financeiro ou cancelamento.

## Banco e validação

### Conexão operacional implementada em 07/10/2026

A política técnica foi conectada ao mesmo pipeline nos ambientes 1 e 2:

| Etapa | Implementação atual | Garantia |
|---|---|---|
| Comando JSON | As seleções verificáveis são aceitas nos ambientes 1/2 | Autenticação, confirmação e flag produtiva preservadas no backend |
| Snapshot e número | `prepare_nfe_outbound_attempt` trava fatos e reserva por CNPJ/modelo/ambiente/série | Snapshot, documento, XML assinado e tentativa são gravados na mesma transação da numeração |
| Documento e tentativa | `NORMAL_SALE_V1` usa lease e intenção imutável nos dois ambientes | Retry idêntico recupera a tentativa; payload diferente com a mesma intenção é recusado |
| Chamada SEFAZ | Endpoints por modelo/ambiente centralizados; assinatura, XML/XSD e transporte reutilizáveis | Chamada após commit, sem transação SQL aberta durante SOAP |
| Resultado | `persist_nfe_outbound_result` grava protocolo, itens, histórico e status correspondente ao ambiente | Nenhuma autorização parcial; chave, ambiente e cStat conferidos dentro da RPC |
| Consulta/retry | `reconcileNormalSale` consulta a identidade reservada e reutiliza XML/numeração | Timeout não reenvia; primeiro 217 após incerteza apenas registra ausência; outra ação explícita consulta novamente |

Efeitos obrigatórios: a preparação grava número, snapshot, documento, XML e
tentativa na mesma transação; uma autorização confirmada grava protocolo,
itens e histórico fiscal na mesma transação. Uma resposta desconhecida mantém
tentativa pendente para consulta. A emissão não movimenta estoque, não cria
recebíveis e não altera o fato comercial. A reconciliação posterior deve completar
os fatos fiscais sem duplicá-los nem reenviar uma possível autorização.

As funções e documentos históricos HML foram preservados. A venda normal usa
RPCs comuns e infraestrutura fiscal compartilhada; não converte XML HML para
Produção nem reaproveita a fixture técnica como regra de negócio.

Projeto conferido: `hkoxhourxwlddgsfdgws`. Advisors executados antes da migration;
os alertas existentes não foram tratados como aprovação fiscal.

| Fonte versionada | Registro remoto pelo MCP |
|---|---|
| `20261007154819_fiscal_contribution_decisions_by_model.sql` | `20261007154819_fiscal_contribution_decisions_by_model` |
| `20261005181000_enable_pgtap_for_controlled_fiscal_tests.sql` | `20261007154823_enable_pgtap_for_controlled_fiscal_tests` |
| `20261007170426_common_outbound_emission.sql` | `20261007170426_common_outbound_emission` |
| `20261007171956_normal_outbound_write_guards.sql` | `20261007171956_normal_outbound_write_guards` |

A migration de seleção por modelo preservou `SECURITY DEFINER`, `search_path`
vazio e execução restrita ao backend. Não aplicou em lote migrations pendentes
de normalização de destinatário ou de numeração.

Validação anterior da extração da regra: **123 testes unitários em 8 arquivos** e **12 assertivas pgTAP**
no PostgreSQL remoto. A integração cobriu decisão ausente, modelo incorreto,
seleção independente 55/65, hash do snapshot, repetição idempotente e bloqueios de
ambiente/permissão. Fixtures `TEST_AUT_61a309ca-9505-4469-978d-940be46b1ebd`,
exclusivamente HML, foram revertidas pela transação: zero pedidos, snapshots ou
decisões de teste retidos. Não houve emissão nem chamada à SEFAZ.

Verificações estáticas: TypeScript estrito do grafo da regra comum, ESLint dos
três testes alterados e Biome dos 11 arquivos novos/extraídos passaram. O build
fiscal carregou e executou as 10 rotas no Node, além de resolver WASM e XSD oficial.
Esses resultados não validam emissão real de Produção.

A conexão operacional acrescentou **25 testes do orquestrador**, cobertura dos
consumidores/API e **35 assertivas pgTAP**, além de duas reservas PostgREST reais
concorrentes. Não houve emissão fiscal real. Camadas, fixtures e limites estão no
[registro técnico da conexão](emissao-normal-reserva-reconciliacao.md).
