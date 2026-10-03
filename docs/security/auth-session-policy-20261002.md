# Sessão de sete dias — ERP e App Mobile

Em 02/10/2026, o projeto Supabase `hkoxhourxwlddgsfdgws` (MoranteHub / moveismorante),
confirmado contra os clientes do ERP e Mobile, recebeu a configuração Auth:

| Configuração | Valor |
| --- | --- |
| Time-box user sessions | 168 horas (7 dias) |
| Inactivity timeout | 0 (sem encerramento antecipado por inatividade) |
| Enforce single session per user | Desativado |
| Access token expiry | 3600 segundos, renovável automaticamente |
| Detecção de reutilização de refresh token | Ativa, intervalo de 10 segundos |

A gravação foi confirmada recarregando o Dashboard. `supabase/config.toml` registra
o mesmo limite para o ambiente local. O prazo é contado pelo Supabase desde a
criação da sessão e é verificado na renovação; um token já emitido pode continuar
válido até sua expiração. Não se trata de um JWT com validade de sete dias.

O ERP aguarda a restauração da sessão, sem tratar cinco segundos como logout,
e adia consultas do callback de autenticação até o lock do Auth ser liberado.
O Mobile aguarda a restauração, mantém AsyncStorage no runtime nativo e controla
a renovação com AppState e processLock. Na web, o SDK mantém seu armazenamento
persistente e seu próprio controle de visibilidade.

Escopo dos efeitos: apenas autenticação, armazenamento da sessão e renovação.
Não há transições comerciais nem efeitos em estoque, financeiro, fiscal,
reservas ou históricos de operações. Não foram executadas migrations ou SQL remoto.

Validação: 41 testes focados aprovados (22 ERP / 19 Mobile), TypeScript focado
aprovado nos dois clientes e lint do ERP sem erros. A compilação completa tem
erros preexistentes em outros módulos. Testes do SDK usam transporte Auth isolado
e dados sintéticos; não comprovam runtime Android nem sete dias de tempo real.
No Chrome, uma nova aba do ERP local recuperou a sessão e, após fechá-la, outra
aba permaneceu autenticada. O navegador inteiro do usuário não foi encerrado.

A configuração remota está ativa. As alterações de código foram verificadas
localmente; não houve deploy do ERP, update EAS ou geração de APK nesta tarefa.

Referências oficiais: [sessões](https://supabase.com/docs/guides/auth/sessions),
[React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native) e
[eventos de autenticação](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).
