# Voz em tempo real com OpenAI no app mobile

## Fluxo e modelos

- O app abre uma sessão com `OpenAiRealtimeVoiceSession` e solicita credenciais temporárias à Edge Function `gemini-live-token`. O nome da rota é mantido por compatibilidade; o provedor ativo é OpenAI.
- O backend cria um segredo efêmero para `gpt-realtime-2.1-mini`, com entrada e saída de áudio PCM a 24 kHz, voz `marin` e transcrição em português com `gpt-4o-mini-transcribe`.
- A chave permanente `OPENAI_API_KEY` fica somente nos secrets da Edge Function. O cliente recebe apenas a credencial temporária da sessão.

## Autenticação e cota

- A Edge Function valida a sessão Supabase e consulta a cota no RPC `gemini_live_quota`, nome legado preservado no banco.
- A cota mantém o limite de 30 minutos por usuário autenticado e por dia em `America/Sao_Paulo`. Pulsos cobrem no máximo 15 segundos; o app envia pulso a cada 8 segundos e pausa após 15 segundos sem voz detectada.
- Pausar, sair ou falhar ao criar a sessão fecha/pausa o ledger conforme o fluxo existente. Mute pausa a entrada do microfone.

O RPC controla o uso do aplicativo, não substitui o medidor de faturamento do provedor. A rota e o RPC ainda têm nomes históricos Gemini por compatibilidade; nenhum deles envia áudio ou texto ao Google.
