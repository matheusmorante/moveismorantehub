# Artefatos fiscais E2E no Supabase

**Regra vigente (12/10/2026):** o Supabase remoto operacional, na branch principal e schema `public`, é a única fonte de dados para cenários E2E fiscais. O runner seleciona artefatos já persistidos por `runId` UUID e UUID de pedido; não gera clientes, produtos, variações, pedidos, pagamentos ou devoluções a partir de presets estáticos no código-fonte.

## Leitura e validação

Antes de abrir o fluxo fiscal pela UI, o runner:

1. Confere project ref, Development, `environment=2` e produção desabilitada.
2. Consulta o readiness read-only; a chave de serviço serve somente para esse gate.
3. Autentica o operador configurado com o cliente Supabase e exige correspondência de identidade e `is_administrator()`.
4. Recupera o pedido por UUID e confere `is_test`, metadata canônica `order_data.testArtifact`, `runId` e owner igual a `auth.uid()`.
5. Lê cliente, produtos e variações vinculados e compara a identidade usando `test_artifact_row_data`; valida também itens, pagamentos e a relação produto-variação.
6. Bloqueia se faltar qualquer vínculo, se algum registro for de outra execução ou se houver documento/snapshot/tentativa fiscal anterior.

O resolvedor é somente leitura. Ele não completa nem corrige cadastros e não cria massa quando o cenário não existe. A interface usa o pedido exato selecionado e aplica as validações dos serviços/formulários reais.

## Provisionamento e testes unitários

Provisionar artefatos é uma operação separada, sujeita a autorização explícita para a escrita concreta, aos guards remotos, ownership, RLS/RPC, supressão de notificações e exclusão dos cinco destinos operacionais. Quando houver autorização, a criação deve usar os serviços e schemas dos formulários existentes no mesmo banco; não reintroduzir presets estáticos de entidades E2E.

Mocks e dados mínimos continuam válidos em testes unitários. Eles não são artefatos E2E e não podem ser descritos como prova de Supabase/PostgreSQL. O relatório histórico da auditoria das factories removidas está em [RELATORIO_AUDITORIA_ARTEFATOS_SINTETICOS_FISCAIS_HML.md](RELATORIO_AUDITORIA_ARTEFATOS_SINTETICOS_FISCAIS_HML.md).

## Situação desta alteração

O código local removeu as factories e presets estáticos de cenário e passou a exigir artefatos já persistidos. Nenhuma escrita, DDL, limpeza remota ou transmissão fiscal foi executada nesta tarefa. Os testes do resolvedor usam mocks; não provam a situação atual do Supabase nem uma emissão homologada.