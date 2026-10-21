# Central — restrição do contrato legado, 21/10/2026

## Execução

A conexão Supabase voltou a responder nesta retomada. O projeto operacional `hkoxhourxwlddgsfdgws` foi confirmado como MoranteHub, saudável, PostgreSQL 17. O histórico e o catálogo foram relidos antes da alteração.

**Migração aplicada:** `20261021162004_customer_support_internal_commands_contract`. SHA-256 do SQL: `44F09E703BD6F836CBB9A65AA28A7D54FE80CD6D0AC7B0AAB4504BBE151859A2`. O arquivo em `supabase/migrations/20261021162004_customer_support_internal_commands_contract.sql` é cópia exata do SQL previamente preparado/autorizado.

## Gates confirmados antes da aplicação

- O alias público `morantehub.vercel.app` continuava apontando para `dpl_7hG2EdsC9jBdS3tpexoJySN8NwaC`, READY e em produção, no projeto/team autorizados.
- O manifesto isolado de 92 caminhos conserva o SHA-256 `41A9DF356195FC3769D142480C638FD45C8D3F6AC5BD206866E8D23FF803EC26`. A origem fica no subdiretório `source` do candidato isolado. O serviço publicado tem SHA-256 `1000F8C2A3CAC4343BBEFF3E765F16F6D5CAA05072F6F489DEFB714BC1C546A7`, igual à origem atual desse serviço: cinco comandos por RPC e somente marcação de leitura por UPDATE direto.
- As cinco RPCs foram relidas integralmente. Todas pertencem a postgres, usam `SECURITY DEFINER`, verificam identidade/permissão e têm `search_path` vazio. As tabelas pertencem a postgres sem FORCE RLS. A revogação dos privilégios do chamador não remove os privilégios efetivos dessas funções.
- As provas próprias autenticadas de autoria/idempotência/conflitos e da UI estavam concluídas e registradas. A execução foi encerrada: 51 conversas arquivadas, pasta excluída e 190 mensagens/eventos retidos. Nenhuma fixture dessa execução foi reutilizada para gravação.

## Resultado conferido no catálogo após commit

| Contrato | Resultado |
| --- | --- |
| INSERT direto de mensagens por authenticated | Revogado, inclusive sem privilégios de INSERT por coluna |
| Política `whatsapp_messages_insert` | `WITH CHECK (false)` para authenticated |
| UPDATE direto de conversas por authenticated | Somente a coluna `unread_count`; atribuição, status, notas, tags e updated_at revogados |
| Cinco RPCs internas | Mesmos corpos/MD5, proprietários, SECURITY DEFINER e grants de execução anteriores |
| Anon nas quatro tabelas da Central | Sem SELECT/INSERT/UPDATE/DELETE, incluindo privilégios por coluna |
| Service role | INSERT/UPDATE preservados; recebimento/mídia não foram alterados |

O SQL executou apenas DDL de privilégios/política, dentro de transação com `lock_timeout=5s`, `statement_timeout=30s` e timeout ocioso de 60s. Nenhum cliente, pedido, mensagem, conversa ou pasta foi criado/editado pela operação.

## Provas e limites

- Metadata antes/depois: `scratch/central-support-contraction-before-2026-10-21.json` e `scratch/central-support-contraction-after-2026-10-21.json`. O histórico remoto confirmou a versão real após o sucesso de `apply_migration`.
- Vitest HTTP na produção depois da contração: **7/7**, em 1,96s. HTML 200, mídia sem sessão 401, despacho 403 e webhook sem assinatura/assinatura forjada 401. Log `scratch/central-support-post-contraction-http-2026-10-21.log`; prova `scratch/central-support-post-contraction-http-proof-2026-10-21.json`.
- As verificações HTTP enviaram somente corpos vazios destinados à recusa. Não houve webhook válido, destinatário, download Meta ou despacho. O bloqueio de envio permanece.
- Não houve novo teste gravável positivo após a contração, pois as fixtures autorizadas estavam encerradas. A compatibilidade foi conferida pelo catálogo, pelos corpos inalterados das funções e pela origem publicada; isso não deve ser descrito como nova execução de atomicidade/concorrência PostgreSQL.
- O advisor remoto sinalizou o aviso genérico de funções SECURITY DEFINER executáveis por authenticated. As RPCs da Central são APIs intencionais com verificação de identidade/permissão e `search_path` vazio; a revisão dos corpos confirmou essas guardas. O aviso não foi tratado como prova de bypass nem resolvido reabrindo grants de tabelas. [Regra do advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Os demais módulos não foram alterados.

Rollback do frontend deve conservar o contrato das RPCs. Não reabrir INSERT livre de mensagens nem UPDATE de autoria/estado para restaurar uma revisão antiga. A próxima etapa é o lote ATD-009-R1, com sua própria prova gravável e autorização de publicação; esta migração não publica a reabertura.
