# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing\channel-catalog.spec.ts >> Marketing — Catálogo de Canais (ChannelCatalog) >> 5. Busca global com debounce e retorno consistente
- Location: tests\e2e\marketing\channel-catalog.spec.ts:161:5

# Error details

```
Error: Erros críticos de console detectados

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Catalog ID não configurado.",
+ ]
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - generic [ref=f1e3]:
    - region "Notifications Alt+T"
    - main [ref=f1e4]:
      - generic [ref=f1e5]:
        - generic [ref=f1e6]:
          - generic [ref=f1e7]:
            - heading "Catálogo de Canais" [level=1] [ref=f1e8]
            - paragraph [ref=f1e9]: Variações publicadas por coleção
          - generic [ref=f1e10]:
            - button " Atualizar WhatsApp" [ref=f1e11] [cursor=pointer]:
              - generic [ref=f1e12]: 
              - text: Atualizar WhatsApp
            - generic [ref=f1e13]:
              - generic [ref=f1e14]: 
              - textbox "BUSCAR VARIAÇÃO OU SKU..." [active] [ref=f1e15]
            - combobox [ref=f1e16] [cursor=pointer]:
              - option "TODOS OS CANAIS" [selected]
              - option "WHATSAPP SHOP"
              - option "CATÁLOGO DIGITAL"
            - button "" [ref=f1e17] [cursor=pointer]
        - generic [ref=f1e20]:
          - generic [ref=f1e21]:
            - generic [ref=f1e22]: 
            - generic [ref=f1e24]:
              - heading "Coleções do Catálogo Meta" [level=3] [ref=f1e25]
              - paragraph [ref=f1e26]: Product Sets no WhatsApp Business
          - button " Gerenciar Coleções Meta" [ref=f1e27] [cursor=pointer]:
            - generic [ref=f1e28]: 
            - text: Gerenciar Coleções Meta
        - generic [ref=f1e29]:
          - button " Produtos" [ref=f1e30] [cursor=pointer]:
            - generic [ref=f1e31]: 
            - text: Produtos
          - button " Design & Cores" [ref=f1e32] [cursor=pointer]:
            - generic [ref=f1e33]: 
            - text: Design & Cores
          - button " Banners" [ref=f1e34] [cursor=pointer]:
            - generic [ref=f1e35]: 
            - text: Banners
          - button " Oportunidades" [ref=f1e36] [cursor=pointer]:
            - generic [ref=f1e37]: 
            - text: Oportunidades
          - button " Configurações" [ref=f1e38] [cursor=pointer]:
            - generic [ref=f1e39]: 
            - text: Configurações
        - generic [ref=f1e40]:
          - generic [ref=f1e41]:
            - button "Todas as Coleções" [ref=f1e42] [cursor=pointer]
            - button " COZINHA" [ref=f1e43] [cursor=pointer]:
              - generic [ref=f1e44]: 
              - text: COZINHA
            - button " QUARTO" [ref=f1e45] [cursor=pointer]:
              - generic [ref=f1e46]: 
              - text: QUARTO
            - button " SALA DE JANTAR" [ref=f1e47] [cursor=pointer]:
              - generic [ref=f1e48]: 
              - text: SALA DE JANTAR
          - generic [ref=f1e49]:
            - generic [ref=f1e50]: 30 VARIAÇÃOÕES DA PÁGINA
            - generic [ref=f1e51]: ·
            - generic [ref=f1e52]: 337 TOTAIS
            - generic [ref=f1e53]: ·
            - generic [ref=f1e54]: 0 NO WHATSAPP
          - generic [ref=f1e55]:
            - generic [ref=f1e58]:
              - generic [ref=f1e59]: 
              - generic [ref=f1e62]:
                - generic [ref=f1e64]:
                  - generic [ref=f1e65]: 
                  - text: QUARTO
                - paragraph
                - heading "Guarda Roupa Thb Splendore Glass 4 Porta 2 Gaveta com Espelho Preto" [level=3] [ref=f1e66]
                - generic [ref=f1e67]:
                  - generic [ref=f1e68]: "SKU: 003998-01"
                  - generic [ref=f1e69]: "ESTOQUE: 0"
                  - generic [ref=f1e70]: R$ 999,00
              - generic [ref=f1e71]:
                - generic [ref=f1e72]:
                  - button "" [ref=f1e73] [cursor=pointer]
                  - generic [ref=f1e75]: Não Pub.
                - generic [ref=f1e76]:
                  - button "" [ref=f1e77] [cursor=pointer]
                  - generic [ref=f1e79]: Auto
                - generic [ref=f1e80]:
                  - generic [ref=f1e81]: 
                  - generic [ref=f1e83]: Ativo
              - generic [ref=f1e84]:
                - generic [ref=f1e85]: 
                - paragraph [ref=f1e86]: Nunca
            - generic [ref=f1e89]:
              - generic [ref=f1e90]: 
              - generic [ref=f1e93]:
                - generic [ref=f1e95]:
                  - generic [ref=f1e96]: 
                  - text: QUARTO
                - paragraph
                - heading "Base Bau Casal 1,38 Damulti Premium Linho Marrom" [level=3] [ref=f1e97]
                - generic [ref=f1e98]:
                  - generic [ref=f1e99]: "SKU: 003999-01"
                  - generic [ref=f1e100]: "ESTOQUE: 0"
                  - generic [ref=f1e101]: R$ 1.299,00
              - generic [ref=f1e102]:
                - generic [ref=f1e103]:
                  - button "" [ref=f1e104] [cursor=pointer]
                  - generic [ref=f1e106]: Não Pub.
                - generic [ref=f1e107]:
                  - button "" [ref=f1e108] [cursor=pointer]
                  - generic [ref=f1e110]: Auto
                - generic [ref=f1e111]:
                  - generic [ref=f1e112]: 
                  - generic [ref=f1e114]: Ativo
              - generic [ref=f1e115]:
                - generic [ref=f1e116]: 
                - paragraph [ref=f1e117]: Nunca
            - generic [ref=f1e120]:
              - generic [ref=f1e121]: 
              - generic [ref=f1e124]:
                - generic [ref=f1e126]:
                  - generic [ref=f1e127]: 
                  - text: SALA DE ESTAR
                - paragraph
                - heading "Sofá Woodx Jaffar 3 Lugares 2,00 M Veludo Grafite" [level=3] [ref=f1e128]
                - generic [ref=f1e129]:
                  - generic [ref=f1e130]: "SKU: 003995-01"
                  - generic [ref=f1e131]: "ESTOQUE: 0"
                  - generic [ref=f1e132]: R$ 2.999,00
              - generic [ref=f1e133]:
                - generic [ref=f1e134]:
                  - button "" [ref=f1e135] [cursor=pointer]
                  - generic [ref=f1e137]: Não Pub.
                - generic [ref=f1e138]:
                  - button "" [ref=f1e139] [cursor=pointer]
                  - generic [ref=f1e141]: Auto
                - generic [ref=f1e142]:
                  - generic [ref=f1e143]: 
                  - generic [ref=f1e145]: Ativo
              - generic [ref=f1e146]:
                - generic [ref=f1e147]: 
                - paragraph [ref=f1e148]: Nunca
            - generic [ref=f1e151]:
              - generic [ref=f1e152]: 
              - generic [ref=f1e155]:
                - generic [ref=f1e157]:
                  - generic [ref=f1e158]: 
                  - text: QUARTO
                - paragraph
                - heading "COMODA EVIDENCIA CP25 2PT 5GV cp251 Branco" [level=3] [ref=f1e159]
                - generic [ref=f1e160]:
                  - generic [ref=f1e161]: "SKU: 001633-01"
                  - generic [ref=f1e162]: "ESTOQUE: 0"
                  - generic [ref=f1e163]: R$ 399,00
              - generic [ref=f1e164]:
                - generic [ref=f1e165]:
                  - button "" [ref=f1e166] [cursor=pointer]
                  - generic [ref=f1e168]: Não Pub.
                - generic [ref=f1e169]:
                  - button "" [ref=f1e170] [cursor=pointer]
                  - generic [ref=f1e172]: Auto
                - generic [ref=f1e173]:
                  - generic [ref=f1e174]: 
                  - generic [ref=f1e176]: Ativo
              - generic [ref=f1e177]:
                - generic [ref=f1e178]: 
                - paragraph [ref=f1e179]: Nunca
            - generic [ref=f1e182]:
              - generic [ref=f1e183]: 
              - generic [ref=f1e186]:
                - generic [ref=f1e188]:
                  - generic [ref=f1e189]: 
                  - text: COZINHA
                - paragraph
                - heading "BALCAO COOKTOP NOTAVEL NT 3110 1GV P/4BOCAS NT3110.755433 Freijo Trend/Branco New Freijo" [level=3] [ref=f1e190]
                - generic [ref=f1e191]:
                  - generic [ref=f1e192]: "SKU: 003961-01"
                  - generic [ref=f1e193]: "ESTOQUE: 0"
                  - generic [ref=f1e194]: R$ 399,00
              - generic [ref=f1e195]:
                - generic [ref=f1e196]:
                  - button "" [ref=f1e197] [cursor=pointer]
                  - generic [ref=f1e199]: Não Pub.
                - generic [ref=f1e200]:
                  - button "" [ref=f1e201] [cursor=pointer]
                  - generic [ref=f1e203]: Auto
                - generic [ref=f1e204]:
                  - generic [ref=f1e205]: 
                  - generic [ref=f1e207]: Ativo
              - generic [ref=f1e208]:
                - generic [ref=f1e209]: 
                - paragraph [ref=f1e210]: Nunca
            - generic [ref=f1e213]:
              - generic [ref=f1e214]: 
              - generic [ref=f1e217]:
                - generic [ref=f1e219]:
                  - generic [ref=f1e220]: 
                  - text: SALA DE JANTAR
                - paragraph
                - heading "Conjunto para Sala de Jantar Madetal Moscou 1,54 M 6 Cadeiras Grecia Bege" [level=3] [ref=f1e221]
                - generic [ref=f1e222]:
                  - generic [ref=f1e223]: "SKU: 003996-01"
                  - generic [ref=f1e224]: "ESTOQUE: 0"
                  - generic [ref=f1e225]: R$ 1.599,00
              - generic [ref=f1e226]:
                - generic [ref=f1e227]:
                  - button "" [ref=f1e228] [cursor=pointer]
                  - generic [ref=f1e230]: Não Pub.
                - generic [ref=f1e231]:
                  - button "" [ref=f1e232] [cursor=pointer]
                  - generic [ref=f1e234]: Auto
                - generic [ref=f1e235]:
                  - generic [ref=f1e236]: 
                  - generic [ref=f1e238]: Ativo
              - generic [ref=f1e239]:
                - generic [ref=f1e240]: 
                - paragraph [ref=f1e241]: Nunca
            - generic [ref=f1e244]:
              - generic [ref=f1e245]: 
              - generic [ref=f1e248]:
                - generic [ref=f1e250]:
                  - generic [ref=f1e251]: 
                  - text: QUARTO
                - paragraph
                - heading "Guarda Roupa Faimec Salvador 6pt 2gv Canela/Off White" [level=3] [ref=f1e252]
                - generic [ref=f1e253]:
                  - generic [ref=f1e254]: "SKU: 003964-01"
                  - generic [ref=f1e255]: "ESTOQUE: 0"
                  - generic [ref=f1e256]: R$ 1.399,00
              - generic [ref=f1e257]:
                - generic [ref=f1e258]:
                  - button "" [ref=f1e259] [cursor=pointer]
                  - generic [ref=f1e261]: Não Pub.
                - generic [ref=f1e262]:
                  - button "" [ref=f1e263] [cursor=pointer]
                  - generic [ref=f1e265]: Auto
                - generic [ref=f1e266]:
                  - generic [ref=f1e267]: 
                  - generic [ref=f1e269]: Ativo
              - generic [ref=f1e270]:
                - generic [ref=f1e271]: 
                - paragraph [ref=f1e272]: Nunca
            - generic [ref=f1e275]:
              - generic [ref=f1e276]: 
              - generic [ref=f1e279]:
                - generic [ref=f1e281]:
                  - generic [ref=f1e282]: 
                  - text: COZINHA
                - paragraph
                - heading "Armario Aereo Luciane Isis 3pt 120cm Vidro Isi Avela Pf/Mocca Uv" [level=3] [ref=f1e283]
                - generic [ref=f1e284]:
                  - generic [ref=f1e285]: "SKU: 003973-01"
                  - generic [ref=f1e286]: "ESTOQUE: 0"
                  - generic [ref=f1e287]: R$ 299,00
              - generic [ref=f1e288]:
                - generic [ref=f1e289]:
                  - button "" [ref=f1e290] [cursor=pointer]
                  - generic [ref=f1e292]: Não Pub.
                - generic [ref=f1e293]:
                  - button "" [ref=f1e294] [cursor=pointer]
                  - generic [ref=f1e296]: Auto
                - generic [ref=f1e297]:
                  - generic [ref=f1e298]: 
                  - generic [ref=f1e300]: Ativo
              - generic [ref=f1e301]:
                - generic [ref=f1e302]: 
                - paragraph [ref=f1e303]: Nunca
            - generic [ref=f1e306]:
              - generic [ref=f1e307]: 
              - generic [ref=f1e310]:
                - generic [ref=f1e312]:
                  - generic [ref=f1e313]: 
                  - text: COZINHA
                - paragraph
                - heading "Armário Aéreo Luciane Isis 1pt Basc 60cm Isi Avela Pf/Mocca Uv" [level=3] [ref=f1e314]
                - generic [ref=f1e315]:
                  - generic [ref=f1e316]: "SKU: 003980-01"
                  - generic [ref=f1e317]: "ESTOQUE: 0"
                  - generic [ref=f1e318]: R$ 199,00
              - generic [ref=f1e319]:
                - generic [ref=f1e320]:
                  - button "" [ref=f1e321] [cursor=pointer]
                  - generic [ref=f1e323]: Não Pub.
                - generic [ref=f1e324]:
                  - button "" [ref=f1e325] [cursor=pointer]
                  - generic [ref=f1e327]: Auto
                - generic [ref=f1e328]:
                  - generic [ref=f1e329]: 
                  - generic [ref=f1e331]: Ativo
              - generic [ref=f1e332]:
                - generic [ref=f1e333]: 
                - paragraph [ref=f1e334]: Nunca
            - generic [ref=f1e337]:
              - generic [ref=f1e338]: 
              - generic [ref=f1e341]:
                - generic [ref=f1e343]:
                  - generic [ref=f1e344]: 
                  - text: QUARTO
                - paragraph
                - heading "Produto" [level=3] [ref=f1e345]
                - generic [ref=f1e346]:
                  - generic [ref=f1e347]: "SKU: 003956-01"
                  - generic [ref=f1e348]: "ESTOQUE: 0"
                  - generic [ref=f1e349]: R$ 0,00
              - generic [ref=f1e350]:
                - generic [ref=f1e351]:
                  - button "" [ref=f1e352] [cursor=pointer]
                  - generic [ref=f1e354]: Não Pub.
                - generic [ref=f1e355]:
                  - button "" [ref=f1e356] [cursor=pointer]
                  - generic [ref=f1e358]: Auto
                - generic [ref=f1e359]:
                  - generic [ref=f1e360]: 
                  - generic [ref=f1e362]: Inativo
              - generic [ref=f1e363]:
                - generic [ref=f1e364]: 
                - paragraph [ref=f1e365]: Nunca
            - generic [ref=f1e368]:
              - generic [ref=f1e369]: 
              - generic [ref=f1e372]:
                - generic [ref=f1e374]:
                  - generic [ref=f1e375]: 
                  - text: QUARTO
                - paragraph
                - heading "Guarda Roupa Doripel Montevideu 6pt 2gv Off White/Nogueira" [level=3] [ref=f1e376]
                - generic [ref=f1e377]:
                  - generic [ref=f1e378]: "SKU: 003978-01"
                  - generic [ref=f1e379]: "ESTOQUE: 0"
                  - generic [ref=f1e380]: R$ 699,00
              - generic [ref=f1e381]:
                - generic [ref=f1e382]:
                  - button "" [ref=f1e383] [cursor=pointer]
                  - generic [ref=f1e385]: Não Pub.
                - generic [ref=f1e386]:
                  - button "" [ref=f1e387] [cursor=pointer]
                  - generic [ref=f1e389]: Auto
                - generic [ref=f1e390]:
                  - generic [ref=f1e391]: 
                  - generic [ref=f1e393]: Ativo
              - generic [ref=f1e394]:
                - generic [ref=f1e395]: 
                - paragraph [ref=f1e396]: Nunca
            - generic [ref=f1e399]:
              - generic [ref=f1e400]: 
              - generic [ref=f1e403]:
                - generic [ref=f1e405]:
                  - generic [ref=f1e406]: 
                  - text: SALA DE ESTAR
                - paragraph
                - heading "Cj 2 Poltrona Madetal Grecia Cinza" [level=3] [ref=f1e407]
                - generic [ref=f1e408]:
                  - generic [ref=f1e409]: "SKU: 003974-01"
                  - generic [ref=f1e410]: "ESTOQUE: 0"
                  - generic [ref=f1e411]: R$ 249,00
              - generic [ref=f1e412]:
                - generic [ref=f1e413]:
                  - button "" [ref=f1e414] [cursor=pointer]
                  - generic [ref=f1e416]: Não Pub.
                - generic [ref=f1e417]:
                  - button "" [ref=f1e418] [cursor=pointer]
                  - generic [ref=f1e420]: Auto
                - generic [ref=f1e421]:
                  - generic [ref=f1e422]: 
                  - generic [ref=f1e424]: Ativo
              - generic [ref=f1e425]:
                - generic [ref=f1e426]: 
                - paragraph [ref=f1e427]: Nunca
            - generic [ref=f1e430]:
              - generic [ref=f1e431]: 
              - generic [ref=f1e434]:
                - generic [ref=f1e436]:
                  - generic [ref=f1e437]: 
                  - text: COZINHA
                - paragraph
                - heading "ARMARIO AEREO BASC INDEKES STAR 1PT 80CM 6123.4 Castani" [level=3] [ref=f1e438]
                - generic [ref=f1e439]:
                  - generic [ref=f1e440]: "SKU: 001632-01"
                  - generic [ref=f1e441]: "ESTOQUE: 0"
                  - generic [ref=f1e442]: R$ 199,00
              - generic [ref=f1e443]:
                - generic [ref=f1e444]:
                  - button "" [ref=f1e445] [cursor=pointer]
                  - generic [ref=f1e447]: Não Pub.
                - generic [ref=f1e448]:
                  - button "" [ref=f1e449] [cursor=pointer]
                  - generic [ref=f1e451]: Auto
                - generic [ref=f1e452]:
                  - generic [ref=f1e453]: 
                  - generic [ref=f1e455]: Ativo
              - generic [ref=f1e456]:
                - generic [ref=f1e457]: 
                - paragraph [ref=f1e458]: Nunca
            - generic [ref=f1e461]:
              - generic [ref=f1e462]: 
              - generic [ref=f1e465]:
                - generic [ref=f1e467]:
                  - generic [ref=f1e468]: 
                  - text: QUARTO
                - paragraph
                - heading "Guarda Roupa Faimec Portugal 2 Portas Branco" [level=3] [ref=f1e469]
                - generic [ref=f1e470]:
                  - generic [ref=f1e471]: "SKU: 003993-01"
                  - generic [ref=f1e472]: "ESTOQUE: 0"
                  - generic [ref=f1e473]: R$ 999,00
              - generic [ref=f1e474]:
                - generic [ref=f1e475]:
                  - button "" [ref=f1e476] [cursor=pointer]
                  - generic [ref=f1e478]: Não Pub.
                - generic [ref=f1e479]:
                  - button "" [ref=f1e480] [cursor=pointer]
                  - generic [ref=f1e482]: Auto
                - generic [ref=f1e483]:
                  - generic [ref=f1e484]: 
                  - generic [ref=f1e486]: Ativo
              - generic [ref=f1e487]:
                - generic [ref=f1e488]: 
                - paragraph [ref=f1e489]: Nunca
            - generic [ref=f1e492]:
              - generic [ref=f1e493]: 
              - generic [ref=f1e496]:
                - generic [ref=f1e498]:
                  - generic [ref=f1e499]: 
                  - text: QUARTO
                - paragraph
                - heading "Berço Mini Cama Henn Aconcheg Branco/Jequitiba Hp" [level=3] [ref=f1e500]
                - generic [ref=f1e501]:
                  - generic [ref=f1e502]: "SKU: 003984-01"
                  - generic [ref=f1e503]: "ESTOQUE: 0"
                  - generic [ref=f1e504]: R$ 999,00
              - generic [ref=f1e505]:
                - generic [ref=f1e506]:
                  - button "" [ref=f1e507] [cursor=pointer]
                  - generic [ref=f1e509]: Não Pub.
                - generic [ref=f1e510]:
                  - button "" [ref=f1e511] [cursor=pointer]
                  - generic [ref=f1e513]: Auto
                - generic [ref=f1e514]:
                  - generic [ref=f1e515]: 
                  - generic [ref=f1e517]: Ativo
              - generic [ref=f1e518]:
                - generic [ref=f1e519]: 
                - paragraph [ref=f1e520]: Nunca
            - generic [ref=f1e523]:
              - generic [ref=f1e524]: 
              - generic [ref=f1e527]:
                - generic [ref=f1e529]:
                  - generic [ref=f1e530]: 
                  - text: QUARTO
                - paragraph
                - heading "G ROUPA DEMOBILE CADIS 4PT 6GV ESP PES 66510-140 Amendola/Off White" [level=3] [ref=f1e531]
                - generic [ref=f1e532]:
                  - generic [ref=f1e533]: "SKU: 000382-01"
                  - generic [ref=f1e534]: "ESTOQUE: 1"
                  - generic [ref=f1e535]: R$ 243,72
              - generic [ref=f1e536]:
                - generic [ref=f1e537]:
                  - button "" [ref=f1e538] [cursor=pointer]
                  - generic [ref=f1e540]: Não Pub.
                - generic [ref=f1e541]:
                  - button "" [ref=f1e542] [cursor=pointer]
                  - generic [ref=f1e544]: Auto
                - generic [ref=f1e545]:
                  - generic [ref=f1e546]: 
                  - generic [ref=f1e548]: Inativo
              - generic [ref=f1e549]:
                - generic [ref=f1e550]: 
                - paragraph [ref=f1e551]: Nunca
            - generic [ref=f1e554]:
              - generic [ref=f1e555]: 
              - generic [ref=f1e558]:
                - generic [ref=f1e560]:
                  - generic [ref=f1e561]: 
                  - text: LAVANDERIA
                - paragraph
                - heading "Armário Multiuso Notável Nt4020 2 Portas com Chave" [level=3] [ref=f1e562]
                - generic [ref=f1e563]:
                  - generic [ref=f1e564]: "SKU: 000348-04"
                  - generic [ref=f1e565]: "ESTOQUE: 1"
                  - generic [ref=f1e566]: R$ 444,00
              - generic [ref=f1e567]:
                - generic [ref=f1e568]:
                  - button "" [ref=f1e569] [cursor=pointer]
                  - generic [ref=f1e571]: Não Pub.
                - generic [ref=f1e572]:
                  - button "" [ref=f1e573] [cursor=pointer]
                  - generic [ref=f1e575]: Auto
                - generic [ref=f1e576]:
                  - generic [ref=f1e577]: 
                  - generic [ref=f1e579]: Ativo
              - generic [ref=f1e580]:
                - generic [ref=f1e581]: 
                - paragraph [ref=f1e582]: Nunca
            - generic [ref=f1e585]:
              - generic [ref=f1e586]: 
              - generic [ref=f1e589]:
                - generic [ref=f1e591]:
                  - generic [ref=f1e592]: 
                  - text: COZINHA
                - paragraph
                - heading "Balcao de Pia Luciane Isis 3pt 2gv 120cm S/Tp Isi Avela Pf/Mocca Uv" [level=3] [ref=f1e593]
                - generic [ref=f1e594]:
                  - generic [ref=f1e595]: "SKU: 003972-01"
                  - generic [ref=f1e596]: "ESTOQUE: 0"
                  - generic [ref=f1e597]: R$ 549,00
              - generic [ref=f1e598]:
                - generic [ref=f1e599]:
                  - button "" [ref=f1e600] [cursor=pointer]
                  - generic [ref=f1e602]: Não Pub.
                - generic [ref=f1e603]:
                  - button "" [ref=f1e604] [cursor=pointer]
                  - generic [ref=f1e606]: Auto
                - generic [ref=f1e607]:
                  - generic [ref=f1e608]: 
                  - generic [ref=f1e610]: Ativo
              - generic [ref=f1e611]:
                - generic [ref=f1e612]: 
                - paragraph [ref=f1e613]: Nunca
            - generic [ref=f1e616]:
              - generic [ref=f1e617]: 
              - generic [ref=f1e620]:
                - generic [ref=f1e622]:
                  - generic [ref=f1e623]: 
                  - text: COZINHA
                - paragraph
                - heading "Balcão para Cooktop 1,05 Indekes 1pt 1gv C/Tampo Freijo/Off White" [level=3] [ref=f1e624]
                - generic [ref=f1e625]:
                  - generic [ref=f1e626]: "SKU: 003985-01"
                  - generic [ref=f1e627]: "ESTOQUE: 0"
                  - generic [ref=f1e628]: R$ 299,00
              - generic [ref=f1e629]:
                - generic [ref=f1e630]:
                  - button "" [ref=f1e631] [cursor=pointer]
                  - generic [ref=f1e633]: Não Pub.
                - generic [ref=f1e634]:
                  - button "" [ref=f1e635] [cursor=pointer]
                  - generic [ref=f1e637]: Auto
                - generic [ref=f1e638]:
                  - generic [ref=f1e639]: 
                  - generic [ref=f1e641]: Ativo
              - generic [ref=f1e642]:
                - generic [ref=f1e643]: 
                - paragraph [ref=f1e644]: Nunca
            - generic [ref=f1e647]:
              - generic [ref=f1e648]: 
              - generic [ref=f1e651]:
                - generic [ref=f1e653]:
                  - generic [ref=f1e654]: 
                  - text: QUARTO
                - paragraph
                - heading "Guarda Roupa Made Marcs Atlanta 2 Portas 4 Gavetas Ripado Branco Acetinado" [level=3] [ref=f1e655]
                - generic [ref=f1e656]:
                  - generic [ref=f1e657]: "SKU: 003981-01"
                  - generic [ref=f1e658]: "ESTOQUE: 0"
                  - generic [ref=f1e659]: R$ 1.999,00
              - generic [ref=f1e660]:
                - generic [ref=f1e661]:
                  - button "" [ref=f1e662] [cursor=pointer]
                  - generic [ref=f1e664]: Não Pub.
                - generic [ref=f1e665]:
                  - button "" [ref=f1e666] [cursor=pointer]
                  - generic [ref=f1e668]: Auto
                - generic [ref=f1e669]:
                  - generic [ref=f1e670]: 
                  - generic [ref=f1e672]: Ativo
              - generic [ref=f1e673]:
                - generic [ref=f1e674]: 
                - paragraph [ref=f1e675]: Nunca
            - generic [ref=f1e678]:
              - generic [ref=f1e679]: 
              - generic [ref=f1e682]:
                - generic [ref=f1e684]:
                  - generic [ref=f1e685]: 
                  - text: COZINHA
                - paragraph
                - heading "Paneleiro Telasul Star New 4pt 80cm Branco" [level=3] [ref=f1e686]
                - generic [ref=f1e687]:
                  - generic [ref=f1e688]: "SKU: 003992-01"
                  - generic [ref=f1e689]: "ESTOQUE: 0"
                  - generic [ref=f1e690]: R$ 999,00
              - generic [ref=f1e691]:
                - generic [ref=f1e692]:
                  - button "" [ref=f1e693] [cursor=pointer]
                  - generic [ref=f1e695]: Não Pub.
                - generic [ref=f1e696]:
                  - button "" [ref=f1e697] [cursor=pointer]
                  - generic [ref=f1e699]: Auto
                - generic [ref=f1e700]:
                  - generic [ref=f1e701]: 
                  - generic [ref=f1e703]: Ativo
              - generic [ref=f1e704]:
                - generic [ref=f1e705]: 
                - paragraph [ref=f1e706]: Nunca
            - generic [ref=f1e709]:
              - generic [ref=f1e710]: 
              - generic [ref=f1e713]:
                - generic [ref=f1e715]:
                  - generic [ref=f1e716]: 
                  - text: SALA DE ESTAR
                - paragraph
                - heading "Bancada Notavel Nt1180 2pt P/Tv 50\" Freijo Trend/Off White" [level=3] [ref=f1e717]
                - generic [ref=f1e718]:
                  - generic [ref=f1e719]: "SKU: 003960-01"
                  - generic [ref=f1e720]: "ESTOQUE: 0"
                  - generic [ref=f1e721]: R$ 399,00
              - generic [ref=f1e722]:
                - generic [ref=f1e723]:
                  - button "" [ref=f1e724] [cursor=pointer]
                  - generic [ref=f1e726]: Não Pub.
                - generic [ref=f1e727]:
                  - button "" [ref=f1e728] [cursor=pointer]
                  - generic [ref=f1e730]: Auto
                - generic [ref=f1e731]:
                  - generic [ref=f1e732]: 
                  - generic [ref=f1e734]: Ativo
              - generic [ref=f1e735]:
                - generic [ref=f1e736]: 
                - paragraph [ref=f1e737]: Nunca
            - generic [ref=f1e740]:
              - img "Balcao para Pia Cadorin Laura 2pt 3gv 120cm Freijo/Fume" [ref=f1e742]
              - generic [ref=f1e743]:
                - generic [ref=f1e745]:
                  - generic [ref=f1e746]: 
                  - text: COZINHA
                - paragraph
                - heading "Balcao para Pia Cadorin Laura 2pt 3gv 120cm Freijo/Fume" [level=3] [ref=f1e747]
                - generic [ref=f1e748]:
                  - generic [ref=f1e749]: "SKU: 003966-01"
                  - generic [ref=f1e750]: "ESTOQUE: 0"
                  - generic [ref=f1e751]: R$ 399,00
              - generic [ref=f1e752]:
                - generic [ref=f1e753]:
                  - button "" [ref=f1e754] [cursor=pointer]
                  - generic [ref=f1e756]: Não Pub.
                - generic [ref=f1e757]:
                  - button "" [ref=f1e758] [cursor=pointer]
                  - generic [ref=f1e760]: Auto
                - generic [ref=f1e761]:
                  - generic [ref=f1e762]: 
                  - generic [ref=f1e764]: Ativo
              - generic [ref=f1e765]:
                - generic [ref=f1e766]: 
                - paragraph [ref=f1e767]: Nunca
            - generic [ref=f1e770]:
              - generic [ref=f1e771]: 
              - generic [ref=f1e774]:
                - generic [ref=f1e776]:
                  - generic [ref=f1e777]: 
                  - text: SALA DE JANTAR
                - paragraph
                - heading "Cadeira Doripel Antonela Giratoria Grande Bscg200 Preto" [level=3] [ref=f1e778]
                - generic [ref=f1e779]:
                  - generic [ref=f1e780]: "SKU: 003976-01"
                  - generic [ref=f1e781]: "ESTOQUE: 0"
                  - generic [ref=f1e782]: R$ 299,00
              - generic [ref=f1e783]:
                - generic [ref=f1e784]:
                  - button "" [ref=f1e785] [cursor=pointer]
                  - generic [ref=f1e787]: Não Pub.
                - generic [ref=f1e788]:
                  - button "" [ref=f1e789] [cursor=pointer]
                  - generic [ref=f1e791]: Auto
                - generic [ref=f1e792]:
                  - generic [ref=f1e793]: 
                  - generic [ref=f1e795]: Ativo
              - generic [ref=f1e796]:
                - generic [ref=f1e797]: 
                - paragraph [ref=f1e798]: Nunca
            - generic [ref=f1e801]:
              - generic [ref=f1e802]: 
              - generic [ref=f1e805]:
                - generic [ref=f1e807]:
                  - generic [ref=f1e808]: 
                  - text: COZINHA
                - paragraph
                - heading "Armario Aereo Cadorin Laura 1pt 70cm Fume" [level=3] [ref=f1e809]
                - generic [ref=f1e810]:
                  - generic [ref=f1e811]: "SKU: 003968-01"
                  - generic [ref=f1e812]: "ESTOQUE: 0"
                  - generic [ref=f1e813]: R$ 249,00
              - generic [ref=f1e814]:
                - generic [ref=f1e815]:
                  - button "" [ref=f1e816] [cursor=pointer]
                  - generic [ref=f1e818]: Não Pub.
                - generic [ref=f1e819]:
                  - button "" [ref=f1e820] [cursor=pointer]
                  - generic [ref=f1e822]: Auto
                - generic [ref=f1e823]:
                  - generic [ref=f1e824]: 
                  - generic [ref=f1e826]: Ativo
              - generic [ref=f1e827]:
                - generic [ref=f1e828]: 
                - paragraph [ref=f1e829]: Nunca
            - generic [ref=f1e832]:
              - generic [ref=f1e833]: 
              - generic [ref=f1e836]:
                - generic [ref=f1e838]:
                  - generic [ref=f1e839]: 
                  - text: SALA DE JANTAR
                - paragraph
                - heading "CJ SALA JANTAR MADETAL MOSCOU 136CM 4CAD GRECIA 4-172 Cinza" [level=3] [ref=f1e840]
                - generic [ref=f1e841]:
                  - generic [ref=f1e842]: "SKU: 001636-01"
                  - generic [ref=f1e843]: "ESTOQUE: 0"
                  - generic [ref=f1e844]: R$ 500,00
              - generic [ref=f1e845]:
                - generic [ref=f1e846]:
                  - button "" [ref=f1e847] [cursor=pointer]
                  - generic [ref=f1e849]: Não Pub.
                - generic [ref=f1e850]:
                  - button "" [ref=f1e851] [cursor=pointer]
                  - generic [ref=f1e853]: Auto
                - generic [ref=f1e854]:
                  - generic [ref=f1e855]: 
                  - generic [ref=f1e857]: Ativo
              - generic [ref=f1e858]:
                - generic [ref=f1e859]: 
                - paragraph [ref=f1e860]: Nunca
            - generic [ref=f1e863]:
              - generic [ref=f1e864]: 
              - generic [ref=f1e867]:
                - generic [ref=f1e869]:
                  - generic [ref=f1e870]: 
                  - text: QUARTO
                - paragraph
                - heading "Comoda Infantil Henn Aconchego 1pt 4gv Branco/Jequitiba Hp" [level=3] [ref=f1e871]
                - generic [ref=f1e872]:
                  - generic [ref=f1e873]: "SKU: 003983-01"
                  - generic [ref=f1e874]: "ESTOQUE: 0"
                  - generic [ref=f1e875]: R$ 999,00
              - generic [ref=f1e876]:
                - generic [ref=f1e877]:
                  - button "" [ref=f1e878] [cursor=pointer]
                  - generic [ref=f1e880]: Não Pub.
                - generic [ref=f1e881]:
                  - button "" [ref=f1e882] [cursor=pointer]
                  - generic [ref=f1e884]: Auto
                - generic [ref=f1e885]:
                  - generic [ref=f1e886]: 
                  - generic [ref=f1e888]: Ativo
              - generic [ref=f1e889]:
                - generic [ref=f1e890]: 
                - paragraph [ref=f1e891]: Nunca
            - generic [ref=f1e894]:
              - generic [ref=f1e895]: 
              - generic [ref=f1e898]:
                - generic [ref=f1e900]:
                  - generic [ref=f1e901]: 
                  - text: QUARTO
                - paragraph
                - heading "Guarda Roupa Doripel New Xangai 6pt 2gv 100% MDF Off White/Nogueira" [level=3] [ref=f1e902]
                - generic [ref=f1e903]:
                  - generic [ref=f1e904]: "SKU: 003982-01"
                  - generic [ref=f1e905]: "ESTOQUE: 0"
                  - generic [ref=f1e906]: R$ 1.099,00
              - generic [ref=f1e907]:
                - generic [ref=f1e908]:
                  - button "" [ref=f1e909] [cursor=pointer]
                  - generic [ref=f1e911]: Não Pub.
                - generic [ref=f1e912]:
                  - button "" [ref=f1e913] [cursor=pointer]
                  - generic [ref=f1e915]: Auto
                - generic [ref=f1e916]:
                  - generic [ref=f1e917]: 
                  - generic [ref=f1e919]: Ativo
              - generic [ref=f1e920]:
                - generic [ref=f1e921]: 
                - paragraph [ref=f1e922]: Nunca
            - generic [ref=f1e925]:
              - generic [ref=f1e926]: 
              - generic [ref=f1e929]:
                - generic [ref=f1e931]:
                  - generic [ref=f1e932]: 
                  - text: COZINHA
                - paragraph
                - heading "Armário Telasul Lumina 80cm 2pt Cinza/Lacca Cinza" [level=3] [ref=f1e933]
                - generic [ref=f1e934]:
                  - generic [ref=f1e935]: "SKU: 003969-01"
                  - generic [ref=f1e936]: "ESTOQUE: 0"
                  - generic [ref=f1e937]: R$ 299,00
              - generic [ref=f1e938]:
                - generic [ref=f1e939]:
                  - button "" [ref=f1e940] [cursor=pointer]
                  - generic [ref=f1e942]: Não Pub.
                - generic [ref=f1e943]:
                  - button "" [ref=f1e944] [cursor=pointer]
                  - generic [ref=f1e946]: Auto
                - generic [ref=f1e947]:
                  - generic [ref=f1e948]: 
                  - generic [ref=f1e950]: Ativo
              - generic [ref=f1e951]:
                - generic [ref=f1e952]: 
                - paragraph [ref=f1e953]: Nunca
            - generic [ref=f1e956]:
              - generic [ref=f1e957]: 
              - generic [ref=f1e960]:
                - generic [ref=f1e962]:
                  - generic [ref=f1e963]: 
                  - text: QUARTO
                - paragraph
                - heading "Colchão Queen 158 Castor Sleep Max D45 Marrom/Bege" [level=3] [ref=f1e964]
                - generic [ref=f1e965]:
                  - generic [ref=f1e966]: "SKU: 003997-01"
                  - generic [ref=f1e967]: "ESTOQUE: 0"
                  - generic [ref=f1e968]: R$ 1.999,00
              - generic [ref=f1e969]:
                - generic [ref=f1e970]:
                  - button "" [ref=f1e971] [cursor=pointer]
                  - generic [ref=f1e973]: Não Pub.
                - generic [ref=f1e974]:
                  - button "" [ref=f1e975] [cursor=pointer]
                  - generic [ref=f1e977]: Auto
                - generic [ref=f1e978]:
                  - generic [ref=f1e979]: 
                  - generic [ref=f1e981]: Ativo
              - generic [ref=f1e982]:
                - generic [ref=f1e983]: 
                - paragraph [ref=f1e984]: Nunca
          - generic [ref=f1e985]:
            - button "" [disabled] [ref=f1e986]
            - generic [ref=f1e988]: Página 1 de 12
            - button "" [ref=f1e989] [cursor=pointer]
    - generic [ref=f1e992]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=f1e993] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=f1e995]
  - region "Notifications Alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Suíte E2E Playwright — Catálogo de Canais (ChannelCatalog)
  5   |  *
  6   |  * Cobertura Completa:
  7   |  * 1. Carregamento inicial em "Todos" com no máximo 30 itens e paginação server-side
  8   |  * 2. Navegação entre páginas (Próxima / Anterior) com controle de botões
  9   |  * 3. Prova de Filtro Server-Side: Seleção de categoria busca no servidor e reseta para Página 1
  10  |  * 4. Busca Global Server-Side com debounce
  11  |  * 5. Combinação de Filtros (Canal + Busca + Coleção)
  12  |  * 6. Responsividade Visual em Desktop, Tablet e Mobile
  13  |  * 7. Monitoramento estrito do Console contra erros e exceções
  14  |  * 8. Prova Inconteste de Categoria Ausente nos Primeiros 30:
  15  |  *    Localiza itens em páginas subsequentes de "Todos", anota suas coleções, clica na coleção e
  16  |  *    comprova que os itens aparecem imediatamente na Página 1 da coleção.
  17  |  */
  18  | 
  19  | const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  20  | 
  21  | test.describe('Marketing — Catálogo de Canais (ChannelCatalog)', () => {
  22  |     let consoleErrors: string[] = [];
  23  |     let pageErrors: string[] = [];
  24  | 
  25  |     test.beforeEach(async ({ page }) => {
  26  |         consoleErrors = [];
  27  |         pageErrors = [];
  28  | 
  29  |         page.on('console', (msg) => {
  30  |             if (msg.type() === 'error') {
  31  |                 consoleErrors.push(msg.text());
  32  |             }
  33  |         });
  34  | 
  35  |         page.on('pageerror', (err) => {
  36  |             pageErrors.push(err.message);
  37  |         });
  38  |     });
  39  | 
  40  |     test.afterEach(async () => {
  41  |         const criticalErrors = consoleErrors.filter(
  42  |             (msg) =>
  43  |                 !msg.includes('favicon') &&
  44  |                 !msg.includes('React DevTools') &&
  45  |                 !msg.includes('net::ERR_FAILED') &&
  46  |                 !msg.includes('Failed to load resource')
  47  |         );
  48  | 
> 49  |         expect(criticalErrors, 'Erros críticos de console detectados').toEqual([]);
      |                                                                        ^ Error: Erros críticos de console detectados
  50  |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  51  |     });
  52  | 
  53  |     test('1. Carregamento inicial com no máximo 30 variações e todas as coleções disponíveis', async ({ page }) => {
  54  |         await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  55  | 
  56  |         await expect(page.locator('h1:has-text("Catálogo de Canais")')).toBeVisible({ timeout: 15000 });
  57  |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  58  | 
  59  |         const countSummary = page.locator('text=VARIAÇÃO');
  60  |         await expect(countSummary.first()).toBeVisible();
  61  | 
  62  |         const allCollectionsBtn = page.locator('button:has-text("Todas as Coleções")');
  63  |         await expect(allCollectionsBtn).toBeVisible({ timeout: 10000 });
  64  |     });
  65  | 
  66  |     test('2. Navegação entre páginas (Próxima / Anterior) e integridade de botões', async ({ page }) => {
  67  |         await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  68  |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  69  | 
  70  |         const pageIndicator = page.locator('text=Página 1 de');
  71  |         const hasPagination = await pageIndicator.isVisible({ timeout: 5000 }).catch(() => false);
  72  | 
  73  |         if (hasPagination) {
  74  |             const prevButton = page.locator('button[title="Página Anterior"]');
  75  |             await expect(prevButton).toBeDisabled();
  76  | 
  77  |             const nextButton = page.locator('button[title="Próxima Página"]');
  78  |             if (await nextButton.isEnabled()) {
  79  |                 await nextButton.click();
  80  | 
  81  |                 await expect(page.locator('text=Página 2 de')).toBeVisible({ timeout: 10000 });
  82  |                 await expect(prevButton).toBeEnabled();
  83  | 
  84  |                 await prevButton.click();
  85  |                 await expect(page.locator('text=Página 1 de')).toBeVisible({ timeout: 10000 });
  86  |             }
  87  |         }
  88  |     });
  89  | 
  90  |     test('3. Filtro de Categoria Server-Side: garante busca no banco e reset para Página 1', async ({ page }) => {
  91  |         await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  92  |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  93  | 
  94  |         const collectionButtons = page.locator('button:has(.bi-geo-alt-fill), button:has(.bi-collection-fill)');
  95  |         const count = await collectionButtons.count();
  96  | 
  97  |         if (count > 0) {
  98  |             const targetCollectionBtn = collectionButtons.first();
  99  |             const collectionName = (await targetCollectionBtn.innerText()).trim();
  100 | 
  101 |             await targetCollectionBtn.click();
  102 |             await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  103 | 
  104 |             const pageIndicator = page.locator('text=Página 1 de');
  105 |             if (await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
  106 |                 await expect(pageIndicator).toBeVisible();
  107 |             }
  108 | 
  109 |             await expect(page.locator(`text=${collectionName}`).first()).toBeVisible();
  110 | 
  111 |             const allBtn = page.locator('button:has-text("Todas as Coleções")');
  112 |             await allBtn.click();
  113 |             await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  114 |         }
  115 |     });
  116 | 
  117 |     test('4. Prova Server-Side: produto fora dos primeiros 30 de "Todos" aparece ao filtrar pela sua categoria', async ({ page }) => {
  118 |         await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  119 |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  120 | 
  121 |         // 1. Coleta os nomes das variações presentes na Página 1 de "Todos"
  122 |         const firstPageItems = await page.locator('.shadow-premium-sm h3').allInnerTexts();
  123 |         const firstPageSet = new Set(firstPageItems.map(s => s.trim().toUpperCase()));
  124 | 
  125 |         // 2. Navega para a Página 2 para encontrar um produto que NÃO está na Página 1
  126 |         const nextButton = page.locator('button[title="Próxima Página"]');
  127 |         if (await nextButton.isVisible() && await nextButton.isEnabled()) {
  128 |             await nextButton.click();
  129 |             await expect(page.locator('text=Página 2 de')).toBeVisible({ timeout: 10000 });
  130 |             await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  131 | 
  132 |             // Pega o primeiro card da Página 2
  133 |             const secondPageCards = page.locator('.shadow-premium-sm:has(h3)');
  134 |             const firstCardP2 = secondPageCards.first();
  135 |             const itemP2Name = (await firstCardP2.locator('h3').innerText()).trim().toUpperCase();
  136 | 
  137 |             // Confirma que este item realmente NÃO estava na Página 1
  138 |             expect(firstPageSet.has(itemP2Name)).toBe(false);
  139 | 
  140 |             // Verifica se este card possui badge de coleção/ambiente/tipo
  141 |             const badge = firstCardP2.locator('.bi-geo-alt-fill, .bi-collection-fill').first();
  142 |             if (await badge.isVisible().catch(() => false)) {
  143 |                 const badgeContainer = badge.locator('..');
  144 |                 const badgeText = (await badgeContainer.innerText()).trim().toUpperCase();
  145 | 
  146 |                 // 3. Procura o botão correspondente a essa categoria no menu superior
  147 |                 const categoryBtn = page.locator(`button:has-text("${badgeText}")`).first();
  148 |                 if (await categoryBtn.isVisible().catch(() => false)) {
  149 |                     await categoryBtn.click();
```