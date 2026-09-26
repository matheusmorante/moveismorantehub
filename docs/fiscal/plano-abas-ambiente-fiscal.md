# Plano de Interface e Isolamento Fiscal: Abas Produção × Homologação

## Contexto & Justificativa
Na tela de Gestão de Documentos Fiscais (`FiscalDocumentsPage.tsx`), a listagem anterior carregava todos os registros da tabela `nfe_documents` em uma única visão unificada. 
Como documentos fiscais de **Produção** (valor legal perante a SEFAZ) e **Homologação** (testes e validação técnica) possuem implicações jurídicas, contábeis e operacionais totalmente distintas, a separação estrutural em **Abas dedicadas** é uma diretriz de segurança obrigatória.

---

## 1. Auditoria do Banco de Dados (Supabase)
- **Status atual no banco:** O banco de dados **já distingue nativamente** os ambientes através da coluna:
  ```sql
  -- Tabela nfe_documents
  ambiente INTEGER NOT NULL DEFAULT 2  -- 1 = Produção, 2 = Homologação / Teste

  -- Tabela nfe_sequences (numeração atômica por série e ambiente)
  UNIQUE(modelo, serie, ambiente)
  ```
- **Conclusão:** Não são necessárias migrações adicionais de schema para suportar o filtro de ambiente. O banco já está modelado segundo a especificação oficial da SEFAZ (NT 2014.002 / MOC).

---

## 2. Diretrizes de UX e Interface (Tela de Notas Fiscais)

### Hierarquia Visual
```
[ Cabeçalho: Notas Fiscais (NF-e & NFC-e) ]                     [ Botão Atualizar ]
-----------------------------------------------------------------------------------
[ Aba: 🏢 Produção (Oficial) ]   [ Aba: 🧪 Homologação (Ambiente de Testes) ]
-----------------------------------------------------------------------------------
[ Barra de Filtros: Buscar... | Todos os Modelos | Todos os Status ]
-----------------------------------------------------------------------------------
[ Listagem de Notas Fiscais do Ambiente Ativo ]
```

### Regras de Negócio e Comportamento
1. **Aba Padrão:** **Produção** selecionada por padrão ao abrir a página (é o ambiente com relevância operacional contínua).
2. **Isolamento de Estado dos Filtros por Aba:**
   - Cada aba mantém seu próprio conjunto de filtros (`search`, `modelFilter`, `statusFilter`).
   - Exemplo: se o operador estiver em Produção com filtro "Autorizada" e mudar para Homologação (onde pode estar filtrando "Todas"), ao retornar para Produção os filtros originais de Produção permanecem preservados intactos.
3. **Indicador Visual na Aba de Homologação:**
   - Destaque em tom âmbar/amarelo com tag explicativa: `Ambiente de testes (sem valor fiscal)`.
   - Banner sutil de alerta no topo da lista quando em Homologação, evitando que qualquer usuário confunda uma nota teste com uma emissão real.
4. **Botão Atualizar:**
   - Localizado no cabeçalho geral, recarrega a lista sincronizando a visualização ativa.
