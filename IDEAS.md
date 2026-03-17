# Ideias e Planos Pendentes - Morante Hub

## IA e Gemini
- [ ] **Monitoramento de Cota**: Implementar um fallback automático entre modelos (1.5-flash, 1.5-flash-8b, 2.0-flash) para maximizar o tempo de disponibilidade da chave gratuita.
- [ ] **Cache de Respostas**: Salvar respostas comuns no banco de dados para evitar chamadas repetitivas à API e economizar cota.
- [ ] **Migração para SDK Novo**: Assim que a chave gratuita tiver suporte pleno ao `@google/genai` sem necessidade de credenciais de serviço do GCP, migrar para o novo SDK.

## Infraestrutura e Backend
- [ ] **Dashboard de Logs**: Criar uma interface visual para ver os logs do servidor de IA e Automação em tempo real.
- [ ] **Recuperação de Sessão WhatsApp**: Melhorar a lógica de reconexão do `LocalAuth` para evitar necessidade constante de ler o QR Code.

## Regras de Negócio
- [ ] **Consistência de Portas**: Centralizar a configuração de portas em um arquivo de configuração mestre ou usar um Proxy reverso (como Nginx ou Docker Compose) para facilitar o desenvolvimento local.
