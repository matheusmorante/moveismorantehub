# 📐 Arquitetura da Matriz de Determinação de CFOP (Produto × Pedido × Devolução)

> **Documento Canônico de Modelagem Fiscal e Regras de Negócio**  
> **Status:** Ativo e Referência Permanente  
> **Data:** Outubro de 2026

---

## 🎯 1. Princípio Fundamental de Separação de Responsabilidades

O cadastro de produto e os pedidos operacionais possuem fronteiras estritas de responsabilidade:

> **O Cadastro do Produto responde:** *O que o item é fisicamente e comercialmente.*  
> **O Pedido de Venda responde:** *O que está acontecendo com esse item nesta operação específica.*  
> **O Pedido de Devolução responde:** *Qual foi a operação histórica comprovada pela NF-e original.*

---

## 📦 2. O Que Fica no Cadastro do Produto

No cadastro de produtos, são armazenadas **exclusivamente as características intrínsecas** do produto, e **nunca** variáveis circunstanciais da venda:

1. **Origem Comercial do Produto:**
   - 🏭 **Produção do próprio estabelecimento (`own_production`)**: Fabricado pela própria empresa Móveis Morante. Dispensado de fornecedor externo (fornecedor interno). Base de CFOP 5.101.
   - 📦 **Adquirido ou recebido de terceiros (`third_party`) [Padrão]**: Adquirido de indústrias e parceiros. Exige seleção de fornecedor cadastrado. Base de CFOP 5.102.
2. **NCM (Nomenclatura Comum do Mercosul):**
   - Classificação fiscal da mercadoria.
3. **CEST (Código Especificador da Substituição Tributária):**
   - Preenchido quando aplicável para itens sujeitos a ST.
4. **Origem da Mercadoria para ICMS/CST (Tabela A):**
   - `0 - Nacional`, `1 - Estrangeira Importação Direta`, `2 - Estrangeira Adquirida Mercado Interno`, etc.  
   - *Nota de distinção:* Origem do ICMS define nacionalidade/tributação (0, 1, 2...) e alimenta o primeiro dígito do CST/CSOSN; **não** se confunde com Produção Própria × Terceiros.

### 🚫 O que NUNCA deve ficar no produto:
- Tipo de operação (venda × devolução × remessa × bonificação);
- Abrangência geográfica (operação interna × interestadual × exterior);
- Perfil do cliente (contribuinte × não contribuinte × consumidor final);
- Modalidade logística (entrega × retirada);
- Modalidades comerciais (venda à ordem, entrega futura).

---

## 🧾 3. O Que Fica no Pedido de Venda

O pedido de venda deriva a operação a partir de suas próprias entidades:

| Informação | Como o ERP Obtém Automaticamente |
| :--- | :--- |
| **É Venda** | Tipo do documento / pedido de venda comercial |
| **UF de Destino** | Endereço do cliente / local de entrega |
| **Escopo da Operação** | Comparação automática: UF do emitente (PR) × UF de entrega (`internal` vs `interstate`) |
| **Contribuinte de ICMS** | Inscrição Estadual ativa e indicador no cadastro de clientes |
| **Consumidor Final** | Finalidade da operação no pedido / cliente |
| **Regime Especial / ST** | Convênios/Protocolos estaduais cruzados com NCM e UF de destino |

### Matriz de Resolução Automática de CFOP de Saída:
- **Produção Própria + Venda Interna:** `5.101`
- **Adquirido de Terceiros + Venda Interna:** `5.102`
- **Adquirido de Terceiros + Venda Interna (com ST anterior):** `5.405`
- **Produção Própria + Venda Interestadual (Contribuinte):** `6.101`
- **Adquirido de Terceiros + Venda Interestadual (Contribuinte):** `6.102`
- **Produção Própria + Venda Interestadual (Não Contribuinte):** `6.107`
- **Adquirido de Terceiros + Venda Interestadual (Não Contribuinte):** `6.108`

> O operador **nunca** escolhe CFOP manualmente; o motor fiscal calcula e valida automaticamente.

---

## 🔄 4. O Que Fica no Pedido de Devolução (Imutabilidade Histórica)

Na devolução de mercadoria, o cadastro atual do produto é irrelevante frente ao fato fiscal pretérito:

- A devolução se ancora **estritamente na NF-e original** autorizada.
- Se um produto foi vendido meses atrás como "Adquirido de Terceiros" e hoje seu cadastro foi alterado para "Fabricação Própria", a devolução daquela venda preserva com precisão o CFOP e a tributação originais (`1.202` / `2.202`), e **não** `1.201` / `2.201`.
- A NF-e original fornece:
  - Chave de acesso referenciada (44 dígitos);
  - Item original e quantidade faturada;
  - CFOP original emitido;
  - UF original da operação;
  - Tratamento tributário original (ICMS normal, ST, etc.).

### Mapeamento de CFOPs de Devolução:
- Devolução interna de venda de produção do estabelecimento: `1.201`
- Devolução interna de venda de mercadoria adquirida de terceiros: `1.202`
- Devolução interna com ST: `1.411`
- Devolução interestadual de produção própria: `2.201`
- Devolução interestadual de mercadoria de terceiros: `2.202`
- Devolução interestadual com ST: `2.411`

---

## 🛡️ 5. Resumo da Equação Arquitetural

$$\text{CFOP de Venda} = \text{Cadastro do Produto (Produção Própria} \times \text{Terceiros)} + \text{Pedido de Venda (UF, Cliente, Finalidade)}$$

$$\text{CFOP de Devolução} = \text{Snapshot da NF-e Original Vinculada (Chave, Item, CFOP Original)}$$
