# Auditoria da stack fiscal de saída — NF-e 55 / NFC-e 65

**Data:** 2026-09-29. **Método:** inspeção estática dos manifests/lockfiles, rotas, testes, migrations, skills e documentação; consulta ao portal nacional e à SEFA/PR; conferência em memória do ZIP XSD oficial por SHA-256. Não houve instalação, migration, escrita remota, transmissão SEFAZ ou teste de homologação nesta auditoria. O repositório já tinha muitas alterações locais em andamento; não atribuir seus resultados a um deploy.

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

- `AGENTS.md` roteia tarefas fiscais para `nfe-sefaz-direto` e `fiscal-nfe-nfce-official-docs`; a regra 17 de `.agents/rules/principios-inviolaveis.md` exige fonte oficial vigente.
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
| XSD | **Já existe, mas está mal integrado** | `libxml2-wasm` 0.7.2; pacote `PL_010f_v1.04`; `transmit-operation-draft.ts` valida antes/depois de assinar. `emit.ts` não chama o validador. Corrigir essa lacuna antes de transmitir neste caminho. |
| Golden Files fiscais | **Não existem e são necessários** | Há testes unitários/XML, mas não identifiquei conjunto fiscal versionado `input/expected.xml/expected-calculations`. Prioridade alta: criar fixtures com proveniência oficial/homologação ou dados sanitizados validados, comparação semântica e revisão humana de mudanças. Não inventar XML esperado. |
| CALM | **Configurado, ferramenta indisponível nesta sessão** | `.codex/config.toml` aponta índice local; MCP CALM não apareceu entre ferramentas acessíveis. Não é bloqueio do emissor. |

Há duplicidade de versões Zod e xmldom entre workspaces, mas não foi demonstrado conflito de runtime. O repositório não contém `.github/workflows` nesta inspeção; CI fiscal não foi comprovado.

## 6–7. Problemas e riscos observados

1. **P0 — caminho principal sem XSD:** `api/nfe/emit.ts` assina e transmite sem `validateNfeAgainstOfficialSchema`; o validador e o XSD já existem. A exceção por caminho impede declarar o gate estrutural cumprido.
2. **P0 — homologação incompleta:** o roadmap mantém a matriz real NF-e/NFC-e, falha após autorização, timeout, reconciliação e concorrência como evidências pendentes. Testes com mocks não provam SEFAZ.
3. **P0 — permissão/segurança do fluxo:** `emit.ts` já chama `authorizeFiscalOperator`; o risco de falta desse gate descrito em `docs/fiscal/diff-declarativo-schema-nfe.md` é um snapshot anterior e não descreve esse trecho atual. Migrations antigas tinham leitura ampla e posteriores endurecem parte das ACLs. O estado remoto atual de todas as policies/grants não foi auditado nesta tarefa.
4. **P1 — fronteira fiscal:** geração XML no ERP e template strings para envelopes/eventos exigem revisão de escape, inputs e fronteira de segredos. Zod está instalado mas sem uso identificado nas rotas fiscais.
5. **P1 — pós-autorização:** `emit.ts` atualiza documento e depois faz upsert dos itens em chamada separada. O código marca `reconciliationRequired` se falhar; é necessário provar recuperação e não duplicação com banco real. O retorno contém XML assinado/resposta SEFAZ, portanto o contrato de acesso e dados pessoais precisa de revisão.
6. **P1 — documentação da API e telemetria:** OpenAPI fiscal e spans de etapas não foram encontrados; o endpoint MCP OpenAPI não cobre o emissor.

## 8–9. Fonte oficial e XSD identificado

- [Portal Nacional — esquemas XML](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D): em 2026-09-29 listava **pacote 010f** nas “VERSÕES OFICIAIS (em uso)”, associado a NT 2025.002 v1.50 e NT 2026.007 v1.00, publicado em 31/08/2026. O ZIP oficial indicado em `api/nfe/schemas/README.md` retornou SHA-256 `B8589490A58A09A993A80E6AC4D7ED10F20892061ECFC56719337098D4B95998`; os cinco XSD locais coincidem byte a byte com os cinco do ZIP. A denominação local `PL_010f_v1.04` é a do repositório; a página lista “010f”, não essa subversão no título.
- [Portal Nacional — NTs](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=6WfrpZYE4Ik%3D): em 2026-09-29 listava NT 2025.002 v1.51 e NT 2026.007 v1.00. A diferença entre NT v1.50 no título do ZIP e v1.51 na lista exige análise de conteúdo/vigência por operação; não foi resolvida aqui.
- [Portal Nacional — manuais](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=ndIjl%2BiEFdE%3D): índice acessível; MOC/Anexo I não foram lidos integralmente nesta tarefa. Não atribuir conformidade tributária ou de leiaute a esta auditoria.
- [SEFA/PR — serviços NF-e 4.00](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400): conferidos endpoints de autorização, consulta, inutilização, `StatusServico` e eventos em homologação/produção. Nenhuma chamada real foi feita.

## 10–13. Lacunas, dependências e arquitetura proposta

**Instalar agora:** nenhuma dependência. XSD, XMLDSig, SOAP, Zod e infraestrutura de testes já existem. **Não instalar agora:** segunda biblioteca XML/SOAP, segundo tracer, XState, Bruno CLI ou outro validador XSD. A necessidade de cada um depende de POC ou lacuna que não possa ser coberta pela stack atual.

Contratos JSON Web/Mobile → Fiscal API devem ser validados no backend; Fiscal Core no servidor deve possuir snapshot, validação de regras, XML builder, XSD, CSRT/RespTec se aplicável, assinatura, cliente SEFAZ e persistência/reconciliação. PostgreSQL garante atomicidade local; a chamada SEFAZ ocorre fora da transação e estados incertos ficam recuperáveis. `StatusServico` com A1/mTLS/SOAP em homologação é marco de interoperabilidade antes de ampliar o fluxo. Supabase Edge só pode substituir Node após POC explícita de PFX/P12, mTLS, XMLDSig, XSD, SOAP e timeout; a implementação atual já usa Node.

## 14. Plano incremental

1. Fechar gate XSD em **todos** os caminhos (`emit.ts` inclusive), com teste focado e compatibilidade do pacote 010f/NTs aplicáveis. Em `emit.ts`, validar a entrada antes de reservar; validar o assinado antes de transmitir; tratar retransmissão 217 com o schema aplicável à tentativa original. O erro de validação não pode deixar reserva ativa nem expor XML/PII nos logs.
2. Formalizar contrato JSON com Zod e OpenAPI para as rotas reais, sem expor segredo ou dados fiscais além do necessário. Inventariar transições e limpar divergências de estado.
3. Criar Golden Files com proveniência e testes de XML/cálculo/assinatura; acrescentar pgTAP e teste de duas conexões para reserva/idempotência/RLS.
4. Integrar telemetria fiscal sanitizada e provar recuperação após falha de persistência, restart e timeout. Confirmar ACLs remotas contra schema esperado antes de qualquer migration.
5. Executar `StatusServico` e depois matriz restrita em homologação SEFAZ/PR: autorização, consulta, rejeição, evento, timeout controlado e persistência. Inutilização/contingência são fluxos separados.
6. Revisar DANFE, tributação/NTs, ambiente e evidências com responsável fiscal; só então avaliar gate de produção. Não ligar produção como atalho para completar testes.

## 15. Matriz de testes proporcional ao risco

| Camada | Evidência requerida | Estado nesta auditoria |
|---|---|---|
| Vitest | Chave, cálculo, XML, parser, transições e Golden Files. | Testes fiscais focados existem; Golden Files ausentes. |
| XML/XSD/assinatura | XML gerado/assinado aceito pelo pacote aplicável; assinatura verificável. | Validador integrado apenas a parte dos fluxos. |
| PostgreSQL/pgTAP | RPCs, RLS, constraints, rollback e duas sessões concorrentes. | Infraestrutura existe; prova fiscal completa pendente. |
| API interna | Contratos, autenticação, retry/idempotência e erros; Bruno opcional. | Testes endpoint mockados; contrato OpenAPI fiscal ausente. |
| Playwright | Jornada afetada no ERP, duplo clique, refresh, estados e ações posteriores. | Specs fiscais de saída não identificados. |
| SEFAZ homologação | A1/mTLS, StatusServico, autorização, consulta, rejeição, eventos e reconciliação. | Não executado nesta tarefa; matriz P0 pendente no roadmap. |

## 16. Bloqueadores de produção

XSD não aplicado a todo caminho transmissor; matriz SEFAZ/PR não comprovada; regras NT/tributação não revisadas por operação; ACLs remotas e acesso fiscal de todos os endpoints não auditados nesta tarefa; falha pós-autorização e concorrência real sem prova integral; contrato de resposta/logs com XML sensível não revisto. Nenhuma destas lacunas pode ser marcada “conforme” apenas por teste unitário ou pela presença de biblioteca no lockfile.

## Mudanças desta tarefa e limites

Foram alterados somente governança e documentação: skill fiscal, índice oficial, auditoria documental e estes dois documentos. **Dependências adicionadas/removidas:** nenhuma. **Migrations:** nenhuma. **Testes de código executados:** nenhum, pois não houve mudança de runtime. **Comunicação real de homologação:** não realizada. A validação realizada foi a conferência da fonte oficial e dos hashes XSD; ela não prova conformidade de XML emitido nem autorização fiscal. A correção de `emit.ts` foi mantida como trabalho P0 separado porque a validação precisa respeitar reserva de número, estado de erro e retransmissão 217 com schema da tentativa original; uma chamada isolada ao validador após a reserva poderia deixar tentativa inconsistente.
