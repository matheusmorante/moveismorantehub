# Agente de impressão direta MoranteHub

O agente roda em um computador Windows da loja e imprime etiquetas de identificação e de preço enviadas pelo ERP ou pelo aplicativo. O PDF de impressão usa o tamanho em milímetros do modelo de folha selecionado e margem zero. O agente envia o PDF ao spooler do Windows sem abrir arquivo ou janela de impressão.

## Instalação no computador da loja

1. Instale o Node.js LTS e o driver da impressora no Windows. Deixe a impressora conectada por USB ou Wi-Fi e selecione-a como impressora padrão do Windows.
2. Abra a pasta `desktop-print-agent` e execute `setup-agent.bat` uma vez. O script instala dependências e Chromium, compila o agente e configura a inicialização do Windows.
3. Deixe a sessão do Windows aberta. O agente precisa estar em execução e a impressora online para receber tarefas.
4. No computador, entre no ERP com uma conta autorizada, abra **Estoque → Etiquetas de identificação** ou **Etiquetas de preço** e clique em **Conectar esta estação**.
5. Confirme na tela que a estação aparece como **online**. Etiquetas enviadas pelo celular e por outros computadores da mesma conta serão impressas nessa estação.

O primeiro pareamento exige acesso ao próprio computador. A credencial fica protegida pelo DPAPI do Windows no perfil local e não é exibida no ERP. Use **Desconectar** na tela de etiquetas para revogar o vínculo da conta.

## Operação

- Escolha o modelo de folha antes de imprimir; a dimensão da folha segue o modelo, com `@page` e zero de margem no arquivo gerado.
- O computador deve permanecer ligado, conectado à internet e com o agente online. Se estiver offline, o trabalho permanece na fila para quando uma estação voltar a consultar a conta.
- A impressora deve estar instalada no Windows com o tamanho de papel correspondente ao modelo escolhido. A impressora e o driver ainda definem a área física que conseguem imprimir.
- A fila permite até 25 trabalhos pendentes ou em processamento por conta.
- Para interromper temporariamente, execute `stop-agent.bat`. Para retomar, inicie o Windows novamente ou execute `start-agent.bat`.

O agente aceita chamadas locais somente em `127.0.0.1:40405` e libera o pareamento apenas para origens do MoranteHub e desenvolvimento local configurado. A chave de pareamento só é persistida em formato protegido pelo Windows.
