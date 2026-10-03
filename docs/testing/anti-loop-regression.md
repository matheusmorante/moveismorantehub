# Cenário de regressão para retomada por gates

Este cenário valida a continuidade de um E2E fiscal HML após bloqueios de infraestrutura. Use um `testRunId` isolado, não use credenciais de Produção e não transmita antes de todos os gates de readiness passarem.

## Estado inicial aprovado

| Gate | Estado | Evidência mínima |
|---|---|---|
| Migration necessária | `APROVADO` | Migration corrigida, validada e aplicada no alvo correto |
| RPC | `APROVADO` | RPC disponível e contrato confirmado |
| Ambiente fiscal | `APROVADO` | `tpAmb=2`, endpoint e credenciais de homologação |
| RLS/Advisors/schema | `APROVADO` | Evidência ainda válida para o mesmo código, banco e configuração |
| Pedido e isolamento | `APROVADO` | Massa sintética própria, sem efeitos operacionais fora do escopo |

## Sequência

1. Iniciar o E2E e encontrar certificado ausente no Preview. Marcar somente `certificado` como `BLOQUEADO`. Consultar a tentativa para saber se houve reserva ou persistência. Se não houver snapshot, documento, transmissão, chave, protocolo nem reserva, manter os gates anteriores `APROVADO` e permitir nova intenção após a correção; se houver efeito ou estado ambíguo, reconciliar/reutilizar a tentativa existente sem retransmitir.
2. Configurar/resolver o certificado no ambiente Preview autorizado. Reimplantar Preview se a alteração exigir novo deployment e executar readiness do certificado. Não revalidar migration, RPC, RLS, schema, Advisors ou endpoint sem evidência que os invalide.
3. Readiness indicar `supabase=false` e os demais componentes como disponíveis. Marcar somente o secret/backend Supabase como `BLOQUEADO`; corrigir o secret no Preview e reimplantar.
4. Executar readiness novamente para o secret corrigido e dependências diretamente relacionadas. Com todos os gates indispensáveis `APROVADO`, retomar o mesmo E2E.
5. Criar/usar uma única intenção fiscal com chave de idempotência registrada e transmitir uma vez para HML. Validar documento, chave, protocolo, XML e persistência. Se a resposta for ambígua, consultar a tentativa existente antes de qualquer reenvio.

## Critérios de aprovação

- Cada bloqueio reabre somente o gate afetado e os dependentes diretos.
- Uma instrução genérica `sempre validar` em skill especializada não reabre gates sem mudança concreta que os invalide.
- Compactar o contexto e retomar a execução preserva checkpoint, `testRunId` e gates aprovados; a retomada não dispara preflight, Advisors ou auditorias repetidas.
- Nenhuma migração, consulta de Advisors, auditoria de RLS/schema, leitura documental ou snapshot de navegador é repetido sem mudança ou dúvida concreta.
- Nenhuma transmissão ocorre antes de readiness aprovado; nenhum timeout ou resposta ambígua provoca retransmissão automática.
- O gate de Produção permanece fechado e nenhuma credencial aparece nos logs ou no cliente.
- Após a correção de cada bloqueio, o fluxo retoma do último passo aprovado e chega à validação real do resultado fiscal em HML.
