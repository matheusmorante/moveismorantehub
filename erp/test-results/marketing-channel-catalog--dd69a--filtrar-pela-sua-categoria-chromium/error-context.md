# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing\channel-catalog.spec.ts >> Marketing — Catálogo de Canais (ChannelCatalog) >> 4. Prova Server-Side: produto fora dos primeiros 30 de "Todos" aparece ao filtrar pela sua categoria
- Location: tests\e2e\marketing\channel-catalog.spec.ts:117:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - region "Notifications Alt+T"
    - main [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]:
            - heading "Catálogo de Canais" [level=1] [ref=e8]
            - paragraph [ref=e9]: Variações publicadas por coleção
          - generic [ref=e10]:
            - button " Atualizar WhatsApp" [ref=e11] [cursor=pointer]:
              - generic [ref=e12]: 
              - text: Atualizar WhatsApp
            - generic [ref=e13]:
              - generic [ref=e14]: 
              - textbox "BUSCAR VARIAÇÃO OU SKU..." [ref=e15]
            - combobox [ref=e16] [cursor=pointer]:
              - option "TODOS OS CANAIS" [selected]
              - option "WHATSAPP SHOP"
              - option "CATÁLOGO DIGITAL"
            - button "" [ref=e17] [cursor=pointer]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: 
            - generic [ref=e24]:
              - heading "Coleções do Catálogo Meta" [level=3] [ref=e25]
              - paragraph [ref=e26]: Product Sets no WhatsApp Business
          - button " Gerenciar Coleções Meta" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: 
            - text: Gerenciar Coleções Meta
        - generic [ref=e29]:
          - button " Produtos" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: 
            - text: Produtos
          - button " Design & Cores" [ref=e32] [cursor=pointer]:
            - generic [ref=e33]: 
            - text: Design & Cores
          - button " Banners" [ref=e34] [cursor=pointer]:
            - generic [ref=e35]: 
            - text: Banners
          - button " Oportunidades" [ref=e36] [cursor=pointer]:
            - generic [ref=e37]: 
            - text: Oportunidades
          - button " Configurações" [ref=e38] [cursor=pointer]:
            - generic [ref=e39]: 
            - text: Configurações
        - generic [ref=e40]:
          - generic [ref=e41]:
            - button "Todas as Coleções" [ref=e42] [cursor=pointer]
            - button " COZINHA" [ref=e43] [cursor=pointer]:
              - generic [ref=e44]: 
              - text: COZINHA
            - button " QUARTO" [ref=e45] [cursor=pointer]:
              - generic [ref=e46]: 
              - text: QUARTO
            - button " SALA DE JANTAR" [ref=e47] [cursor=pointer]:
              - generic [ref=e48]: 
              - text: SALA DE JANTAR
          - generic [ref=e49]:
            - generic [ref=e50]: 31 VARIAÇÃOÕES DA PÁGINA
            - generic [ref=e51]: ·
            - generic [ref=e52]: 337 TOTAIS
            - generic [ref=e53]: ·
            - generic [ref=e54]: 0 NO WHATSAPP
          - generic [ref=e55]:
            - generic [ref=e58]:
              - generic [ref=e59]: 
              - generic [ref=e62]:
                - generic [ref=e64]:
                  - generic [ref=e65]: 
                  - text: QUARTO
                - paragraph
                - heading "Colchão Queen 158 Castor Sleep Max D45 Marrom/Bege" [level=3] [ref=e66]
                - generic [ref=e67]:
                  - generic [ref=e68]: "SKU: 003997-01"
                  - generic [ref=e69]: "ESTOQUE: 0"
                  - generic [ref=e70]: R$ 1.999,00
              - generic [ref=e71]:
                - generic [ref=e72]:
                  - button "" [ref=e73] [cursor=pointer]
                  - generic [ref=e75]: Não Pub.
                - generic [ref=e76]:
                  - button "" [ref=e77] [cursor=pointer]
                  - generic [ref=e79]: Auto
                - generic [ref=e80]:
                  - generic [ref=e81]: 
                  - generic [ref=e83]: Ativo
              - generic [ref=e84]:
                - generic [ref=e85]: 
                - paragraph [ref=e86]: Nunca
            - generic [ref=e89]:
              - generic [ref=e90]: 
              - generic [ref=e93]:
                - generic [ref=e95]:
                  - generic [ref=e96]: 
                  - text: SALA DE JANTAR
                - paragraph
                - heading "Mesa Madetal Onix MDF/Vidro 154 X 90 Mel/Nude/Nude" [level=3] [ref=e97]
                - generic [ref=e98]:
                  - generic [ref=e99]: "SKU: 003988-01"
                  - generic [ref=e100]: "ESTOQUE: 0"
                  - generic [ref=e101]: R$ 999,00
              - generic [ref=e102]:
                - generic [ref=e103]:
                  - button "" [ref=e104] [cursor=pointer]
                  - generic [ref=e106]: Não Pub.
                - generic [ref=e107]:
                  - button "" [ref=e108] [cursor=pointer]
                  - generic [ref=e110]: Auto
                - generic [ref=e111]:
                  - generic [ref=e112]: 
                  - generic [ref=e114]: Ativo
              - generic [ref=e115]:
                - generic [ref=e116]: 
                - paragraph [ref=e117]: Nunca
            - generic [ref=e120]:
              - generic [ref=e121]: 
              - generic [ref=e124]:
                - generic [ref=e126]:
                  - generic [ref=e127]: 
                  - text: QUARTO
                - paragraph
                - heading "Berço Mini Cama Henn Aconcheg Branco/Jequitiba Hp" [level=3] [ref=e128]
                - generic [ref=e129]:
                  - generic [ref=e130]: "SKU: 003984-01"
                  - generic [ref=e131]: "ESTOQUE: 0"
                  - generic [ref=e132]: R$ 999,00
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - button "" [ref=e135] [cursor=pointer]
                  - generic [ref=e137]: Não Pub.
                - generic [ref=e138]:
                  - button "" [ref=e139] [cursor=pointer]
                  - generic [ref=e141]: Auto
                - generic [ref=e142]:
                  - generic [ref=e143]: 
                  - generic [ref=e145]: Ativo
              - generic [ref=e146]:
                - generic [ref=e147]: 
                - paragraph [ref=e148]: Nunca
            - generic [ref=e151]:
              - generic [ref=e152]: 
              - generic [ref=e155]:
                - generic [ref=e157]:
                  - generic [ref=e158]: 
                  - text: SALA DE ESTAR
                - paragraph
                - heading "Sofá Woodx Khalifa 4lug 2,50 M Veludo Café" [level=3] [ref=e159]
                - generic [ref=e160]:
                  - generic [ref=e161]: "SKU: 003990-01"
                  - generic [ref=e162]: "ESTOQUE: 0"
                  - generic [ref=e163]: R$ 2.999,00
              - generic [ref=e164]:
                - generic [ref=e165]:
                  - button "" [ref=e166] [cursor=pointer]
                  - generic [ref=e168]: Não Pub.
                - generic [ref=e169]:
                  - button "" [ref=e170] [cursor=pointer]
                  - generic [ref=e172]: Auto
                - generic [ref=e173]:
                  - generic [ref=e174]: 
                  - generic [ref=e176]: Ativo
              - generic [ref=e177]:
                - generic [ref=e178]: 
                - paragraph [ref=e179]: Nunca
            - generic [ref=e182]:
              - generic [ref=e183]: 
              - generic [ref=e186]:
                - generic [ref=e188]:
                  - generic [ref=e189]: 
                  - text: QUARTO
                - paragraph
                - heading "COMODA EVIDENCIA CP25 2PT 5GV cp251 Branco" [level=3] [ref=e190]
                - generic [ref=e191]:
                  - generic [ref=e192]: "SKU: 001633-01"
                  - generic [ref=e193]: "ESTOQUE: 0"
                  - generic [ref=e194]: R$ 399,00
              - generic [ref=e195]:
                - generic [ref=e196]:
                  - button "" [ref=e197] [cursor=pointer]
                  - generic [ref=e199]: Não Pub.
                - generic [ref=e200]:
                  - button "" [ref=e201] [cursor=pointer]
                  - generic [ref=e203]: Auto
                - generic [ref=e204]:
                  - generic [ref=e205]: 
                  - generic [ref=e207]: Ativo
              - generic [ref=e208]:
                - generic [ref=e209]: 
                - paragraph [ref=e210]: Nunca
            - generic [ref=e213]:
              - generic [ref=e214]: 
              - generic [ref=e217]:
                - generic [ref=e219]:
                  - generic [ref=e220]: 
                  - text: COZINHA
                - paragraph
                - heading "BALCAO COOKTOP NOTAVEL NT 3110 1GV P/4BOCAS NT3110.755433 Freijo Trend/Branco New Freijo" [level=3] [ref=e221]
                - generic [ref=e222]:
                  - generic [ref=e223]: "SKU: 003961-01"
                  - generic [ref=e224]: "ESTOQUE: 0"
                  - generic [ref=e225]: R$ 399,00
              - generic [ref=e226]:
                - generic [ref=e227]:
                  - button "" [ref=e228] [cursor=pointer]
                  - generic [ref=e230]: Não Pub.
                - generic [ref=e231]:
                  - button "" [ref=e232] [cursor=pointer]
                  - generic [ref=e234]: Auto
                - generic [ref=e235]:
                  - generic [ref=e236]: 
                  - generic [ref=e238]: Ativo
              - generic [ref=e239]:
                - generic [ref=e240]: 
                - paragraph [ref=e241]: Nunca
            - generic [ref=e244]:
              - generic [ref=e245]: 
              - generic [ref=e248]:
                - generic [ref=e250]:
                  - generic [ref=e251]: 
                  - text: COZINHA
                - paragraph
                - heading "Armario Aereo Cadorin Laura 1pt 70cm Fume" [level=3] [ref=e252]
                - generic [ref=e253]:
                  - generic [ref=e254]: "SKU: 003968-01"
                  - generic [ref=e255]: "ESTOQUE: 0"
                  - generic [ref=e256]: R$ 249,00
              - generic [ref=e257]:
                - generic [ref=e258]:
                  - button "" [ref=e259] [cursor=pointer]
                  - generic [ref=e261]: Não Pub.
                - generic [ref=e262]:
                  - button "" [ref=e263] [cursor=pointer]
                  - generic [ref=e265]: Auto
                - generic [ref=e266]:
                  - generic [ref=e267]: 
                  - generic [ref=e269]: Ativo
              - generic [ref=e270]:
                - generic [ref=e271]: 
                - paragraph [ref=e272]: Nunca
            - generic [ref=e275]:
              - generic [ref=e276]: 
              - generic [ref=e279]:
                - generic [ref=e281]:
                  - generic [ref=e282]: 
                  - text: QUARTO
                - paragraph
                - heading "Comoda Infantil Henn Aconchego 1pt 4gv Branco/Jequitiba Hp" [level=3] [ref=e283]
                - generic [ref=e284]:
                  - generic [ref=e285]: "SKU: 003983-01"
                  - generic [ref=e286]: "ESTOQUE: 0"
                  - generic [ref=e287]: R$ 999,00
              - generic [ref=e288]:
                - generic [ref=e289]:
                  - button "" [ref=e290] [cursor=pointer]
                  - generic [ref=e292]: Não Pub.
                - generic [ref=e293]:
                  - button "" [ref=e294] [cursor=pointer]
                  - generic [ref=e296]: Auto
                - generic [ref=e297]:
                  - generic [ref=e298]: 
                  - generic [ref=e300]: Ativo
              - generic [ref=e301]:
                - generic [ref=e302]: 
                - paragraph [ref=e303]: Nunca
            - generic [ref=e306]:
              - generic [ref=e307]: 
              - generic [ref=e310]:
                - generic [ref=e312]:
                  - generic [ref=e313]: 
                  - text: QUARTO
                - paragraph
                - heading "G ROUPA DEMOBILE CADIS 4PT 6GV ESP PES 66510-140 Amendola/Off White" [level=3] [ref=e314]
                - generic [ref=e315]:
                  - generic [ref=e316]: "SKU: 000382-01"
                  - generic [ref=e317]: "ESTOQUE: 1"
                  - generic [ref=e318]: R$ 243,72
              - generic [ref=e319]:
                - generic [ref=e320]:
                  - button "" [ref=e321] [cursor=pointer]
                  - generic [ref=e323]: Não Pub.
                - generic [ref=e324]:
                  - button "" [ref=e325] [cursor=pointer]
                  - generic [ref=e327]: Auto
                - generic [ref=e328]:
                  - generic [ref=e329]: 
                  - generic [ref=e331]: Inativo
              - generic [ref=e332]:
                - generic [ref=e333]: 
                - paragraph [ref=e334]: Nunca
            - generic [ref=e337]:
              - generic [ref=e338]: 
              - generic [ref=e341]:
                - generic [ref=e343]:
                  - generic [ref=e344]: 
                  - text: COZINHA
                - paragraph
                - heading "Balcão para Cooktop 1,05 Indekes 1pt 1gv C/Tampo Freijo/Off White" [level=3] [ref=e345]
                - generic [ref=e346]:
                  - generic [ref=e347]: "SKU: 003985-01"
                  - generic [ref=e348]: "ESTOQUE: 0"
                  - generic [ref=e349]: R$ 299,00
              - generic [ref=e350]:
                - generic [ref=e351]:
                  - button "" [ref=e352] [cursor=pointer]
                  - generic [ref=e354]: Não Pub.
                - generic [ref=e355]:
                  - button "" [ref=e356] [cursor=pointer]
                  - generic [ref=e358]: Auto
                - generic [ref=e359]:
                  - generic [ref=e360]: 
                  - generic [ref=e362]: Ativo
              - generic [ref=e363]:
                - generic [ref=e364]: 
                - paragraph [ref=e365]: Nunca
            - generic [ref=e368]:
              - generic [ref=e369]: 
              - generic [ref=e372]:
                - generic [ref=e374]:
                  - generic [ref=e375]: 
                  - text: SALA DE JANTAR
                - paragraph
                - heading "Armario Multiuso Notavel Nt 4015 2pt Branco" [level=3] [ref=e376]
                - generic [ref=e377]:
                  - generic [ref=e378]: "SKU: 001637-01"
                  - generic [ref=e379]: "ESTOQUE: 0"
                  - generic [ref=e380]: R$ 499,00
              - generic [ref=e381]:
                - generic [ref=e382]:
                  - button "" [ref=e383] [cursor=pointer]
                  - generic [ref=e385]: Não Pub.
                - generic [ref=e386]:
                  - button "" [ref=e387] [cursor=pointer]
                  - generic [ref=e389]: Auto
                - generic [ref=e390]:
                  - generic [ref=e391]: 
                  - generic [ref=e393]: Ativo
              - generic [ref=e394]:
                - generic [ref=e395]: 
                - paragraph [ref=e396]: Nunca
            - generic [ref=e399]:
              - generic [ref=e400]: 
              - generic [ref=e403]:
                - generic [ref=e405]:
                  - generic [ref=e406]: 
                  - text: QUARTO
                - paragraph
                - heading "Guarda Roupa Evidencia New Monaco 6pt 12gv Preto" [level=3] [ref=e407]
                - generic [ref=e408]:
                  - generic [ref=e409]: "SKU: 003979-01"
                  - generic [ref=e410]: "ESTOQUE: 0"
                  - generic [ref=e411]: R$ 1.999,00
              - generic [ref=e412]:
                - generic [ref=e413]:
                  - button "" [ref=e414] [cursor=pointer]
                  - generic [ref=e416]: Não Pub.
                - generic [ref=e417]:
                  - button "" [ref=e418] [cursor=pointer]
                  - generic [ref=e420]: Auto
                - generic [ref=e421]:
                  - generic [ref=e422]: 
                  - generic [ref=e424]: Ativo
              - generic [ref=e425]:
                - generic [ref=e426]: 
                - paragraph [ref=e427]: Nunca
            - generic [ref=e430]:
              - generic [ref=e431]: 
              - generic [ref=e434]:
                - generic [ref=e436]:
                  - generic [ref=e437]: 
                  - text: QUARTO
                - paragraph
                - heading "Base Bau Casal 1,38 Damulti Premium Linho Marrom" [level=3] [ref=e438]
                - generic [ref=e439]:
                  - generic [ref=e440]: "SKU: 003999-01"
                  - generic [ref=e441]: "ESTOQUE: 0"
                  - generic [ref=e442]: R$ 1.299,00
              - generic [ref=e443]:
                - generic [ref=e444]:
                  - button "" [ref=e445] [cursor=pointer]
                  - generic [ref=e447]: Não Pub.
                - generic [ref=e448]:
                  - button "" [ref=e449] [cursor=pointer]
                  - generic [ref=e451]: Auto
                - generic [ref=e452]:
                  - generic [ref=e453]: 
                  - generic [ref=e455]: Ativo
              - generic [ref=e456]:
                - generic [ref=e457]: 
                - paragraph [ref=e458]: Nunca
            - generic [ref=e461]:
              - generic [ref=e462]: 
              - generic [ref=e465]:
                - generic [ref=e467]:
                  - generic [ref=e468]: 
                  - text: QUARTO
                - paragraph
                - heading "Guarda Roupa Faimec Salvador 6pt 2gv Canela/Off White" [level=3] [ref=e469]
                - generic [ref=e470]:
                  - generic [ref=e471]: "SKU: 003964-01"
                  - generic [ref=e472]: "ESTOQUE: 0"
                  - generic [ref=e473]: R$ 1.399,00
              - generic [ref=e474]:
                - generic [ref=e475]:
                  - button "" [ref=e476] [cursor=pointer]
                  - generic [ref=e478]: Não Pub.
                - generic [ref=e479]:
                  - button "" [ref=e480] [cursor=pointer]
                  - generic [ref=e482]: Auto
                - generic [ref=e483]:
                  - generic [ref=e484]: 
                  - generic [ref=e486]: Ativo
              - generic [ref=e487]:
                - generic [ref=e488]: 
                - paragraph [ref=e489]: Nunca
            - generic [ref=e492]:
              - generic [ref=e493]: 
              - generic [ref=e496]:
                - generic [ref=e498]:
                  - generic [ref=e499]: 
                  - text: SALA DE ESTAR
                - paragraph
                - heading "Bancada Notavel Nt1180 2pt P/Tv 50\" Freijo Trend/Off White" [level=3] [ref=e500]
                - generic [ref=e501]:
                  - generic [ref=e502]: "SKU: 003960-01"
                  - generic [ref=e503]: "ESTOQUE: 0"
                  - generic [ref=e504]: R$ 399,00
              - generic [ref=e505]:
                - generic [ref=e506]:
                  - button "" [ref=e507] [cursor=pointer]
                  - generic [ref=e509]: Não Pub.
                - generic [ref=e510]:
                  - button "" [ref=e511] [cursor=pointer]
                  - generic [ref=e513]: Auto
                - generic [ref=e514]:
                  - generic [ref=e515]: 
                  - generic [ref=e517]: Ativo
              - generic [ref=e518]:
                - generic [ref=e519]: 
                - paragraph [ref=e520]: Nunca
            - generic [ref=e523]:
              - generic [ref=e524]: 
              - generic [ref=e527]:
                - generic [ref=e529]:
                  - generic [ref=e530]: 
                  - text: COZINHA
                - paragraph
                - heading "Paneleiro Telasul Star New 4pt 80cm Branco" [level=3] [ref=e531]
                - generic [ref=e532]:
                  - generic [ref=e533]: "SKU: 003992-01"
                  - generic [ref=e534]: "ESTOQUE: 0"
                  - generic [ref=e535]: R$ 999,00
              - generic [ref=e536]:
                - generic [ref=e537]:
                  - button "" [ref=e538] [cursor=pointer]
                  - generic [ref=e540]: Não Pub.
                - generic [ref=e541]:
                  - button "" [ref=e542] [cursor=pointer]
                  - generic [ref=e544]: Auto
                - generic [ref=e545]:
                  - generic [ref=e546]: 
                  - generic [ref=e548]: Ativo
              - generic [ref=e549]:
                - generic [ref=e550]: 
                - paragraph [ref=e551]: Nunca
            - generic [ref=e554]:
              - img "Balcao para Pia Cadorin Laura 2pt 3gv 120cm Freijo/Fume" [ref=e556]
              - generic [ref=e557]:
                - generic [ref=e559]:
                  - generic [ref=e560]: 
                  - text: COZINHA
                - paragraph
                - heading "Balcao para Pia Cadorin Laura 2pt 3gv 120cm Freijo/Fume" [level=3] [ref=e561]
                - generic [ref=e562]:
                  - generic [ref=e563]: "SKU: 003966-01"
                  - generic [ref=e564]: "ESTOQUE: 0"
                  - generic [ref=e565]: R$ 399,00
              - generic [ref=e566]:
                - generic [ref=e567]:
                  - button "" [ref=e568] [cursor=pointer]
                  - generic [ref=e570]: Não Pub.
                - generic [ref=e571]:
                  - button "" [ref=e572] [cursor=pointer]
                  - generic [ref=e574]: Auto
                - generic [ref=e575]:
                  - generic [ref=e576]: 
                  - generic [ref=e578]: Ativo
              - generic [ref=e579]:
                - generic [ref=e580]: 
                - paragraph [ref=e581]: Nunca
            - generic [ref=e584]:
              - generic [ref=e585]: 
              - generic [ref=e588]:
                - paragraph [ref=e589]: "‼️ Móvel do lote dos salvados, em última unidade do mostruário, com avarias, como mostrado nas últimas imagens, e preço super reduzido. Aproveite ‼️ Balcão para Cooktop 5 Bocas 1 Porta com Tampo NT 3050 Notável Móveis, combina estilo com funcionalidade! Ele possui tampo para cooktop de 05 bocas, 1 gavetão com amplo espaço e corrediças telescópicas, além de uma porta com 1 prateleira interna para você organizar seus utensílios. Tem também espaço para forno micro-ondas que irá deixar tudo a mão no momento mais gostoso do dia! Características: Estrutura em MDP em 15mm 1 Nicho, suporta peso máximo de 16kg 1 Porta 1 Prateleira interna removível, suporta peso máximo de 2 kg 1 Gavetão com corrediça telescópica Dobradiça super curva 26mm Puxador em plástico VPS Dimensões: Altura: 87,20 cm Largura: 110,6 cm Profundidade: 52 cm Peso: 31,6 kg"
                - heading "Balcão para Cooktop 5 Bocas 1 Porta com Tampo NT 3050 QUEIMA DOS SALVADOS" [level=3] [ref=e590]
                - generic [ref=e591]:
                  - generic [ref=e592]: "SKU: 000319-01"
                  - generic [ref=e593]: "ESTOQUE: 0"
                  - generic [ref=e594]: R$ 399,00
              - generic [ref=e595]:
                - generic [ref=e596]:
                  - button "" [ref=e597] [cursor=pointer]
                  - generic [ref=e599]: Não Pub.
                - generic [ref=e600]:
                  - button "" [ref=e601] [cursor=pointer]
                  - generic [ref=e603]: Auto
                - generic [ref=e604]:
                  - generic [ref=e605]: 
                  - generic [ref=e607]: Ativo
              - generic [ref=e608]:
                - generic [ref=e609]: 
                - paragraph [ref=e610]: Nunca
            - generic [ref=e613]:
              - generic [ref=e614]: 
              - generic [ref=e617]:
                - paragraph [ref=e618]: "Apresentamos o magnífico Guarda Roupa Solteiro com Pés 6 Portas 2 Gavetas Capri Poquema, uma peça cuidadosamente projetada para elevar o seu ambiente de dormitório a um patamar de elegância e funcionalidade incomparáveis. Com suas seis portas e duas gavetas, este roupeiro oferece um espaço generoso e repartições internas inteligentes, tornando-se a solução perfeita para atender às suas necessidades de organização. Cada aspecto do Guarda Roupa Capri foi concebido para suprir todas as suas demandas de armazenamento. Transforme o seu dormitório em um refúgio de elegância com o Guarda Roupa Capri. Características: 2 Gavetas com corrediças metálicas 6 Portas Acabamento em Pintura UV Dobradiças metálicas Estrutura em MDP 12mm Puxadores em plástico Pés em plástico Dimensões: Altura: 182 cm Largura: 135 cm Profundidade: 38 cm Peso: 73,15 kg"
                - heading "Guarda Roupa Solteiro com Pés 6 Portas 2 Gavetas Capri Poquema" [level=3] [ref=e619]
                - generic [ref=e620]:
                  - generic [ref=e621]: "SKU: 000300-01"
                  - generic [ref=e622]: "ESTOQUE: 0"
                  - generic [ref=e623]: R$ 699,00
              - generic [ref=e624]:
                - generic [ref=e625]:
                  - button "" [ref=e626] [cursor=pointer]
                  - generic [ref=e628]: Não Pub.
                - generic [ref=e629]:
                  - button "" [ref=e630] [cursor=pointer]
                  - generic [ref=e632]: Auto
                - generic [ref=e633]:
                  - generic [ref=e634]: 
                  - generic [ref=e636]: Ativo
              - generic [ref=e637]:
                - generic [ref=e638]: 
                - paragraph [ref=e639]: Nunca
            - generic [ref=e642]:
              - generic [ref=e643]: 
              - generic [ref=e646]:
                - paragraph [ref=e647]: "Características do Produto A Cômoda 1 porta e 5 gavetas da Aramóveis é produzida com material de qualidade e contém design funcional e sofisticado. Dispõe de amplo espaço para armazenamento de pertences. Seu tampo em vidro confere elegância à peça e torna visível o porta joias presente na primeira gaveta, proporcionando um toque de sofisticação. Características: Estrutura em MDP 12mm e 15mm de espessura Tampo de vidro 1 Porta Dobradiças metálicas 1 Prateleira 5 Gavetas Corrediças telescópicas Porta jóias na primeira gaveta Puxadores em ABS Acabamento em verniz alto brilho Dimensões: Altura: 97,3 cm Largura: 110,4 cm Profundidade: 46,8 cm Peso: 53,60 kg"
                - heading "Cômoda 5 Gavetas 1 Porta com Vidro Aramóveis" [level=3] [ref=e648]
                - generic [ref=e649]:
                  - generic [ref=e650]: "SKU: 000310-01"
                  - generic [ref=e651]: "ESTOQUE: 0"
                  - generic [ref=e652]: R$ 799,00
              - generic [ref=e653]:
                - generic [ref=e654]:
                  - button "" [ref=e655] [cursor=pointer]
                  - generic [ref=e657]: Não Pub.
                - generic [ref=e658]:
                  - button "" [ref=e659] [cursor=pointer]
                  - generic [ref=e661]: Auto
                - generic [ref=e662]:
                  - generic [ref=e663]: 
                  - generic [ref=e665]: Ativo
              - generic [ref=e666]:
                - generic [ref=e667]: 
                - paragraph [ref=e668]: Nunca
            - generic [ref=e671]:
              - img "Cristaleira 1 Porta de Vidro LED Mirage Artely" [ref=e673]
              - generic [ref=e674]:
                - generic [ref=e675]:
                  - generic [ref=e676]:
                    - generic [ref=e677]: 
                    - text: Verificado na Meta
                  - generic [ref=e678]:
                    - generic [ref=e679]: 
                    - text: SALA DE ESTAR
                - paragraph [ref=e680]: "Cristaleira 1 Porta de Vidro Mirage Artely A Cristaleira Mirage foi criada para transformar o ambiente com elegância e leveza, combinando transparência, iluminação e um design refinado que valoriza cada detalhe da sua decoração. Seu formato vertical, aliado às portas de vidro e ao fundo com espelho, cria um efeito visual moderno e sofisticado, ampliando a sensação de espaço e destacando os objetos expostos. A iluminação em LED realça taças, garrafas e itens decorativos, proporcionando um ambiente mais acolhedor e requintado. Os nichos inclinados são ideais para acomodar garrafas com praticidade e charme, garantindo organização sem abrir mão da estética. O sistema de fechamento suave das portas reforça a qualidade do produto, oferecendo mais conforto e durabilidade no uso diário. Características: 1 porta de vidro temperado 3mm Fechamento suave graças às dobradiças com amortecimento Sofisticado espelho ao fundo 2 elegantes fitas de LED Sofisticado puxador de alumínio Nichos inclinados para até 10 garrafas 3 prateleiras internas Pés curvos de MDF 15mm Estrutura resistente de MDF/MDP de 15mm de espessura com pintura UV Dimensões: Altura: 186,5 cm Largura: 60 cm Profundidade: 40 cm Peso: 58,30 kg"
                - heading "Cristaleira 1 Porta de Vidro LED Mirage Artely" [level=3] [ref=e681]
                - generic [ref=e682]:
                  - generic [ref=e683]: "SKU: 000021-01"
                  - generic [ref=e684]: "ESTOQUE: 0"
                  - generic [ref=e685]: R$ 1.399,00
              - generic [ref=e686]:
                - generic [ref=e687]:
                  - button "" [ref=e688] [cursor=pointer]
                  - generic [ref=e690]: Não Pub.
                - generic [ref=e691]:
                  - button "" [ref=e692] [cursor=pointer]
                  - generic [ref=e694]: Auto
                - generic [ref=e695]:
                  - generic [ref=e696]: 
                  - generic [ref=e698]: Ativo
              - generic [ref=e699]:
                - generic [ref=e700]: 
                - paragraph [ref=e701]: Nunca
            - generic [ref=e704]:
              - img "Aparador para Café Cairo Pés Palito Branco" [ref=e706]
              - generic [ref=e707]:
                - generic [ref=e708]:
                  - generic [ref=e709]:
                    - generic [ref=e710]: 
                    - text: Verificado na Meta
                  - generic [ref=e711]:
                    - generic [ref=e712]: 
                    - text: SALA DE JANTAR
                - paragraph [ref=e713]: "Material 100% MDP, pés palito, novo 📏 Dimensões: Largura: 71x36x80cm ( larg x prof x altura)"
                - heading "Aparador para Café Cairo Pés Palito Branco" [level=3] [ref=e714]
                - generic [ref=e715]:
                  - generic [ref=e716]: "SKU: 000252-01"
                  - generic [ref=e717]: "ESTOQUE: 30"
                  - generic [ref=e718]: R$ 279,00
              - generic [ref=e719]:
                - generic [ref=e720]:
                  - button "" [ref=e721] [cursor=pointer]
                  - generic [ref=e723]: Não Pub.
                - generic [ref=e724]:
                  - button "" [ref=e725] [cursor=pointer]
                  - generic [ref=e727]: Auto
                - generic [ref=e728]:
                  - generic [ref=e729]: 
                  - generic [ref=e731]: Ativo
              - generic [ref=e732]:
                - generic [ref=e733]: 
                - paragraph [ref=e734]: Nunca
            - generic [ref=e737]:
              - img "Aparador para Café Cairo Pés Palito Preto" [ref=e739]
              - generic [ref=e740]:
                - generic [ref=e742]:
                  - generic [ref=e743]: 
                  - text: SALA DE JANTAR
                - paragraph [ref=e744]: "Material 100% MDP, pés palito, novo 📏 Dimensões: Largura: 71x36x80cm ( larg x prof x altura)"
                - heading "Aparador para Café Cairo Pés Palito Preto" [level=3] [ref=e745]
                - generic [ref=e746]:
                  - generic [ref=e747]: "SKU: 000252-02"
                  - generic [ref=e748]: "ESTOQUE: 0"
                  - generic [ref=e749]: R$ 279,00
              - generic [ref=e750]:
                - generic [ref=e751]:
                  - button "" [ref=e752] [cursor=pointer]
                  - generic [ref=e754]: Não Pub.
                - generic [ref=e755]:
                  - button "" [ref=e756] [cursor=pointer]
                  - generic [ref=e758]: Auto
                - generic [ref=e759]:
                  - generic [ref=e760]: 
                  - generic [ref=e762]: Ativo
              - generic [ref=e763]:
                - generic [ref=e764]: 
                - paragraph [ref=e765]: Nunca
            - generic [ref=e768]:
              - generic [ref=e769]: 
              - generic [ref=e772]:
                - paragraph [ref=e773]: "O Guarda Roupa Casal 8 Portas Paris Maxel Móveis, é ideal para quem busca funcionalidade e organização. Com ótimas divisões, varões de aluminio e gavetas para auxiliar acomodação de pequenos objetos. Oferece beleza e modernidade a mais no produto. Possui quatro gavetas, amplo espaço interno com divisões ele/ela, para cabideiros, prateleiras e calçados, seu designer interno possibilita organizar todas as roupas e acessórios. Características: Estrutura em MDP 8 Portas 4 Gavetas 8 Prateleiras 2 Cabideiros em madeira Corrediças metálicas Acabamento externo com pintura texturizada e aplicação de verniz fosco Acabamento interno na tonalidade linho Puxadores em MDF Gavetas suporta até 3kg Prateleiras suporta até 5kg Dimensões: Altura: 200 cm Largura: 237 cm Profundidade: 47 cm Peso: 128,00 kg"
                - heading "Guarda Roupa 2,37 Casal 8 Portas Paris QUEIMA DOS SALVADOS" [level=3] [ref=e774]
                - generic [ref=e775]:
                  - generic [ref=e776]: "SKU: 000312-01"
                  - generic [ref=e777]: "ESTOQUE: 0"
                  - generic [ref=e778]: R$ 1.499,00
              - generic [ref=e779]:
                - generic [ref=e780]:
                  - button "" [ref=e781] [cursor=pointer]
                  - generic [ref=e783]: Não Pub.
                - generic [ref=e784]:
                  - button "" [ref=e785] [cursor=pointer]
                  - generic [ref=e787]: Auto
                - generic [ref=e788]:
                  - generic [ref=e789]: 
                  - generic [ref=e791]: Inativo
              - generic [ref=e792]:
                - generic [ref=e793]: 
                - paragraph [ref=e794]: Nunca
            - generic [ref=e797]:
              - generic [ref=e798]: 
              - generic [ref=e801]:
                - paragraph [ref=e802]: "-Durabilidade e Resistência Extra: Fabricada em aço inox e acabamento 2B, essa pia é projetada para resistir ao uso diário e manter sua aparência impecável. -Leveza e Facilidade de Instalação: Considerada a pia concretada mais leve do mercado, é até 30% mais leve e 30% mais resistente, facilitando a instalação e o transporte. -Ampla Área de Trabalho e Ótima Vazão: O furo da válvula descentralizado oferece mais espaço na bancada e garante uma excelente vazão de água, ideal para o uso eficiente no dia a dia. -Estilo Moderno e Sofisticado: Inspirada no design americano e europeu, com acabamento refinado que confere elegância à sua cozinha. Características Técnicas: -Dimensões do Produto: 120cm x 53cm x 4cm (C x L x P). -Dimensões das Cubas: 40cm x 34cm x 12cm (C x L x P). -Material: Aço inox 430 de 0,4mm com acabamento 2B."
                - heading "Pia Inox 1,20 com Válvula Inoxsul Infinity" [level=3] [ref=e803]
                - generic [ref=e804]:
                  - generic [ref=e805]: "SKU: 000370-01"
                  - generic [ref=e806]: "ESTOQUE: 0"
                  - generic [ref=e807]: R$ 299,00
              - generic [ref=e808]:
                - generic [ref=e809]:
                  - button "" [ref=e810] [cursor=pointer]
                  - generic [ref=e812]: Não Pub.
                - generic [ref=e813]:
                  - button "" [ref=e814] [cursor=pointer]
                  - generic [ref=e816]: Auto
                - generic [ref=e817]:
                  - generic [ref=e818]: 
                  - generic [ref=e820]: Ativo
              - generic [ref=e821]:
                - generic [ref=e822]: 
                - paragraph [ref=e823]: Nunca
            - generic [ref=e826]:
              - img "Cozinha Modulada Indekes Star" [ref=e828]
              - generic [ref=e829]:
                - generic [ref=e831]:
                  - generic [ref=e832]: 
                  - text: COZINHA
                - paragraph [ref=e833]: "‼️ Esse móve é do lote dos salvados foi vendido, mas devolvido, devido a peça que acabaram empenando. Ela também inclui aqueles riscados nas portas, a portinha de baixo da gaveta está sem slowmotion, furos de instalação ‼️ A cozinha Star Indekes reúnem características decorativas e práticas em seu design. São compactos e se destacam pela sua versatilidade e modulação (cada peça é independente uma da outra, adaptável a todos os espaços), possibilitando vários arranjos e montagem em diversos ambiente, como cozinha, copa, espaço gourmet e áreas de serviço. Com um visual de linhas delicadas, eles conseguem combinar facilmente com qualquer tipo de ambiente. O espaço interno, que vem com prateleiras e divisória, são ótimos para organização dos utensílios e mantimentos. Características: Estrutura em MDP 12 Portas 2 Gavetas Não acompanha pia nem tampo Corrediças metálicas Prateleira do balcão suporta peso de 7kg e 30kg Gaveta suporta peso de até 5kg Pé plástico Dimensões: Altura: 217 cm Largura: 270 cm Profundidade: 53 cm Peso: 140,60 kg"
                - heading "Cozinha Modulada Indekes Star" [level=3] [ref=e834]
                - generic [ref=e835]:
                  - generic [ref=e836]: "SKU: 000258"
                  - generic [ref=e837]: "ESTOQUE: -1"
                  - generic [ref=e838]: R$ 1.999,00
              - generic [ref=e839]:
                - generic [ref=e840]:
                  - button "" [ref=e841] [cursor=pointer]
                  - generic [ref=e843]: Não Pub.
                - generic [ref=e844]:
                  - button "" [ref=e845] [cursor=pointer]
                  - generic [ref=e847]: Auto
                - generic [ref=e848]:
                  - generic [ref=e849]: 
                  - generic [ref=e851]: Ativo
              - generic [ref=e852]:
                - generic [ref=e853]: 
                - paragraph [ref=e854]: Nunca
            - generic [ref=e857]:
              - generic [ref=e858]: 
              - generic [ref=e861]:
                - generic [ref=e863]:
                  - generic [ref=e864]: 
                  - text: Verificado na Meta
                - paragraph [ref=e865]: "‼️ Recorte do tampo para a medida do Cooktop cobrada a parte no valor de R$ 15,00 ‼️ Balcão para Cooktop 80cm POP, em MDP 15mm, pés de plástico com regulagem, dobradiças metálicas, novo. Dimensões: Altura: 186 cm Largura: 61 cm Profundidade: 37.3 cm"
                - heading "Balcão para Cooktop Pop 80cm" [level=3] [ref=e866]
                - generic [ref=e867]:
                  - generic [ref=e868]: "SKU: 000367-01"
                  - generic [ref=e869]: "ESTOQUE: 0"
                  - generic [ref=e870]: R$ 399,00
              - generic [ref=e871]:
                - generic [ref=e872]:
                  - button "" [ref=e873] [cursor=pointer]
                  - generic [ref=e875]: Não Pub.
                - generic [ref=e876]:
                  - button "" [ref=e877] [cursor=pointer]
                  - generic [ref=e879]: Auto
                - generic [ref=e880]:
                  - generic [ref=e881]: 
                  - generic [ref=e883]: Ativo
              - generic [ref=e884]:
                - generic [ref=e885]: 
                - paragraph [ref=e886]: Nunca
            - generic [ref=e889]:
              - img "Conjunto de Mesa Mônaco 1,37 M com Vidro e 6 Poltronas" [ref=e891]
              - generic [ref=e892]:
                - generic [ref=e894]:
                  - generic [ref=e895]: 
                  - text: SALA DE JANTAR
                - paragraph [ref=e896]: "‼️Avarias mostradas nas imagens, uma das avarias é o vidro com riscos pouco perceptíveis na imagem‼️ Conjunto Sala de Jantar Mesa Mônaco 137cm 6 Poltronas Grécia Madetal Conjunto de Sala de Jantar Madetal Mônaco Mesa com Tampo de Vidro e Poltronas Grécia madeira maciça Transforme sua sala de jantar em um ambiente moderno, elegante e acolhedor com o Conjunto de Sala de Jantar Madetal Mônaco. Com design contemporâneo e acabamento sofisticado, a mesa e as poltronas oferecem conforto, estilo e praticidade para o dia a dia. A Mesa Mônaco é produzida em MDP e madeira maciça com acabamento PU, garantindo resistência, durabilidade e fácil manutenção. O tampo em vidro confere sofisticação e modernidade, além de facilitar a limpeza. Com formato aconchegante, acomoda confortavelmente até 6 pessoas. Sua altura de 82 cm proporciona ergonomia e conforto durante as refeições. As poltronas Grécia complementam o conjunto com charme e conforto, produzidas em madeira maciça de eucalipto e assento estofado com espuma D40, oferecendo maciez e firmeza. O encosto traz um toque de elegância e tendência de decoração, enquanto o revestimento em tecido linho facilita a limpeza, sendo ideal para uso diário. Cada poltrona suporta até 120 kg e já é enviada montada. Características da Mesa Mônaco Material da Estrutura: MDP e madeira maciça Tampo com Vidro colado Acabamento: PU Características das Poltronas Grécia Material: Madeira maciça de eucalipto Assento: Estofado com espuma D40 Revestimento: Tecido linho Capacidade por poltrona: 120 kg Dimensões da mesa: Altura: 82 cm Largura: 137 cm Profundidade: 137 cm Dimensões da Poltrona: Altura 83 cm Largura 42 cm Profundidade 54 cm"
                - heading "Conjunto de Mesa Mônaco 1,37 M com Vidro e 6 Poltronas" [level=3] [ref=e897]
                - generic [ref=e898]:
                  - generic [ref=e899]: "SKU: 004003-01"
                  - generic [ref=e900]: "ESTOQUE: 0"
                  - generic [ref=e901]: R$ 2.999,00
              - generic [ref=e902]:
                - generic [ref=e903]:
                  - button "" [ref=e904] [cursor=pointer]
                  - generic [ref=e906]: Não Pub.
                - generic [ref=e907]:
                  - button "" [ref=e908] [cursor=pointer]
                  - generic [ref=e910]: Auto
                - generic [ref=e911]:
                  - generic [ref=e912]: 
                  - generic [ref=e914]: Ativo
              - generic [ref=e915]:
                - generic [ref=e916]: 
                - paragraph [ref=e917]: Nunca
            - generic [ref=e920]:
              - img "Armário Aéreo 1,20 3 Portas Veneza Última unidade" [ref=e922]
              - generic [ref=e923]:
                - generic [ref=e925]:
                  - generic [ref=e926]: 
                  - text: COZINHA
                - paragraph [ref=e927]: "‼️Fazemos instalação do aéreo na parede por 50 reais‼️ Armário aéreo, 3 portas, 3 opções de cores, MDP 15mm e 12mm, Suporte de Peso de até 5 kg, novo 📏 Dimensões: Altura: 54 cm | Largura: 120 cm | Profundidade: 29 cm"
                - heading "Armário Aéreo 1,20 3 Portas Veneza Última unidade" [level=3] [ref=e928]
                - generic [ref=e929]:
                  - generic [ref=e930]: "SKU: 000231-01"
                  - generic [ref=e931]: "ESTOQUE: 0"
                  - generic [ref=e932]: R$ 349,00
              - generic [ref=e933]:
                - generic [ref=e934]:
                  - button "" [ref=e935] [cursor=pointer]
                  - generic [ref=e937]: Não Pub.
                - generic [ref=e938]:
                  - button "" [ref=e939] [cursor=pointer]
                  - generic [ref=e941]: Auto
                - generic [ref=e942]:
                  - generic [ref=e943]: 
                  - generic [ref=e945]: Ativo
              - generic [ref=e946]:
                - generic [ref=e947]: 
                - paragraph [ref=e948]: Nunca
            - generic [ref=e951]:
              - img "Armário Aéreo 1,59 4 Portas JK" [ref=e953]
              - generic [ref=e954]:
                - paragraph [ref=e955]: "‼️Fazemos tbm serviço fixar o armário na parede por 50 reais‼️ Armário aéreo 1,60 4 Portas JK, em mdp, prateleira, acompanha ferragens para instalação na parede Dimensões: 159x31,5x60(LXPXA)"
                - heading "Armário Aéreo 1,59 4 Portas JK" [level=3] [ref=e956]
                - generic [ref=e957]:
                  - generic [ref=e958]: "SKU: 000079-01"
                  - generic [ref=e959]: "ESTOQUE: -5"
                  - generic [ref=e960]: R$ 449,00
              - generic [ref=e961]:
                - generic [ref=e962]:
                  - button "" [ref=e963] [cursor=pointer]
                  - generic [ref=e965]: Não Pub.
                - generic [ref=e966]:
                  - button "" [ref=e967] [cursor=pointer]
                  - generic [ref=e969]: Auto
                - generic [ref=e970]:
                  - generic [ref=e971]: 
                  - generic [ref=e973]: Inativo
              - generic [ref=e974]:
                - generic [ref=e975]: 
                - paragraph [ref=e976]: Nunca
            - generic [ref=e979]:
              - generic [ref=e980]: 
              - generic [ref=e983]:
                - paragraph [ref=e984]: "‼️Móvel usado, por isso contém riscados e outras imperfeições. Preço reduzido, Aproveite!‼️ Cadeira para Escritório, com tecido courino, pés em tubos de aço super resistentes, espuma no acento e encosto 55kg/m3. Largura: 44 Altura:80 (43 até o acento) Profundidade: 48"
                - heading "Cadeira para Escritório / Sala de Espera Super Reforçada" [level=3] [ref=e985]
                - generic [ref=e986]:
                  - generic [ref=e987]: "SKU: 000338-01"
                  - generic [ref=e988]: "ESTOQUE: 0"
                  - generic [ref=e989]: R$ 199,00
              - generic [ref=e990]:
                - generic [ref=e991]:
                  - button "" [ref=e992] [cursor=pointer]
                  - generic [ref=e994]: Não Pub.
                - generic [ref=e995]:
                  - button "" [ref=e996] [cursor=pointer]
                  - generic [ref=e998]: Auto
                - generic [ref=e999]:
                  - generic [ref=e1000]: 
                  - generic [ref=e1002]: Ativo
              - generic [ref=e1003]:
                - generic [ref=e1004]: 
                - paragraph [ref=e1005]: Nunca
          - generic [ref=e1006]:
            - button "" [ref=e1007] [cursor=pointer]
            - generic [ref=e1009]: Página 2 de 12
            - button "" [ref=e1010] [cursor=pointer]
    - generic [ref=e1013]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e1014] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=e1016]
  - region "Notifications Alt+T"
```

# Test source

```ts
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
  49  |         expect(criticalErrors, 'Erros críticos de console detectados').toEqual([]);
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
> 138 |             expect(firstPageSet.has(itemP2Name)).toBe(false);
      |                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
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
  150 |                     await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  151 | 
  152 |                     // 4. Comprova que agora na Página 1 da categoria filtrada, o item aparece!
  153 |                     await expect(page.locator(`h3:has-text("${itemP2Name}")`)).toBeVisible({ timeout: 10000 });
  154 |                     // Comprova que resetou para a Página 1
  155 |                     await expect(page.locator('text=Página 1 de')).toBeVisible();
  156 |                 }
  157 |             }
  158 |         }
  159 |     });
  160 | 
  161 |     test('5. Busca global com debounce e retorno consistente', async ({ page }) => {
  162 |         await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  163 |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  164 | 
  165 |         const searchInput = page.locator('input[placeholder*="BUSCAR VARIAÇÃO"]');
  166 |         await expect(searchInput).toBeVisible();
  167 | 
  168 |         await searchInput.fill('SOFA');
  169 |         await page.waitForTimeout(600);
  170 | 
  171 |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  172 | 
  173 |         await searchInput.fill('');
  174 |         await page.waitForTimeout(600);
  175 |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  176 |     });
  177 | 
  178 |     test('6. Verificação Responsiva nos viewports Desktop, Tablet e Mobile', async ({ page }) => {
  179 |         const viewports = [
  180 |             { width: 1366, height: 768, name: 'Desktop' },
  181 |             { width: 768, height: 1024, name: 'Tablet' },
  182 |             { width: 375, height: 667, name: 'Mobile' },
  183 |         ];
  184 | 
  185 |         for (const vp of viewports) {
  186 |             await page.setViewportSize({ width: vp.width, height: vp.height });
  187 |             await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  188 |             await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  189 | 
  190 |             await expect(page.locator('h1:has-text("Catálogo de Canais")')).toBeVisible();
  191 |             await expect(page.locator('button:has-text("Atualizar WhatsApp")')).toBeVisible();
  192 |             await expect(page.locator('input[placeholder*="BUSCAR VARIAÇÃO"]')).toBeVisible();
  193 |             await expect(page.locator('button[title="Recarregar catálogo"]')).toBeVisible();
  194 |         }
  195 |     });
  196 | });
  197 | 
```