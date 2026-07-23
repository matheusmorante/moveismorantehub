# 🎙️ Plano Estratégico: BI por Voz (Sales Intelligence)
> **Objetivo:** Transformar o "atendimento de balcão" em dados estruturados para análise estratégica.

---

## 🏗️ 1. O Pipeline de Dados (Fluxo de Execução)

1. **Captura no ERP (Mobile/Desktop):**
    - Ao final de um atendimento (concluído ou não), o vendedor aciona o botão **"Fechar Relatório de Venda"**.
    - O sistema solicita um áudio rápido e direto sobre como foi a experiência.

2. **Transcrição e Extração (Gemini API):**
    - O áudio é enviado à API do Gemini (nativa em compreensão de multimídia).
    - A IA extrai automaticamente os seguintes campos em formato JSON:
        - `produto_buscado`: (Ex: Sofá retrátil)
        - `status_venda`: (Comprou / Perda de Venda)
        - `motivo_real`: (Ex: Preço, Prazo, Design, Material)
        - `sugestao_demanda`: (O que o cliente queria que não tínhamos?)

3. **Armazenamento no ERP:**
    - Os dados estruturados são salvos no Supabase em uma nova tabela `vendas_logs`.
    - Os logs originais e transcrições ficam guardados para auditoria.

4. **Análise de Negócio (NotebookLM):**
    - Consolidação mensal de dados exportada em CSV/PDF.
    - O **NotebookLM** analisa os padrões de "porquê não comprou" para guiar a compra de novos lotes e promoções.

---

## 🛠️ 2. Regras de Interface (Frontend React/Vite)

- **Stepper de Áudio:** O atendente é guiado por perguntas ou tópicos que devem constar no áudio.
- **Validação Inteligente:** O botão de "Enviar" só é liberado se a IA detectar que os campos obrigatórios (produto e resultado) foram mencionados.
- **Gamificação:** Ranking de feedback para incentivar o vendedor a documentar as perdas (transformando rascunhos em auditoria).

---

## 🚀 3. Rota Sugerida (Fullstack)

- **Backend:** Endpoint Node.js que recebe o arquivo de áudio.
- **System Instruction (Gemini):**
  > "Você é um analista de varejo de móveis. Analise o áudio do vendedor e extraia: 1. Qual item o cliente buscou. 2. Se a venda foi fechada. 3. Se não fechada, qual a objeção exata (preço, medida, cor). 4. Sugestão de produto que falta no estoque. Responda APENAS em JSON."

---

## 📅 Status do Plano
- [ ] Criar tabela `sales_intelligence_logs` no Supabase.
- [ ] Implementar captura de áudio no painel do vendedor.
- [ ] Integrar rota de processamento de áudio com Gemini API.
- [ ] Configurar dashboard de insights de perdas de venda no ERP.




os auidosde arealatoriosdeantendimentos temque ficar salvo, mesmoseda erro da  ia, lembre de ter quepassar paranotbookml paraele emesmo processar issso segundo nosssosobjetivos, masos audios tem que ficar salvosmesmoscom erro deaudio.Pois esse atewndimento serausado quando o notebook for bem sucesssidonaalaise e retornode informaçoes. Registre esse plano, para execuçao  qunado tive cota, me guiaaconcluir etapasnecessarias 
