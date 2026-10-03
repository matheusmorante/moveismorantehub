# Auditoria da stack fiscal de saída — NF-e 55 / NFC-e 65

> **Registro histórico:** esta auditoria foi escrita em 2026-09-29. As recomendações de testes fiscais em homologação descritas nela foram removidas em 2026-10-03 para redefinição; este documento não é um roteiro vigente.

**Data:** 2026-09-29. **Método:** inspeção estática dos manifests/lockfiles, rotas, testes, migrations, skills e documentação; consulta ao portal nacional e à SEFA/PR; conferência em memória do ZIP XSD oficial por SHA-256. Não houve instalação, migration, escrita remota, transmissão SEFAZ ou teste de homologação nesta auditoria. O repositório já tinha muitas alterações locais em andamento; não atribuir seus resultados a um deploy.

## Atualização da auditoria — prontidão da emissão (2026-09-29)

Esta seção atualiza os achados de emissão após a inclusão do gate XSD e de proteções técnicas nos transmissores. O pacote oficial PL_010f_v1.04 foi conferido por SHA-256 e os cinco XSDs locais correspondem ao ZIP publicado no [Portal Nacional](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D). Os dois caminhos NF-e revisados (`api/nfe/emit.ts` e `api/nfe/transmit-operation-draft.ts`) validam o XML antes e depois da assinatura. Também foram adicionadas verificações server-side de CSRT, `cMunFG` e timestamp no fluxo normal. Essas alterações estão apenas no checkout: não houve testes de runtime nem prova em homologação. XSD e verificações estáticas não certificam regras tributárias nem autorizam Produção.

### Bloqueadores de emissão em produção encontrados por inspeção estática

| Prioridade | Achado | Evidência e trabalho necessário |
|---|---|---|
| P0 | XML comercial não representa uma apuração fiscal completa | `xmlItemsBlock.ts` escolhe CSOSN/CST e origem com defaults, emite PIS/COFINS CST 49 e valores zerados; `xmlTotalsBlock.ts` zera os totais de ICMS e usa só o primeiro meio de pagamento, atribuindo a ele todo `vNF`. XSD aceita estrutura, não correção fiscal. Implementar cálculo/classificação por regime, produto, operação e benefício fiscal; reconciliar soma por item, totais, frete/desconto, pagamentos e snapshot do pedido com contador responsável. Até lá, bloquear produção. |
| P0 | Autoridade temporal e município do fato gerador ainda dependem do XML cliente no fluxo comum | O erro de offset foi corrigido: `reserve-number` fornece um instante do servidor e a chave (`AAMM`) e `dhEmi` derivam dele com fuso `America/Sao_Paulo`. A API exige sete dígitos em `companyCMun` e compara o `cMunFG` recebido; o caminho de operação revisada usa o município persistido. Como o XML comum ainda é montado no navegador, a API não reconstrói o documento a partir do pedido nem controla integralmente o instante enviado. |
| P0 | Modelo 55/65 escolhido apenas por retirada | `nfeService.ts` escolhe NFC-e se `deliveryMethod === 'pickup'`, caso contrário NF-e. Isso não prova elegibilidade fiscal do destinatário/operação, presença, UF/local de entrega ou regras da NFC-e. Definir matriz de decisão aprovada pelo fiscal e validar no servidor. |
| P0 | Payload fiscal é montado no cliente | O ERP monta XML e envia à API; a API valida envelope/chave/schema, assina e transmite. Não foi encontrada recomposição integral do XML a partir de pedido e cadastro fiscal persistidos. Mover cálculo, snapshot e builder fiscal para o backend e impedir que um cliente com papel fiscal escolha livremente impostos/valores. |
| P0 | Homologação oficial ainda não comprovada | Nenhuma emissão/consulta/evento real em homologação foi executada nesta auditoria. Preencher e revisar a matriz P0 do roadmap com evidência de XML enviado, retorno, protocolo, banco e interface para 55 e 65, incluindo rejeição e timeout/reconciliação. |
| P0 operacional | Credenciamento e configuração real não verificados | Confirmar certificado A1 válido/identidade, credenciamento por modelo e ambiente, CSC/IdToken por ambiente para NFC-e, séries/faixas, IE/CRT/endereço, DNS/certificados e variáveis protegidas do servidor. As duas rotas NF-e agora exigem `NFE_RESP_TECH_*` e `NFE_CSRT_*` válidos para novas emissões; os valores não foram lidos nem configurados nesta tarefa. A [SEFA/PR exige credenciamento para NFC-e](https://sped.fazenda.pr.gov.br/NFCe/Pagina/Credenciamento-de-empresas-emissor-de-NFC-e) e cadastra CSC por ambiente; nenhum segredo foi lido nesta auditoria. |

### Antes da primeira produção

1. Implementar a determinação/cálculo fiscal server-side e obter aprovação do responsável contábil para casos reais representativos (CRT, CFOP dentro/fora do estado, descontos, frete, pagamentos mistos e benefícios `cBenef` quando aplicável). A correção técnica de data, município e CSRT não resolve este bloqueador.
2. Executar matriz de homologação real dos modelos habilitados; provar assinatura A1/mTLS, autorização, consulta, rejeição, cancelamento/CC-e aplicáveis e reconciliação sem duplicidade.
3. Rodar testes de integração no banco real de teste para migrations completas, RLS/ACL, reserva concorrente, retries e rollback; testes unitários/mock não provam isso.
4. Verificar configuração/credenciamento de cada ambiente e modelo sem expor certificado/CSC; fazer liberação de produção controlada após aceite fiscal formal.

### Completude funcional ainda pendente

- Inutilização de numeração: não localizada rota/serviço `inutNFe`.
- Status do serviço: não localizado fluxo `NFeStatusServico4`.
- NFC-e offline e NF-e em contingência: não implementadas; manter indisponíveis até fluxo, persistência e transmissão posterior serem auditados.
- Cobertura estrutural do emissor: manter testes de regressão para data/fuso, chave, arredondamento, pagamentos múltiplos, tributação, QR Code por CSC/ambiente e XSD oficial. As alterações de runtime desta rodada não foram executadas em testes; o binário Vitest não está instalado/disponível neste checkout.

**Conclusão:** o gate XSD e as correções técnicas de timestamp, município e CSRT estão no código dos dois transmissores NF-e, ainda sem teste de runtime ou homologação. O módulo permanece inapto para produção: cálculo tributário genérico, construção fiscal no navegador e ausência de evidência de homologação/credenciamento continuam bloqueadores.

## 1. Arquitetura encontrada

```text
ERP Web (React) ─HTTPS/JSON─> api/nfe/* (Node/serverless) ─SOAP 1.2 + mTLS─> SEFAZ/PR
       │                         │
       ├─ nfeXmlBuilder / revisão│─ nfeSigner (xml-crypto)
       └─ fluxos de pedido       │─ schemaValidator (libxml2-wasm; uso parcial)
                                 └─ Supabase PostgreSQL (documentos, sequências, eventos, rascunhos)
Mobile: não foi identificada uma jornada completa de emissão fiscal nesta inspeção.
```

O XML fiscal ainda é parcialmente construído em `erp/src/pages/utils/nfe/`, consumido pelo backend. Isso fragiliza a fronteira desejada de Fiscal Core inteiramente no servidor. O backend guarda A1 em variáveis de ambiente e faz a assinatura/mTLS; não foi comprovada aqui a segurança de todo o contrato de resposta ou dos logs. Existe também `api/nfe/standaloneServer.ts` para ponte Node de distribuição DF-e; ele não substitui a API de emissão nem prova aptidão de Supabase Edge Functions.

## 2. Skills e regras existentes

- Na data desta auditoria, `AGENTS.md` roteava tarefas fiscais para as skills `nfe-sefaz-direto` e `fiscal-nfe-nfce-official-docs`. Ambas foram removidas em 2026-10-03 a pedido da usuária. A regra atual de fontes oficiais está em `.agents/rules/principios-inviolaveis.md`.
- A skill fiscal foi ampliada nesta tarefa com auditoria antes de instalar, fronteiras, reconciliação e Golden Files. Os critérios FISCAL-001..018 ficam em [invariantes-arquiteturais.md](invariantes-arquiteturais.md), sem duplicá-los na regra global.
- `docs/fiscal/manuais/README.md` é índice de links oficiais; PDFs antigos não devem ser fonte normativa permanente.

## 3–5. Ferramentas, versões, integração e duplicações

As versões abaixo são as resolvidas nos lockfiles inspecionados; não indicam atualização recomendada sem avaliação específica.

| Ferramenta | Estado | Evidência e decisão |
|---|---|---|
| Zod | **Já existe, mas está mal integrado ao fiscal** | Raiz 4.5.4, ERP 4.6.5, Mobile 3.25.76 (transitiva). Não encontrei schemas Zod nas rotas `api/nfe/*`; reutilizar Zod da raiz para contratos JSON antes de adicionar pacote. As versões diferentes por workspace precisam de compatibilidade no contrato compartilhado, não de reinstalação automática. |
| OpenAPI | **Já existe, mas não cobre o fiscal** | OpenAPI 3.1 para MCP em `api/mcp.ts` e `src/mcp/server.ts`; `swagger.json` na raiz tem 0 bytes. Não há contrato OpenAPI fiscal utilizável. Expandir o padrão adequado às rotas reais `/api/nfe/*`, sem confundir com WSDL da SEFAZ. |
| Vitest | **Já existe e está adequado** | ERP 2.1.9; testes focados em `erp/src/pages/utils/nfe/__tests__/`. Reutilizar para regras puras e Golden Files. |
| Playwright | **Já existe, cobertura fiscal pendente** | ERP e Mobile 1.63.0; suíte web existente, mas nenhum spec fiscal de saída identificado no inventário direcionado. Usar só para jornada afetada após testes mais baratos. |
| Bruno | **Não existe; opcional nesta fase** | Nenhum `.bru`, `bruno.json` ou CLI encontrado. Uma coleção sanitizada poderá documentar/testar API interna após contrato estável; não instalar agora. |
| pgTAP | **Já existe, mas não cobre o fiscal** | Uso em `supabase/tests/catalog_product_search.test.sql`. Criar testes fiscais SQL focados em RPC, RLS, unicidade e estados; duas sessões PostgreSQL reais para concorrência. |
| OpenTelemetry | **Já existe, mas está parcialmente integrado** | `@opentelemetry/api` 1.9.1; `src/telemetry/tracer.ts` define `fiscal.nfe.emit`, mas não foi localizado uso nas rotas `api/nfe/*`. Integrar à stack existente com sanitização LGPD, sem segundo tracer. |
| XState | **Não existe; opcional** | Há estados persistidos em banco e transições espalhadas por endpoints, sem máquina formal única encontrada. Primeiro mapear transições e provar que biblioteca acrescentaria segurança; não instalar por padrão. |
| XML parser/builder | **Já existe, com separação incompleta** | `@xmldom/xmldom` raiz 0.8.15 / ERP 0.9.12; builders em `erp/src/pages/utils/nfe/`, envelopes também por template string em API. Revisar escape, validação e convergir gradualmente para core servidor. Duas versões merecem avaliação, sem mudança automática. |
| XMLDSig/A1 | **Já existe, precisa prova de interoperabilidade** | `xml-crypto` 6.1.2, `api/nfe/nfeSigner.ts`; certificado extraído no backend. Teste local de assinatura e homologação real seguem necessários. |
| SOAP/WSDL | **Já existe, cobertura parcial** | `api/nfe/sefazClient.ts` usa axios/HTTPS mTLS e envelope SOAP 1.2. Endpoints chamam autorização, consulta e eventos; não localizei função `StatusServico` nem inutilização em `api/nfe/`. Nova biblioteca SOAP não se justifica agora. |
| XSD | **Integrado nos dois caminhos NF-e revisados; falta executar** | `libxml2-wasm` 0.7.2; pacote `PL_010f_v1.04`; `emit.ts` e `transmit-operation-draft.ts` validam XML novo antes e depois de assinar, e validam retries persistidos antes de reativar. Testes de runtime e homologação seguem pendentes. |
| Golden Files fiscais | **Não existem e são necessários** | Há testes unitários/XML, mas não identifiquei conjunto fiscal versionado `input/expected.xml/expected-calculations`. Prioridade alta: criar fixtures com proveniência oficial/homologação ou dados sanitizados validados, comparação semântica e revisão humana de mudanças. Não inventar XML esperado. |
| CALM | **Configurado, ferramenta indisponível nesta sessão** | `.codex/config.toml` aponta índice local; MCP CALM não apareceu entre ferramentas acessíveis. Não é bloqueio do emissor. |

Há duplicidade de versões Zod e xmldom entre workspaces, mas não foi demonstrado conflito de runtime. O repositório não contém `.github/workflows` nesta inspeção; CI fiscal não foi comprovado.

## 6–7. Problemas e riscos observados

1. **P0 — autoridade e conteúdo fiscal:** `api/nfe/emit.ts` ainda aceita XML montado pelo navegador. O XSD integrado barra XML estruturalmente inválido, mas não substitui snapshot confiável nem determinação tributária server-side.
2. **P0 — homologação incompleta:** o roadmap mantém a matriz real NF-e/NFC-e, falha após autorização, timeout, reconciliação e concorrência como evidências pendentes. Testes com mocks não provam SEFAZ.
3. **P0 — permissão/segurança do fluxo:** `emit.ts` já chama `authorizeFiscalOperator`; o risco de falta desse gate descrito em `docs/fiscal/diff-declarativo-schema-nfe.md` é um snapshot anterior e não descreve esse trecho atual. Migrations antigas tinham leitura ampla e posteriores endurecem parte das ACLs. O estado remoto atual de todas as policies/grants não foi auditado nesta tarefa.
4. **P1 — fronteira fiscal:** geração XML no ERP e template strings para envelopes/eventos exigem revisão de escape, inputs e fronteira de segredos. Zod está instalado mas sem uso identificado nas rotas fiscais.
5. **P1 — pós-autorização:** `emit.ts` atualiza documento e depois faz upsert dos itens em chamada separada. O código marca `reconciliationRequired` se falhar; é necessário provar recuperação e não duplicação com banco real. O retorno contém XML assinado/resposta SEFAZ, portanto o contrato de acesso e dados pessoais precisa de revisão.
6. **P1 — documentação da API e telemetria:** OpenAPI fiscal e spans de etapas não foram encontrados; o endpoint MCP OpenAPI não cobre o emissor.

## 8–9. Fonte oficial e XSD identificado

- [Portal Nacional — esquemas XML](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D): em 2026-09-29, a leitura integral da listagem mostrou **pacote 010f** em “VERSÕES OFICIAIS (em uso)”, associado às NT 2025.002 v1.50 e 2026.007 v1.00, publicado em 31/08/2026. A entrada 010e_v1.02 também aparece na página, mas é anterior. O ZIP 010f oficial retorna SHA-256 `B8589490A58A09A993A80E6AC4D7ED10F20892061ECFC56719337098D4B95998`. A comparação integral refeita nesta entrega encontrou três XSDs locais divergentes apesar do hash do ZIP já registrado; eles foram substituídos pelos originais do pacote e os cinco hashes individuais agora constam em `api/nfe/schemas/README.md`. O caminho do validador permanece `PL_010f_v1.04`; a denominação local da subversão não aparece no título da listagem oficial.
- [Portal Nacional — NTs](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=6WfrpZYE4Ik%3D): em 2026-09-29 listava NT 2025.002 v1.51 e NT 2026.007 v1.00. A diferença entre NT v1.50 no título do ZIP e v1.51 na lista exige análise de conteúdo/vigência por operação; não foi resolvida aqui.
- [Portal Nacional — manuais](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=ndIjl%2BiEFdE%3D): índice acessível; MOC/Anexo I não foram lidos integralmente nesta tarefa. Não atribuir conformidade tributária ou de leiaute a esta auditoria.
- [SEFA/PR — serviços NF-e 4.00](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400): conferidos endpoints de autorização, consulta, inutilização, `StatusServico` e eventos em homologação/produção. Nenhuma chamada real foi feita.

## 10–13. Lacunas, dependências e arquitetura proposta

**Instalar agora:** nenhuma dependência. XSD, XMLDSig, SOAP, Zod e infraestrutura de testes já existem. **Não instalar agora:** segunda biblioteca XML/SOAP, segundo tracer, XState, Bruno CLI ou outro validador XSD. A necessidade de cada um depende de POC ou lacuna que não possa ser coberta pela stack atual.

Contratos JSON Web/Mobile → Fiscal API devem ser validados no backend; Fiscal Core no servidor deve possuir snapshot, validação de regras, XML builder, XSD, CSRT/RespTec se aplicável, assinatura, cliente SEFAZ e persistência/reconciliação. PostgreSQL garante atomicidade local; a chamada SEFAZ ocorre fora da transação e estados incertos ficam recuperáveis. `StatusServico` com A1/mTLS/SOAP em homologação é marco de interoperabilidade antes de ampliar o fluxo. Supabase Edge só pode substituir Node após POC explícita de PFX/P12, mTLS, XMLDSig, XSD, SOAP e timeout; a implementação atual já usa Node.

## 14. Plano incremental

1. Gate XSD aplicado aos dois caminhos NF-e revisados. Executar a validação focada e confirmar compatibilidade do pacote 010f/NTs aplicáveis; conferir que erros após reserva sejam reconciliáveis e que logs não exponham XML/PII.
2. Formalizar contrato JSON com Zod e OpenAPI para as rotas reais, sem expor segredo ou dados fiscais além do necessário. Inventariar transições e limpar divergências de estado.
3. Criar Golden Files com proveniência e testes de XML/cálculo/assinatura; acrescentar pgTAP e teste de duas conexões para reserva/idempotência/RLS.
4. Integrar telemetria fiscal sanitizada e provar recuperação após falha de persistência, restart e timeout. Confirmar ACLs remotas contra schema esperado antes de qualquer migration.
5. Executar `StatusServico` e depois matriz restrita em homologação SEFAZ/PR: autorização, consulta, rejeição, evento, timeout controlado e persistência. Inutilização/contingência são fluxos separados.
6. Revisar DANFE, tributação/NTs, ambiente e evidências com responsável fiscal; só então avaliar gate de produção. Não ligar produção como atalho para completar testes.

## 15. Matriz de testes proporcional ao risco

| Camada | Evidência requerida | Estado nesta auditoria |
|---|---|---|
| Vitest | Chave, cálculo, XML, parser, transições e Golden Files. | Testes fiscais focados existem; Golden Files ausentes. |
| XML/XSD/assinatura | XML gerado/assinado aceito pelo pacote aplicável; assinatura verificável. | Gate XSD integrado em dois caminhos NF-e; execução dos testes e assinatura verificável continuam pendentes. |
| PostgreSQL/pgTAP | RPCs, RLS, constraints, rollback e duas sessões concorrentes. | Infraestrutura existe; prova fiscal completa pendente. |
| API interna | Contratos, autenticação, retry/idempotência e erros; Bruno opcional. | Testes endpoint mockados; contrato OpenAPI fiscal ausente. |
| Playwright | Jornada afetada no ERP, duplo clique, refresh, estados e ações posteriores. | Specs fiscais de saída não identificados. |
| SEFAZ homologação | A1/mTLS, StatusServico, autorização, consulta, rejeição, eventos e reconciliação. | Não executado nesta tarefa; matriz P0 pendente no roadmap. |

## 16. Bloqueadores de produção

Matriz SEFAZ/PR não comprovada; regras NT/tributação não revisadas por operação; XML comercial ainda montado pelo cliente; ACLs remotas e acesso fiscal de todos os endpoints não auditados nesta tarefa; falha pós-autorização e concorrência real sem prova integral; configuração de CSRT/CSC/credenciamento não verificada; contrato de resposta/logs com XML sensível não revisto. Nenhuma destas lacunas pode ser marcada “conforme” apenas pela presença de biblioteca no lockfile.

## Mudanças desta tarefa e limites

Nesta rodada foram alterados os dois transmissores NF-e, reserva de número, builder do ERP, fixtures existentes e esta auditoria; outras mudanças já estavam pendentes no checkout. **Dependências adicionadas/removidas:** nenhuma. **Migrations:** nenhuma. **Testes de código executados:** nenhum, conforme o escopo desta rodada. **Comunicação real de homologação:** não realizada. `git diff --check` passou. A conferência de fontes oficiais/XSD e as verificações implementadas não provam autorização fiscal, adequação tributária ou prontidão de Produção.
