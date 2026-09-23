# Gemini Live no app mobile

## Regras do primeiro incremento

- Cota de 30 minutos por usuário autenticado e por dia em `America/Sao_Paulo`, já que não há fuso configurado por pessoa/empresa.
- O ledger guarda o acumulado no banco. O servidor calcula o tempo entre início e pulsos, limita cada intervalo a 15 segundos e encerra a contagem ao pausar. O app pulsa a cada 8 segundos e pausa após 15 segundos sem voz detectada.
- Pausa geral fecha áudio e conexão; retomada usa o identificador de resumption quando disponível. Mute apenas pausa a entrada do microfone. Ao sair do app, a ligação é encerrada.
- O orb é exibido durante a sessão, pode ser arrastado e encaixado em qualquer borda, e oferece pausa, mute e encerramento.

## Segurança e limite de contabilização

A chave Gemini fica apenas no secret `GEMINI_API_KEY` das Edge Functions. O backend verifica o usuário autenticado, mantém a cota em RPC protegida e cria tokens efêmeros de uso único, vinculados ao modelo/configuração. O token é temporário, mas continua sendo credencial do cliente enquanto válido.

O relógio que soma e limita o uso roda no PostgreSQL; os pulsos e a detecção de voz que os disparam rodam no app. Cada pulso cobre no máximo 15 segundos. Assim, atraso ou desconexão não acrescenta tempo ilimitado, mas o cliente ainda pode fabricar pulsos ou manter um token efêmero ativo após pausar o ledger. Contabilização resistente a cliente adulterado exigiria o backend observar o stream Live em proxy. A cota limita o fluxo normal do aplicativo, não é medição independente de faturamento do Google.

O proxy textual autenticado preserva o fluxo atual de Function Calling e o dispatcher local. Nenhuma chave Gemini pública é incluída no bundle.

## Execução local

Expo SDK 57 e dependências de áudio estão instalados. O Metro web precisa servir `.wasm` como asset para o worker do `expo-sqlite`; essa extensão está habilitada na configuração local.
