# Starbridge Explorers — Documento de Design
> Gerado em: 2026-04-02
> Atualizado em: 2026-04-07
> Versão: 15
> Contexto: sessão de brainstorming e design com Thyago (SMIT/PMSP)

---

## 1. Conceito Central

**Roguelite espacial cooperativo assimétrico para browser**, jogável em PC e celular simultaneamente.

Inspirado em Star Trek (sem usar a franquia — universo original), FTL: Faster Than Light e No Man's Sky.

- Sem história fixa ou roteiro
- Missões procedurais e aleatórias
- A **nave é o personagem principal** — ela evolui, acumula história, tem cicatrizes
- Os tripulantes são descartáveis; a nave persiste

---

## 2. Plataforma e Tecnologia

### Dispositivos
- **PC**: Capitão (host) — painel exclusivo de comando
- **Celular**: restante da tripulação — cada um com seu painel específico
- **TV/Projetor**: Viewscreen — tela central compartilhada, controlada pelos postos da ponte

### Stack técnico definido
- **WebSocket** — comunicação em tempo real entre jogadores (já usado no Liero)
- **WebRTC + SFU (LiveKit)** — áudio entre jogadores (modelo SFU pra suportar 6 pessoas sem sobrecarregar celulares)
- **Canvas 2D** — renderização do jogo
- **HTML/CSS puro** — painéis dos jogadores (não precisa de Canvas)
- **DeviceOrientation API** — giroscópio no celular
- **Vibration API** — haptics no celular (não funciona no iOS Safari — fallback: flash visual na borda)
- **getUserMedia** — câmera do celular (requer HTTPS + permissão)
- **Hospedagem**: Render.com (mesmo stack do projeto Liero)

### URLs da sessão
Cada sessão gera três tipos de URL:
- `[host]/captain/CÓDIGO` — tela exclusiva do Capitão no PC
- `[host]/crew/CÓDIGO` — tela dos tripulantes no celular
- `[host]/viewscreen/CÓDIGO` — viewscreen para TV ou projetor

O viewscreen é acessado via **QR Code** gerado automaticamente na tela do Capitão — sem necessidade de digitar URL. Funciona em qualquer dispositivo com browser: smart TV, projetor, notebook via HDMI, Chromecast.

---

## 3. Jogadores e Papéis

### Quantidade
- 2 a 6 jogadores por sessão
- Cada jogador tem um papel assimétrico com mecânicas exclusivas

### Postos da ponte de comando

| Posto | Dispositivo | Papel |
|---|---|---|
| **Capitão** | PC | Host da sessão, conhece o objetivo real da missão, coordena a tripulação |
| **Helm** | Celular | Pilota a nave com sliders — velocidade e direção |
| **Tático** | Celular | Escudos e armas — modulação de ataque e defesa |
| **Engenharia** | Qualquer | Gerencia energia entre sistemas, faz reparos de emergência |
| **Ciências/Ops** | Celular | Sensores de longo alcance, análise de anomalias, suporte tático |
| **Comunicações** | Qualquer | Canais externos, interceptação, negociação |

### Assimetria de informação (elemento central)
- Cada jogador tem informação que **só ele possui**
- Capitão: objetivo real da missão
- Ciências: o que está além do campo visual + modulação de ataques recebidos (se sensores ativos)
- Comunicações: ordens secretas da Frota / mensagens interceptadas
- O jogo é sobre decidir **o que compartilhar e quando**

---

## 4. Capitão ✅

### Informação exclusiva
O Capitão **não vê o estado da nave automaticamente**. Ele depende da tripulação para obter informação — exatamente como um Capitão real.

**O que o Capitão vê por padrão na sua tela:**
- Objetivo da missão — só ele sabe o que realmente precisa ser feito
- Ordens da Frota — configurável se são exclusivas do Capitão ou compartilhadas com Comunicações
- Tempo restante da missão — se houver limite de tempo
- Log de decisões da sessão atual

**O resto vem da tripulação ou do viewscreen.**

### Como o Capitão obtém informação
- **Pedindo verbalmente** a um posto específico — a tripulação envia pro viewscreen
- **Observando o viewscreen** — o que a tripulação decidiu compartilhar

### Papel na sessão
- Coordenador dependente da tripulação — não controlador onisciente
- Toma decisões com informação incompleta
- Única pessoa que sabe o objetivo real — e decide quando e como compartilhar

---

## 5. Viewscreen ✅

### Conceito
A TV ou projetor da sala funciona como o **viewscreen da ponte** — a tela central que todos os jogadores presencialmente veem. É controlado pelos **postos da ponte**, não pelo Capitão.

### Fluxo de uso
1. Capitão dá a ordem verbal
2. O tripulante correspondente envia a informação pro viewscreen pelo celular
3. A TV atualiza em tempo real via WebSocket

### Exemplos de uso
- *"Engenharia, status de sistemas na tela"* → Engenharia envia → viewscreen mostra painel de energia e condição de cada sistema
- *"Helm, mapa na tela"* → Helm envia → viewscreen mostra mapa do setor com posição da nave
- *"Comms, coloca a comunicação"* → Comunicações envia → texto da conversa com a outra parte vai aparecendo na tela
- *"Ciências, leitura de sensores"* → Ciências envia → viewscreen mostra o que está além do campo visual

### Acesso
- URL: `[host]/viewscreen/CÓDIGO`
- **QR Code** gerado automaticamente na tela do Capitão — principal forma de acesso
- Funciona em qualquer dispositivo com browser — smart TV, projetor, notebook via HDMI

### Configurações de sessão
Itens configuráveis pelo Capitão antes de iniciar a missão:
- **Ordens secretas da Frota:** vão direto pro Capitão, só pra Comunicações, ou ambos
- **Modo de inércia padrão do Helm:** Inércia Total ou Assistido
- Outros a definir conforme o jogo evolui

---

## 6. Loop de Gameplay

### Sessão típica: 20–40 minutos

**Tipos de missão (procedural — combinação de variáveis):**
- Tipo: resgate / combate / exploração / fuga / negociação
- Contexto: região do espaço, facção envolvida, condição da nave
- Complicação aleatória: traidor a bordo, sistema com falha, sinal misterioso

### Missões geram:
- Créditos e recursos
- Experiência de sistema (upgrades)
- Entradas no log de missões da nave
- Dano ao casco (dependendo do resultado)

---

## 7. Progressão Roguelite

### Decisão: Roguelite (não roguelike puro)
- Roguelike puro foi descartado: inadequado para grupos cooperativos com agendas diferentes
- Referência: Darkest Dungeon (missões aleatórias + base persistente) e Sunless Skies (nave com história)

### O que persiste entre sessões
**A nave** (coletivo):
- Upgrades de sistemas (motor, escudos, armas, sensores)
- Log de missões (histórico completo)
- Nome e identidade

**O que reseta por sessão:**
- Créditos e recursos (começam do zero a cada sessão)
- Bônus temporários individuais dos tripulantes

### Progressão individual vs. coletiva
- **Nave** = progressão coletiva, pertence a todos que jogaram nela
- **Tripulante** = sem progressão individual entre sessões — começa igual toda vez
- Quem jogou 1 missão e quem jogou 10 começam no mesmo nível individual; a diferença está na nave

---

## 8. Sistema de Tiers ✅

### Tiers da nave
C → B → A → S → Lendário

Cada tier define o **teto de upgrade de todos os sistemas**. Nenhum sistema pode ultrapassar o limite do tier atual — independente de créditos disponíveis. Avançar de tier desbloqueia melhorias mais avançadas em todos os sistemas simultaneamente.

### Progressão dentro do tier
Dentro de cada tier, os sistemas sobem individualmente com créditos ganhos nas missões. O avanço de tier requer que todos os sistemas principais estejam no teto do tier atual — e custa um recurso especial obtido apenas em missões de alta dificuldade.

---

## 9. Permadeath e Herança ✅

### Permadeath
- Permadeath por par **Capitão + Nave**
- Quando a nave é destruída, aquele par específico termina permanentemente
- A nave entra na **Lineage Registry** como linha extinta — o galho termina

### Herança de nave
Qualquer tripulante que jogou numa nave tem o código dela. Se ele iniciar uma sessão com esse código **como Capitão**, ele **adota a nave** — cria uma nova linha do tempo independente.

**Estado da nave herdada:**
- Upgrades intactos
- Recursos zerados
- Todos os sistemas abaixo de 50% de capacidade
- Degradação proporcional ao histórico de missões da nave original

**A nave original continua existindo** — são duas linhas do tempo independentes na Lineage Registry.

### Lineage Registry
Exibe o histórico completo de uma nave como árvore de linhas do tempo:
- Cada branch representa uma herança
- Naves destruídas aparecem como galhos extintos
- O histórico de missões é preservado em cada branch

---

## 10. Código da Nave ✅

### Identificador único
O par `ID_CAPITÃO + ID_SHIP` é o identificador único de cada linha do tempo de nave.

### Formato do código
- Codificação Base64
- Checksum SHA-256 com salt server-side
- Portátil: qualquer tripulante pode carregar o código
- Tamper-resistant: modificações são detectadas pelo servidor

---

## 11. Helm ✅

### Interface
Dois sliders center-returning no celular:
- **Velocidade** — com reverso (máximo impulso: 0.25c, reverso: 0.125c)
- **Direção** — heading da nave

### Modos de inércia
Escolhido pelo jogador (ou configurado pelo Capitão):
- **Inércia Total** — nave mantém momento quando o slider é solto; requer correção ativa
- **Assistido** — nave desacelera automaticamente quando o slider retorna ao centro

### Plano de movimento
2D — eixos X/Y

---

## 12. Sistema de Energia ✅

Gerenciado por Engenharia em tempo real. Todos os sistemas da nave consomem da mesma pool do reator.

### Overload
Engenharia pode forçar sistemas além do limite normal — aumentando temporariamente a potência de escudos, phasers ou propulsão. Overload gera calor e risco de dano ao sistema sobrecarregado. Alguns sistemas não suportam overload (suporte de vida, computador de navegação).

---

## 13. Sistema de Combate ✅

### Escudos e Phasers — modulação
Sistema inspirado em Mastermind: efetividade depende de matching de frequência entre ataque e defesa.

- Modulação é uma sequência de caracteres
- Phasers que batem na frequência dos escudos inimigos penetram com eficiência máxima
- Escudos na frequência errada absorvem menos dano
- Tático gerencia modulação ofensiva e defensiva simultaneamente

### Torpedos de Fótons
Dano dividido em dois componentes independentes:
- **50% modulável** — afetado pela frequência dos escudos inimigos
- **50% penetrante** — ignora modulação, sempre causa dano

Munição finita. Independente de energia do reator — funciona mesmo com reator danificado.

---

## 14. Sistemas da Nave

### 14.1 Hull ✅

Integridade estrutural da nave. Quando chega a zero, a nave é destruída e o par Capitão+Nave entra em permadeath.

Dano ao hull é permanente dentro da sessão — não se regenera automaticamente. Reparos de hull consomem recursos e tempo.

### 14.2 Energia ✅

Pool central do reator. Todos os sistemas consomem desta pool. Engenharia aloca em tempo real.

### 14.3 Escudos ✅ (parcial — valores numéricos pendentes)

Primeira linha de defesa. Absorvem dano antes de atingir o hull. Regeneram com energia do reator.

Modulação de frequência afeta efetividade — ver sistema de combate.

### 14.4 Phasers ✅ (parcial — valores numéricos pendentes)

Arma de energia contínua. Modulação de frequência afeta penetração nos escudos inimigos.

### 14.5 Torpedos de Fótons ✅

Ver sistema de combate. Munição finita por tier — valores a definir.

### 14.6 Impulso ✅

Propulsão sublumínica. Máximo: 0.25c. Reverso: 0.125c. Controlado pelo Helm via sliders.

### 14.7 Warp ✅

Propulsão superlumínica. Fator de warp controlado pelo Helm. Teto máximo seguro varia por tier da nave — valores a definir.

Consumo de energia aumenta com o fator de warp. Curva de consumo a calibrar.

### 14.8 Sensores de Longo Alcance ✅

Operados por Ciências. Dois modos:

**Passivo** — detecta emissões sem revelar posição da nave. Menor resolução.
**Ativo** — scan direcionado de alta resolução. Revela posição da nave para qualquer um que esteja ouvindo.

Alcance e resolução degradam em nebulosas e anomalias.

### 14.9 Sensores de Curto Alcance ✅

Sempre ativos. Cobertura do imediato ao redor da nave. Base do que o Helm vê.

### 14.10 Suporte de Vida ✅

Sistema crítico. Quando danificado, inicia timer de contagem regressiva — se não reparado antes de zerar, a missão termina.

Não suporta overload. Não pode ser desligado.

### 14.11 Loop de Combate ✅

Combate em tempo real. Postos ativos durante combate:
- **Helm** — manobra e posicionamento
- **Tático** — modulação de escudos e armas, seleção de alvo
- **Engenharia** — alocação de energia, overload estratégico
- **Ciências** — leitura de modulação inimiga, suporte tático
- **Comunicações** — jamming, negociação de rendição, interceptação

---

### 14.12 Hazards de Navegação ✅

O espaço não é vazio uniforme. Durante o warp, a nave pode encontrar três categorias de hazards — todos gerados proceduralmente a cada run. O jogo sabe onde está cada um; a nave depende dos seus sensores para descobrir.

Cada hazard cria uma **decisão cooperativa distinta** na ponte, ativando postos diferentes e gerando tons de gameplay únicos.

---

#### Categoria 1 — Obstáculos Naturais

Fenômenos do próprio universo. Não têm intenção — são o espaço sendo hostil.

| Obstáculo | Ameaça central | Posto mais ativado | Tom |
|---|---|---|---|
| **Nebulosa de Radiação** | Cegueira progressiva + leituras falsas | Ciências | Paranoia e incerteza |
| **Nebulosa Tóxica** | Corrosão progressiva de sistemas + ponto de não-retorno | Engenharia | Pressão e contagem regressiva |
| **Nebulosa Densa** | Resistência progressiva ao warp + exposição prolongada | Helm + Engenharia | Paciência forçada e vulnerabilidade |
| **Poço Gravitacional** | Perda de controle progressiva do warp + arrasto direcional | Helm + Engenharia | Urgência e força bruta |
| **Anomalia de Subespaço** | Warp impossível + colapso de sensores e comunicações subespáciais | Todos | Silêncio e tensão |
| **Tempestade de Partículas** | Dano acumulativo a múltiplos sistemas sob bombardeio contínuo | Engenharia | Triagem e sacrifício |

---

##### Nebulosa de Radiação — detalhamento completo

A nebulosa de radiação não bloqueia o warp — ela **cega a nave progressivamente**. O perigo não é a nebulosa em si, é o que pode estar dentro dela que a tripulação não consegue ver.

**Zonas de profundidade:**

A nave atravessa três zonas concêntricas. Não há indicador automático de zona — a tripulação infere pela degradação dos sistemas.

**ZONA 1 — Borda**

*Sensores:* Passivo perde resolução direcional. Ativo ainda funciona normalmente. Ciências começa a notar imprecisão mas consegue trabalhar.

*Comunicações:* Sinal externo começa a cair. Transmissor de longo alcance fica instável — mensagens para a Frota podem não chegar. Comunicador de curto alcance ainda funciona.

*Escudos:* Frequência de modulação começa a derivar sozinha — pequenas variações aleatórias na modulação ativa. Tático precisa fazer correções manuais mais frequentes.

*Sinal de alerta:* Nenhum automático. Ciências é quem percebe e reporta.

**ZONA 2 — Interior médio**

*Sensores:* Passivo inútil. Ativo com alcance reduzido a ~30% e resolução degradada. Ciências recebe leituras com margem de erro crescente — reporta com incerteza.

*Comunicações:* Longo alcance fora. Curto alcance instável — comunicação com outras naves próximas fica picotada ou silenciosa.

*Escudos:* Deriva de modulação mais intensa e irregular. Se Tático não corrigir ativamente, a modulação pode derivar para ponto de vulnerabilidade. Engenharia pode alocar mais energia para estabilizar — mas a nebulosa aumenta o consumo base de todos os sistemas.

*Sinal de alerta:* Engenharia começa a ver consumo anormal no painel. Tático vê a modulação se movendo sozinha.

**ZONA 3 — Interior profundo**

*Sensores:* Ativo colapsa. Ciências começa a receber **leituras falsas** — objetos que não existem, ausência de objetos que existem, modulações inventadas. As leituras parecem plausíveis. Não há indicador de que são falsas.

*Comunicações:* Silêncio total externo. Interno (entre postos) ainda funciona via cabos da nave.

*Escudos:* Deriva de modulação caótica. Manter modulação estável exige Engenharia e Tático em sincronia constante. Falha de qualquer um = escudos em frequência aleatória.

*Sinal de alerta:* Nenhum. É o ponto de maior perigo — a tripulação pode não saber que está na zona 3.

**Leituras falsas na zona 3 — tipos possíveis:**
- **Nave fantasma** — leitura de nave inimiga em posição específica. Tático pode querer abrir fogo.
- **Obstáculo falso** — corpo massivo à frente. Helm desvia de nada, ou piora a rota.
- **Sinal falso** — estrutura ou ponto de interesse. Pode parecer o objetivo da missão.
- **Modulação falsa** — Ciências reporta modulação de ataque recebido inexistente. Tático ajusta escudos para ameaça que não existe.

Ciências não tem como saber que é falso. Ela sabe que está na zona 3 e que as leituras *podem* ser falsas — e precisa comunicar essa incerteza ao Capitão, que decide mesmo assim.

**A dinâmica cooperativa central:**

*"Capitão, estou lendo uma nave de tamanho médio a 40.000 km, proa 227. Pode ser real. Pode não ser."*

O Capitão não tem outra fonte de informação. Escudos estão derivando. Comunicações está muda. Helm não pode confirmar visualmente. É uma decisão com informação sabidamente não confiável — o coração do jogo.

---

##### Nebulosa Tóxica — detalhamento completo

**Base canônica:** Voyager "One" (S4E23) — radiação subnucleônica que penetra escudos e casco, degrada sistemas tecnológicos progressivamente, culminando em decisões de triagem de energia.

A nave vê tudo com clareza enquanto seus sistemas morrem. O perigo não é a cegueira — é saber exatamente o que está acontecendo e não conseguir parar.

**Zonas de profundidade:**

Não há indicador automático de zona — Engenharia infere pela sequência e intensidade da degradação.

**ZONA 1 — Borda**

A nebulosa começa a reduzir a **eficiência** dos sistemas — cada sistema consome mais energia para fazer o mesmo trabalho. A ordem dos sistemas afetados é **aleatória a cada run**.

*Engenharia:* Vê o consumo subindo gradualmente sem causa aparente. Primeiro sinal da nebulosa.
*Outros postos:* Nenhum impacto visível ainda. Só Engenharia sabe que algo está errado.

*Sinal de alerta:* Engenharia percebe e reporta ao Capitão. Nenhum alarme automático.

**ZONA 2 — Interior médio**

A corrosão começa a reduzir a **capacidade** dos sistemas afetados — os tetos caem. Escudos absorvem menos, warp trava em fator menor, sensores perdem alcance. A ordem continua sendo a aleatória estabelecida na zona 1.

*Engenharia:* Pode fazer reparos de emergência para segurar sistemas críticos, mas a nebulosa continua corroendo. É uma batalha de sustentação — reparos desaceleram, não revertem.
*Helm:* Começa a sentir o teto de warp caindo.
*Tático:* Escudos absorvem menos dano.
*Ciências:* Sensores perdem alcance.

*Ponto de não-retorno:* Aparece no painel de Engenharia como projeção — taxa de degradação atual vs. distância até a saída. Quando o balanço vira, Engenharia vê e precisa comunicar ao Capitão imediatamente.

**ZONA 3 — Interior profundo**

Sistemas começam a **falhar intermitentemente** — caem, voltam, caem de novo. O computador de navegação recebe dados ruins dos sensores degradados e plota rotas erradas sem saber que são erradas.

*Engenharia:* Em triagem constante — decide em tempo real quais sistemas segurar com os reparos restantes e quais sacrificar.
*Helm:* Segue sugestões de rota do computador baseadas em dados falsos.
*Capitão:* Recebe o ponto de não-retorno de Engenharia e precisa decidir: forçar a saída ou aceitar os danos e continuar.

*Sinal de alerta:* Nenhum automático na zona 3. Depende inteiramente de Engenharia comunicar ativamente.

**Visibilidade da nebulosa no mapa:**

Assim que os sensores detectarem a nebulosa — seja por longo ou curto alcance — ela aparece no mapa do Capitão. A informação dos sensores alimenta o mapa em tempo real.

**A dinâmica cooperativa central:**

*"Capitão, a taxa de degradação cruzou o ponto de retorno há dois minutos. Se mantivermos esse fator de warp, não chegamos à saída com propulsão intacta. Preciso de uma decisão."*

Engenharia tem a informação. O Capitão tem a decisão. Os outros postos executam — e sentem as consequências nos seus painéis enquanto esperam.

---

##### Nebulosa Densa — detalhamento completo

**Base canônica:** TNG Technical Manual — velocidade real em warp depende da densidade do gás interestelar e flutuações do subespaço; naves sofrem penalidades de energia por arrasto quântico. Star Trek Beyond — efeito "bullet through water" ao atravessar nebulosa densa em warp.

A Nebulosa Densa não cega nem corrói — ela **empurra de volta**. A nave consegue entrar e ver tudo com clareza no imediato, mas o próprio ambiente resiste ao campo de dobra. Quanto mais fundo, mais caro fica manter o mesmo fator de warp.

**Como a resistência funciona:**

A densidade da nebulosa aumenta gradualmente do perímetro ao centro. O campo de dobra da nave precisa de mais energia para manter o mesmo fator de warp conforme a resistência aumenta. Helm sente o slider ficando mais pesado. Engenharia vê o consumo subindo sem degradação de sistema.

Não há zonas discretas — é uma curva contínua. O Helm e Engenharia sentem a nebulosa se tornando mais densa em tempo real.

**Efeito nos sensores:**

A densidade física abafa o alcance dos sensores de longo alcance — não cega, não distorce, só comprime o horizonte. Tudo dentro do alcance imediato é visto com clareza total. O que está além some progressivamente com a profundidade. Curto alcance funciona normalmente.

O efeito narrativo: a tripulação sabe exatamente o que está ao redor imediato — e sabe que não consegue ver o que vem de longe. Vulnerabilidade com plena consciência.

**Visibilidade da nebulosa no mapa:**

Aparece no mapa assim que detectada pelos sensores — por longo ou curto alcance.

**As duas decisões cooperativas:**

*Na entrada — atravessar ou contornar:*

O Capitão recebe de Ciências a estimativa de tamanho da nebulosa e o custo em tempo de contornar vs. atravessar. Engenharia estima o consumo de energia para a travessia no fator de warp atual. Helm informa o fator máximo sustentável na borda.

Não é uma decisão óbvia — contornar pode custar mais tempo do que a missão permite; atravessar expõe a nave a combate em velocidade reduzida.

*Dentro — velocidade vs. consumo vs. exposição:*

Helm e Engenharia em tensão constante:
- Ir mais rápido = mais consumo de energia, mas menos tempo exposto
- Ir mais devagar = menos consumo, mas a nave fica vulnerável por mais tempo
- Ir rápido demais = o fator de warp fica insustentável e a nave cai para impulso no meio da nebulosa — o pior resultado

*Engenharia vê o consumo. Helm sente o teto. O Capitão decide o ritmo — sem ver nenhum dos dois painéis diretamente.*

**A dinâmica cooperativa central:**

*"Helm aqui. Estou segurando fator 4 mas está custando o dobro do normal. Engenharia, quanto tempo temos nesse consumo?"*
*"Menos do que o necessário para sair. Precisamos baixar para 2 ou vamos ficar sem energia no meio da nebulosa."*
*"Capitão, sensores de longo alcance estão cegos. Não sei o que está do lado de fora esperando a gente sair devagar."*

O Capitão arbitra entre velocidade, energia e risco de combate — com informação incompleta sobre o que está além do horizonte comprimido.

---

##### Poço Gravitacional — detalhamento completo

**Base canônica:** Enterprise "Singularity" — cisalhamento gravitacional extremo força saída do warp. TOS "The Naked Time" — fuga de poço gravitacional por reinicialização de emergência dos motores. Memory Alpha — a Enterprise em warp máximo sem avançar por causa da gravidade de um buraco negro.

O Poço não ataca nem corrói — ele **puxa**. A gravidade tem origem e vetor identificáveis. A nave sabe de onde vem o perigo desde o início, e é a única ameaça no jogo que é puramente física e direcional.

**Como a atração funciona:**

O gradiente gravitacional aumenta continuamente conforme a nave se aproxima do centro. O campo de dobra começa a ceder — Helm precisa de mais potência para manter o mesmo fator de warp. Conforme a nave entra mais fundo, chega um ponto em que mesmo o warp máximo não é suficiente para avançar. A partir daí a nave começa a ser arrastada na direção errada, mesmo com os motores no máximo.

Não há zonas discretas — é uma curva contínua e implacável. Helm sente o slider ficando cada vez mais pesado. Engenharia vê o consumo subindo sem degradação de sistema.

**Detecção e sensores:**

Ciências detecta a anomalia gravitacional pelos sensores de longo alcance — com antecedência suficiente para o Capitão decidir desviar ou arriscar passar perto. Conforme a nave se aproxima, a própria distorção gravitacional começa a comprometer os sensores — Ciências reporta a posição e intensidade do centro com precisão decrescente. Quanto mais dentro do gradiente, menos confiável a leitura.

*Sinal de alerta:* Ciências reporta a anomalia ao Capitão. Helm começa a sentir a resistência antes de qualquer alarme.

**As duas decisões cooperativas:**

*Na aproximação — desviar ou arriscar:*

O Capitão recebe de Ciências a posição estimada e intensidade do poço. A decisão é desviar amplo — custando tempo e energia — ou calcular uma passagem tangencial próxima que usa o gradiente sem entrar na zona de arrasto. Passagem tangencial bem executada pode ser uma vantagem: a gravidade acelera a nave na saída, como um estilingue gravitacional. Mal executada, puxa a nave para dentro.

*Dentro do gradiente — controle e escape:*

Se a nave entrar profundo demais, Helm e Engenharia em coordenação constante:

*Helm:* Procura o vetor de saída tangencial — não direto contra o centro, mas em ângulo que usa a curvatura do gradiente para sair. Com os sensores degradados, Ciências dá estimativas cada vez menos precisas do ângulo ideal.

*Engenharia:* Monitora o limiar crítico — o ponto em que o warp para de avançar e a nave começa a ser arrastada. Quando esse ponto é cruzado, a única saída é a reinicialização de emergência dos motores: procedimento perigoso que desliga e religa o warp core em estado frio para gerar um pulso de energia muito acima do normal por alguns segundos. Funciona uma vez. Danifica os motores. Mas sai.

*Capitão:* Decide quando autorizar a reinicialização de emergência — esperar mais pode encontrar um ângulo melhor de saída, mas cada segundo aumenta o arrasto e o risco de o procedimento não ser suficiente.

**A dinâmica cooperativa central:**

*"Helm aqui. Estou no máximo e não estou avançando. Engenharia, quanto tempo até cruzar o limiar de arrasto?"*
*"Menos de dois minutos no vetor atual. Ciências, preciso do ângulo de saída agora."*
*"Leituras instáveis. Estimo 40 graus a boreste mas não tenho certeza — o gradiente está distorcendo tudo."*
*"Capitão: posso tentar o ângulo estimado ou autorizar a reinicialização de emergência agora. Uma das duas."*

O Capitão decide com informação degradada, tempo real e uma única bala de emergência na câmara.

---

##### Tempestade de Partículas — detalhamento completo

**Base canônica:** Ion storms (Memory Alpha) — partículas ionicamente carregadas que interferem em sensores, comunicações e controle de voo em intensidades baixas, danificam ou destroem naves em intensidades altas. Badlands/plasma storms (DS9/VOY) — tempestades dinâmicas com intensidade variável que limitam severamente o alcance de sensores. Escudos oferecem proteção parcial dependendo do tipo de energia envolvido.

A Tempestade não tem direção de fuga, não corrói progressivamente, não puxa. Ela **bate**. A nave está dentro e recebe dano contínuo enquanto tenta atravessar ou esperar passar. O problema não é navegar nem escapar em tempo — é durar.

**Como a tempestade funciona:**

A Tempestade de Partículas é dinâmica — se move e varia de intensidade. Não há como prever exatamente quando termina ou onde está o centro. Ciências monitora continuamente e tenta identificar janelas de menor intensidade à frente, mas com margem de erro crescente conforme os próprios sensores se degradam.

A intensidade oscila em tempo real. Há momentos de calmaria relativa e momentos de bombardeio pesado — e a tripulação não sabe com antecedência qual vem a seguir.

**Padrão de dano por intensidade:**

O dano segue uma lógica de camadas — sistemas de interface externa são atingidos primeiro, sistemas internos só sob exposição prolongada ou intensidade alta. A ordem dentro de cada camada é aleatória a cada run.

*Camada externa — atingida primeiro em qualquer tempestade:*
Sensores, comunicações, controle de voo, modulação de escudos. São os olhos e ouvidos da nave — os primeiros a degradar, os que mais comprometem a capacidade de resposta da tripulação.

*Camada interna — atingida sob exposição prolongada ou picos de intensidade:*
Propulsão, sistemas de armas, suporte de vida, integridade estrutural do hull. Quando a tempestade chega aqui, Engenharia está em modo de emergência.

**Proteção ativa — escudos como variável de decisão:**

Escudos reduzem a taxa de dano de partículas, mas consomem energia extra para manter essa proteção sob bombardeio contínuo. Não é um botão liga/desliga — é uma alocação contínua que Engenharia calibra em tempo real.

*Escudos altos:* menos dano acumulado, mais consumo de energia, menos energia disponível para reparos e propulsão.
*Escudos baixos:* mais dano acumulado, mais energia disponível para reparos — mas Engenharia precisa ser mais rápida que o dano.

Não há resposta certa. Depende da intensidade da tempestade, do estado atual dos sistemas e de quanto tempo falta para sair.

**Navegação às cegas:**

Conforme os sensores de longo alcance se degradam, Ciências perde a capacidade de mapear a tempestade à frente. A nave começa a navegar por leituras de curto alcance e estimativas. Helm não sabe o que está à frente. Ciências reporta com incerteza crescente.

**A dinâmica cooperativa central — triagem contínua:**

Engenharia não tem energia suficiente para tudo simultaneamente. A cada ciclo de dano ela escolhe: manter escudos altos e aceitar menor capacidade de reparo; baixar escudos e reparar mais rápido enquanto o dano acumula; sacrificar um sistema não-essencial para liberar energia para os críticos; ou guardar energia para um pico de intensidade que Ciências prevê — mas pode estar errada.

*"Engenharia aqui. Escudos estão segurando mas estou consumindo o dobro do previsto. Se vier outro pico agora não tenho energia para manter propulsão e escudos ao mesmo tempo."*
*"Ciências: leituras sugerem calmaria nos próximos dois minutos — mas os sensores estão degradados, margem de erro alta."*
*"Capitão, preciso de uma decisão: mantenho escudos e reduzo propulsão, ou baixo escudos e acelero para sair antes do próximo pico?"*

Engenharia tem os números. Ciências tem a previsão. Helm executa. O Capitão decide — sabendo que a previsão pode estar errada e que não há como desfazer a escolha depois.

---

##### Anomalia de Subespaço — detalhamento completo

**Base canônica:** "Bride of Chaotica!" (VOY S5) — nave presa em camada de subespaço instável, warp inutilizável, sistemas críticos inacessíveis; solução: desligar o warp core e usar propulsores mínimos para não aumentar a resistência. "The Omega Directive" (VOY S4) — ruptura de subespaço torna warp permanentemente impossível na área; comunicações e sensores subespáciais completamente comprometidos.

A Anomalia não ataca, não corrói, não puxa, não bate. Ela simplesmente **existe**. A nave entra numa região onde o subespaço está perturbado — e tudo que depende dele para funcionar para. Warp, sensores de longo alcance, comunicações externas. A nave está presa a impulso num pedaço de espaço que encolheu drasticamente, sem saber o que está além do seu horizonte imediato, sem saber por quanto tempo.

**O que acontece ao entrar:**

O warp não falha dramaticamente — ele simplesmente para de funcionar. Tentar engajar faz a nave tremer sem avançar. Não há risco catastrófico de tentar — mas é completamente inútil, e cada tentativa perturba ainda mais o subespaço ao redor, potencialmente prolongando a estadia.

Sensores e comunicações subespáciais colapsam junto. Longo alcance: offline. Transmissor de longo alcance: offline. O horizonte da nave encolhe para o que os sensores eletromagnéticos convencionais conseguem ver — curto alcance funciona, mas é uma fração do normal.

*Sinal de entrada:* Ciências detecta a perturbação do subespaço antes de entrar — é detectável por sensores de longo alcance enquanto a nave ainda está fora. Uma vez dentro, esse aviso desaparece junto com tudo mais.

**Por que afeta todos os postos:**

*Helm:* warp inoperante. A nave está a impulso numa região de tamanho desconhecido.
*Ciências:* sensores de longo alcance offline. Só enxerga o imediato. Não sabe onde a anomalia termina.
*Comunicações:* transmissor de longo alcance offline. Sem contato com a Frota. Comunicador de curto alcance ainda funciona — mas só alcança o que está perto.
*Tático:* escudos e armas funcionam normalmente — mas sem sensores de longo alcance, não sabe o que está vindo até estar perto demais.
*Engenharia:* gerencia a decisão mais crítica da anomalia — quanto energia usar.
*Capitão:* perde a visão do mapa. Tão cego quanto qualquer tripulante.

**A mecânica central — silêncio ativo:**

Quanto mais energia a nave usa dentro da anomalia, mais ela perturba o subespaço ao redor — e mais tempo fica presa.

Engenharia monitora o nível de perturbação subespácial como uma segunda barra de estado. Usar impulso aumenta essa perturbação lentamente. Tentar warp a aumenta muito. Usar sistemas de alta energia — armas, overload, sensores ativos em modo forçado — também contribui.

Se a perturbação chegar a um limiar crítico, a anomalia se estabiliza ao redor da nave e ela para completamente — nem impulso funciona mais.

A decisão de Engenharia é **gestão de silêncio**: quanto menos energia usar, mais rápido a anomalia se dissipa naturalmente e a nave sai. Mas ficar quase sem energia dentro de uma região cega tem seu próprio custo.

**As duas tensões cooperativas:**

*Navegar às cegas:*

Helm precisa de uma direção para sair — mas Ciências não consegue mapear a anomalia por dentro. Ciências usa os sensores de curto alcance para fazer leituras passivas do subespaço imediato — como sonar num submarino. Reporta tendências ao Capitão: *"Perturbação diminuindo levemente a estibordo."* Helm ajusta. É navegação por inferência, não por mapa.

*Vulnerabilidade consciente:*

A nave está lenta, cega além do imediato e em silêncio de rádio. Tático sabe que qualquer ameaça além do horizonte de curto alcance vai aparecer sem aviso. Escudos e armas funcionam — mas cada sistema ligado é uma troca entre segurança e velocidade de saída.

**A dinâmica cooperativa central:**

*"Helm aqui. Mantendo proa a 040, perturbação parece estável nessa direção — mas não tenho como confirmar."*
*"Ciências: leitura passiva sugere borda da anomalia a aproximadamente 40 minutos nesse vetor. Margem de erro alta."*
*"Engenharia: perturbação subespácial em 60% e subindo lentamente. Se alguém ligar qualquer sistema de alta energia agora, esse número sobe rápido."*
*"Comunicações: sem sinal externo. Se há alguém procurando a gente lá fora, não estamos recebendo."*

O Capitão coordena quatro postos que têm informação fragmentada, sem poder verificar nenhuma dela — e precisa decidir velocidade, energia e vulnerabilidade ao mesmo tempo, sem ver o mapa.

---

#### Categoria 2 — Armadilhas Inimigas

Tecnologia colocada intencionalmente por facções inimigas para interceptar, paralisar ou destruir naves em trânsito. Qualquer facção pode usar qualquer tipo — mas cada uma tem preferências, e reconhecer o padrão é trabalho de Ciências e Comunicações.

| Armadilha | Como é detectada | Decisão criada | Tom |
|---|---|---|---|
| **Mina de Interdição** | Parece objeto neutro nos sensores | Aproximar ou evitar objeto desconhecido | Desconfiança e paranoia |
| **Campo de Interdição** | Nave inimiga em posição estratégica | Fugir antes de entrar no alcance ou enfrentar | Urgência e fuga |

**Papel de Ciências e Comunicações:**
- Ciências identifica a assinatura tecnológica da armadilha pelos sensores — tipo e origem da tecnologia
- Comunicações intercepta tráfego de subespaço da região — quem está operando aqui e por quê
- Com as duas informações juntas, o Capitão tem contexto para decidir melhor

**Exemplo de sinergia:** Ciências detecta objeto não identificado à frente. Comunicações acabou de interceptar tráfego de uma facção conhecida nessa região. O Capitão decide: coincidência ou armadilha?

---

##### Mina de Interdição — detalhamento completo

**Base canônica:** ENT "Minefield" — minas cloaked que parecem espaço vazio, acionadas por proximidade, com dano imediato ao casco. TNG "Force of Nature" — minas dos Hekaranos que emitiam pulsos de vérton para desabilitar sistemas de subespaço sem causar dano físico.

A mina é tecnologia de **uso único**. Ao ser acionada por proximidade, emite um pulso de vérton que desabilita sistemas de subespaço e imediatamente se converte em bóia de sinalização — transmitindo a posição da nave para quem a colocou. Ela não explode, não causa dano físico. O dano é estratégico: paralisia + exposição.

**O que o pulso desabilita:**
- Warp — nave presa a impulso
- Sensores de longo alcance — horizonte encolhe
- Transmissor de longo alcance — sem contato com a Frota

Curto alcance e sistemas físicos da nave funcionam normalmente. A nave não está danificada — está paralisada e localizada.

**Detecção — três sinais que Ciências cruza:**

Nenhum sinal sozinho é conclusivo. Os três juntos constroem o caso.

- **Assinatura tecnológica fraca** — emissão mínima detectável só de perto ou com scan ativo
- **Composição anômala** — material não bate com o que deveria ser (asteroide, destroço)
- **Posição estrategicamente fixa** — objetos naturais derivam; a mina mantém posição

Scan ativo resolve a ambiguidade — mas revela a posição da nave. Se a mina é real, a facção que a colocou sabe que alguém está farejando a área.

**Papel de Comunicações:**

Interceptar tráfego da região pode confirmar qual facção está operando aqui e por quê — dando contexto ao Capitão antes da decisão. Depois do acionamento, Comunicações pode tentar interceptar o sinal da bóia para estimar de onde vem a resposta e quanto tempo a nave tem.

**As duas fases de tensão:**

*Fase 1 — Antes de acionar: paranoia*

Ciências reporta objeto não identificado à frente. Os sinais são ambíguos. Comunicações tem ou não tem tráfego da região. O Capitão decide: desviar custando tempo e rota, passar longe sem confirmar, ou fazer scan ativo para confirmar — aceitando o risco de revelar posição.

*"Capitão, objeto a 80.000 km, proa 015. Composição inconsistente com o esperado para essa região. Pode ser destroço. Pode não ser."*
*"Comunicações: interceptei tráfego dessa facção nesse setor há 40 minutos. Não sei o que estavam fazendo aqui."*
*"Se fizer scan ativo para confirmar, eles saberão que estamos aqui. Se não fizer e for mina, eles saberão de qualquer forma assim que passarmos perto."*

*Fase 2 — Depois de acionar: urgência*

O pulso aciona. Warp cai. Sensores de longo alcance caem. Transmissor cai. A bóia começa a transmitir.

Engenharia trabalha para restaurar sistemas — o pulso não causou dano permanente, mas a recuperação leva tempo. Comunicações tenta interceptar o sinal da bóia para estimar origem e tempo de resposta. O Capitão coordena sem mapa e sem comunicação externa, sabendo que alguém está a caminho.

*"Engenharia: warp offline, estimativa de restauração 8 minutos. Sensores de longo alcance, mais 5 depois disso."*
*"Comunicações: consigo ouvir o sinal da bóia mas não consigo localizar a origem — está criptografado."*
*"Capitão, não sabemos de onde vem a resposta nem quanto tempo temos."*

**A dinâmica cooperativa central:**

A mina cria dois problemas em sequência — decidir com informação incompleta se o objeto é perigoso, e depois sobreviver às consequências de ter errado, ou de ter acertado e passado perto demais mesmo assim.

---

##### Campo de Interdição — detalhamento completo

**Ameaça central:** Nave inimiga em posição estratégica que projeta campo supressor de warp
**Postos mais ativados:** Ciências + Helm + Tático
**Tom:** Urgência e fuga — ou decisão de enfrentar

Uma nave inimiga em posição estratégica — rota de trânsito, ponto de passagem obrigatório — projeta um campo que suprime a capacidade de warp numa área ao redor dela. Qualquer nave que entre no raio do campo cai para impulso e não consegue reengajar o warp enquanto permanecer dentro.

Diferente da Mina — que age por surpresa e em um único momento — o Campo é **contínuo e visível**. A nave inimiga está lá, o campo está ativo, e a tripulação sabe disso antes de entrar. A tensão é antecipação, não surpresa.

**Detecção:**

Ciências detecta a nave inimiga pelos sensores de longo alcance com antecedência. A presença do campo é inferível pela posição estratégica da nave — mas só confirmada quando a nave entra no raio ou faz scan ativo próximo o suficiente.

O raio do campo tem alcance definido. Ciências pode estimar pelo tipo de nave inimiga e pela assinatura do emissor — com margem de erro. Helm precisa saber se consegue passar pela rota mantendo distância suficiente, ou se qualquer rota viável passa pelo raio.

**As três decisões cooperativas:**

*Decisão 1 — Na aproximação: fugir, contornar ou enfrentar*

Antes de entrar no raio, o Capitão tem opções:
- **Desviar** — contornar o campo custando tempo. Funciona se houver rota alternativa fora do raio estimado.
- **Recuar** — inverter curso antes de entrar no alcance. Abandona o objetivo da missão na direção atual.
- **Enfrentar** — entrar no raio intencionalmente e combater. O campo afeta qualquer nave dentro do raio, inclusive a projetora — com warp suprimido para os dois lados.

*"Ciências: nave de porte médio a 200.000 km, posição estratégica na rota. Estimo raio do campo em 50.000 km — mas pode ser mais."*
*"Helm: se o raio for 50.000 km consigo contornar a esquerda com 80.000 km de margem. Se for 70.000 km ou mais, não tem rota livre."*
*"Capitão: contornar, recuar, ou entrar e combater?"*

*Decisão 2 — Se entrar no campo: combate a impulso*

Com warp suprimido para ambos os lados, o combate muda de natureza. Sem warp, não há fuga rápida — quem entra no campo luta ou sai a impulso. Helm manobra em velocidade sublumínica. Tático combate sem a opção de warp para reposicionamento. Engenharia aloca energia com o warp offline — toda a pool vai para escudos, phasers e impulso.

A nave inimiga que projeta o campo está necessariamente parada ou lenta — o campo consome energia significativa. Destruí-la ou danificá-la o suficiente derruba o campo.

*Decisão 3 — Sair do campo*

Se a nave conseguir sair do raio sem destruir a inimiga, o warp volta imediatamente. Helm precisa saber a direção de saída mais rápida. Ciências estima enquanto o combate acontece.

**Papel de Comunicações:**

Interceptar comunicações da nave inimiga durante o confronto — ela provavelmente está coordenando com outras naves fora do campo. Comunicações pode identificar se há reforços chegando e quanto tempo a nave tem antes de o campo se tornar uma armadilha com mais de um inimigo.

**A sinergia com a Mina:**

As duas armadilhas são projetadas para funcionar juntas. Uma combinação clássica de facção organizada: mina na rota principal que paralisa a nave, campo de interdição cobrindo a rota alternativa. A tripulação que sobreviveu à mina e está restaurando sistemas a impulso pode descobrir que a única rota de saída passa pelo raio de um campo.

*"Ciências: nave inimiga a 120.000 km na única rota de saída disponível a impulso."*
*"Comunicações: o sinal da bóia estava transmitindo exatamente para essa direção."*

**A dinâmica cooperativa central:**

O Campo cria a situação oposta da Mina — informação completa, tempo limitado, decisão forçada. Não é paranoia, é clareza brutal: aquela nave está ali de propósito, o campo está ativo, e a tripulação precisa decidir antes de entrar no raio.

*"Capitão, não temos rota alternativa viável. Entrar no campo é combate garantido. Recuar é abandonar a missão. Qual é a ordem?"*

---

#### Categoria 3 — Condições de Subespaço

Sistema independente que representa o estado invisível do espaço em si. Não é um obstáculo que se desvia nem uma armadilha que se detecta — são variações locais que tornam algumas rotas mais eficientes do que outras.

O jogo sabe onde estão essas condições. A nave não sabe — a menos que Ciências as mapeie durante a viagem.

| Condição | Efeito | Quem sente primeiro |
|---|---|---|
| **Corrente favorável** | Mesmo fator de warp com menos energia, ou mais velocidade pelo mesmo custo | Engenharia vê consumo cair |
| **Zona de resistência** | Consumo sobe, teto seguro cai ligeiramente | Engenharia vê consumo subir, Helm sente o teto baixar |
| **Turbulência de subespaço** | Campo de dobra instável, fator de warp oscila | Helm sente o slider ficar impreciso |

**Como funciona na prática:**

Durante a viagem em warp, Ciências pode fazer leituras passivas contínuas do subespaço — detectando variações de densidade e correntes favoráveis à frente. O Computador de Navegação recebe essas leituras e pode sugerir desvios de rota que parecem mais longos no mapa mas são mais eficientes em energia e tempo real.

A tensão não é urgência — é **otimização com informação incompleta**:

- Ciências detecta corrente favorável a 15 graus da rota atual, mas precisaria de scan ativo para confirmar extensão. Scan ativo revela posição da nave.
- Helm pode ajustar o curso, mas isso alonga a rota aparente no mapa do Capitão sem explicação visual imediata.
- Engenharia confirma ou nega pela variação de consumo do reator em tempo real.
- Capitão vê uma rota diferente do que planejou e precisa confiar na tripulação para entender o porquê.

---

### 14.13 Computador de Navegação ✅

Responsável por calcular e monitorar rotas durante o warp. Não pilota a nave — informa o Helm do que fazer. O Helm continua no controle ativo e pode ignorar qualquer sugestão.

#### Fluxo de navegação

1. **Capitão** decide o destino e ordena verbalmente — *"Helm, curso para o sistema Kestrel"*
2. **Helm** inputa o destino no painel
3. **Computador** calcula o curso — vetor, fator de warp recomendado, tempo estimado de chegada
4. **Helm** engaja o warp seguindo as indicações do computador
5. **Computador** monitora a viagem continuamente e avisa o Helm quando precisar ajustar
6. **Helm** decide se segue a sugestão ou não

O Capitão não entra com nada no sistema — ele depende do Helm para executar a ordem. Se o Helm discordar ou hesitar, há uma tensão real. Erro de comunicação entre Capitão e Helm vira gameplay — ninguém percebe a rota errada até Ciências notar a discrepância.

#### O que o Computador sabe — três camadas

**Camada 1 — Conhecimento fixo**
Sistemas estelares conhecidos, bases da Frota, rotas estabelecidas. Sempre disponível, independente dos sensores. O Helm digita um destino catalogado e o computador plota o curso imediatamente.

**Camada 2 — Conhecimento descoberto na run**
Pontos de interesse que Ciências detectou com os sensores durante essa sessão. O computador só conhece o que foi revelado. Um sistema não escaneado não existe para o computador — o Helm não consegue plotar curso para ele.

**Camada 3 — Conhecimento inferido**
Condições de subespaço detectadas por Ciências durante a viagem. O computador incorpora essas leituras e recalcula a rota mais eficiente em tempo real — sugerindo desvios que parecem mais longos no mapa mas economizam energia ou tempo real.

#### Resultados possíveis ao inputar um destino

**Destino conhecido** → Computador plota curso imediatamente, alimenta o vetor pro slider do Helm.

**Destino desconhecido** → Computador retorna erro — sistema não catalogado. O Helm reporta ao Capitão. Solução: Ciências faz scan ativo para localizar e catalogar o destino antes de poder plotar o curso.

**Destino parcialmente conhecido** → Computador conhece a direção geral mas sem dados suficientes para rota precisa. Plota curso aproximado com margem de erro — Ciências precisa refinar durante a viagem.

#### Progressão natural de dificuldade por região

No Espaço da Frota, quase tudo é conhecido — o computador funciona suavemente. Na Zona de Fronteira e no Espaço Contestado, destinos começam a aparecer como desconhecidos. No Espaço Profundo, o computador está essencialmente voando às cegas — cada destino precisa ser descoberto primeiro pelos sensores de Ciências.

#### Energia e consumo

O Computador de Navegação usa a mesma pool do reator. Consumo baixo e contínuo em operação normal — quase imperceptível. Mas tem uma relação direta com o warp: quanto mais alto o fator de warp, mais o computador precisa processar para manter a margem de segurança de evasão de obstáculos. O consumo sobe proporcionalmente.

**A regra central:** o computador precisa de poder de processamento acima do que o warp consome para manter a navegação segura. Se Engenharia reduzir energia do computador abaixo de um threshold, o sistema avisa o Helm que precisa reduzir o fator de warp proporcionalmente.

**A decisão que isso cria para Engenharia:** em situação de crise — combate iminente, energia escassa — é tentador cortar energia do computador de navegação para alimentar escudos ou armas. O Helm perde as sugestões automáticas de rota. Se há um hazard não mapeado à frente, ninguém avisa.

**Não suporta overload.** Forçar o computador de navegação além do limite durante o warp seria desabilitar os olhos da nave enquanto viaja a velocidades superluminares. Está na mesma lista do suporte de vida — sistemas que não podem ser sobrecarregados.

#### A cadeia de dependência

O computador é o elo central de uma cadeia:

```
Sensores de Longo Alcance → Computador de Navegação → Helm
```

Se os sensores estão degradados por um hazard, o computador recebe dados ruins e plota rotas ruins — sem saber que são ruins. O Helm segue uma sugestão baseada em informação falsa.

Se o computador está danificado, o Helm recebe sugestões erradas mesmo com sensores perfeitos.

Se ambos estão degradados simultaneamente — o pior cenário — o Helm voa às cegas com Ciências como único guia humano.

#### Degradação — três estados

**Estado 1 — Operação normal**
Plota rotas, monitora condições de subespaço, avisa o Helm de desvios necessários, integra leituras de Ciências em tempo real.

**Estado 2 — Danificado**
Perde precisão progressivamente. Rotas calculadas têm margem de erro crescente. Sugestões de desvio chegam atrasadas ou incorretas. O Helm começa a receber avisos inconsistentes — às vezes contradizendo o que Ciências reporta diretamente. Quem o Helm acredita?

**Estado 3 — Offline**
Sem computador, o Helm entra em **modo de navegação estimada** — dead reckoning. Navega por heading, velocidade e tempo. Sem aviso automático de obstáculos. Sem sugestão de rotas. Ciências assume manualmente o papel do computador — fornecendo leituras em tempo real pelo canal de voz. É o estado mais exigente do par Helm + Ciências.

#### Interação com hazards de navegação

| Hazard | Efeito no Computador |
|---|---|
| **Nebulosa de Radiação** | Recebe leituras falsas dos sensores — plota rotas para obstáculos que não existem, ignora os que existem |
| **Nebulosa Tóxica** | Degradação progressiva do sistema — perde precisão de cálculo enquanto a nave está dentro |
| **Nebulosa Densa** | Limita o fator de warp máximo — o computador trava o slider do Helm abaixo do normal |
| **Poço Gravitacional** | Cálculo de rota fica instável — recalcula constantemente sem convergir numa rota estável |
| **Anomalia de Subespaço** | Completamente cego — não consegue calcular nenhuma rota dentro da anomalia |
| **Tempestade de Partículas** | Dano direto ao hardware — pode ir de danificado a offline dependendo da intensidade |
| **Mina de Interdição** | Pulso desabilita o computador instantaneamente — Helm cai em dead reckoning sem aviso |
| **Campo de Interdição** | Interfere no processamento — rotas calculadas ficam imprecisas enquanto o campo estiver ativo |

---

### 14.14 Transmissor de Longo Alcance ✅

Responsável por toda comunicação interestelar da nave — contato com a Frota, transmissões entre sistemas, interceptação de tráfego externo e jamming ofensivo. Operado por Comunicações, com canal paralelo exclusivo do Capitão.

#### Três canais

**Canal aberto**
Operado por Comunicações. Toda transmissão que entra e sai pela nave publicamente. Comunicações vê, monitora e pode interceptar tráfego externo. Hails recebidos chegam aqui primeiro.

**Canal classificado do Capitão**
Canal paralelo exclusivo — Comunicações detecta que houve atividade no canal (o sinal é visível), mas não vê o conteúdo. A criptografia é inquebrável a bordo — qualquer tentativa de processamento consumiria energia suficiente para ser detectada imediatamente. O Capitão é sempre destinatário. Se a mensagem for também endereçada a Comunicações, o aviso de chegada é enviado para o posto — caso contrário, Comunicações não é notificado.

**Dispositivo de emergência**
Hardware portátil do Capitão. Funciona independente do transmissor principal — inclusive quando ele está offline. Bateria limitada, recarregável entre usos. Capacidade restrita: poucas transmissões por sessão. Último recurso para contato com a Frota em situação crítica.

#### Três modos de operação

**Passivo — monitoramento**
Sempre ativo quando o sistema tem energia. Comunicações monitora o éter: tráfego inimigo, chamados de socorro de outras naves, padrões de movimento de frotas. É o principal gerador de inteligência do posto — a informação que só Comunicações tem e decide o que compartilhar.

**Transmissivo — envio**
Enviar mensagens para a Frota, responder hails, transmitir no canal aberto. Consumo moderado por transmissão.

**Ofensivo — jamming**
Comunicações emite sinal de interferência que bloqueia comunicações inimigas numa área. O inimigo sabe que está sendo bloqueado e pode tentar mudar de frequência — Comunicações precisa acompanhar, o que aumenta o custo.

Três níveis de jamming com custo crescente:

| Nível | Descrição | Custo de energia |
|---|---|---|
| **Direcionado** | Comunicações interceptou a frequência inimiga previamente e bloqueia especificamente ela | Baixo — requer trabalho de inteligência anterior |
| **Parcial** | Bloqueia as frequências conhecidas do inimigo | Moderado — inimigo pode encontrar frequência livre com tempo |
| **Total** | Cobre todo o espectro — inimigo completamente bloqueado | Altíssimo — insustentável por muito tempo, Engenharia sente imediatamente |

**Jamming é detectável** — o inimigo sabe que está sendo bloqueado e pode localizar a fonte do sinal. A decisão de fazer jamming revela posição e intenção.

**A sinergia de inteligência:** Comunicações que monitora o éter continuamente tem vantagem enorme — já sabe a frequência inimiga e pode fazer jamming direcionado a custo baixo. Comunicações passivo o tempo todo precisa recorrer ao jamming bruto e caro.

**A decisão cooperativa central:** jamming total durante combate drena energia que Engenharia poderia alocar para escudos ou phasers. O Capitão decide: vale isolar o inimigo comunicacionalmente a custo de enfraquecer a defesa?

#### Degradação por região

| Região | Comportamento |
|---|---|
| **Espaço da Frota** | Funciona plenamente — rede de retransmissores cobrindo toda a região |
| **Zona de Fronteira** | Delay crescente, sinal instável em regiões remotas |
| **Espaço Contestado** | Interferência inimiga frequente — jamming passivo do ambiente |
| **Espaço Profundo** | Pode não alcançar nada sem retransmissores — isolamento estratégico real |

#### Degradação por dano

**Sistema danificado:** alcance reduzido, transmissões podem não chegar, interceptação perde resolução, jamming menos eficaz.

**Sistema offline:** canal aberto cai — Comunicações perde interceptação e capacidade ofensiva. O Capitão ativa o dispositivo de emergência para manter contato mínimo com a Frota.

**Dispositivo de emergência esgotado:** Capitão completamente isolado da Frota. Nenhuma nova ordem, nenhum reforço, nenhuma inteligência externa. A missão continua com o que a tripulação já sabe.

#### Interação com hazards

| Hazard | Efeito no Transmissor |
|---|---|
| **Nebulosa de Radiação** | Zona 1: sinal instável. Zona 2: longo alcance fora, curto alcance picotado. Zona 3: silêncio total externo |
| **Nebulosa Tóxica** | Degradação progressiva do alcance |
| **Nebulosa Densa** | Interferência moderada — transmissões chegam com delay ou fragmentadas |
| **Poço Gravitacional** | Distorção do sinal — transmissões podem chegar corrompidas |
| **Anomalia de Subespaço** | Silêncio total — subespaço inacessível dentro da anomalia |
| **Tempestade de Partículas** | Dano progressivo ao hardware do transmissor |
| **Mina de Interdição** | Pulso pode derrubar o transmissor junto com outros sistemas |
| **Campo de Interdição** | Jamming externo ativo — Comunicações luta contra interferência constante |

---

### 14.15 Comunicador de Curto Alcance ✅

Os olhos e ouvidos da nave dentro do sistema estelar. Conecta a nave com tudo ao redor imediato — outras naves, estações, planetas, destroços. Enquanto o Transmissor de Longo Alcance conecta com a galáxia, o Comunicador de Curto Alcance conecta com o combate, a negociação e a coordenação local.

#### Operação

Comunicações opera por padrão. Diferente do longo alcance — que exige expertise para monitorar o éter e fazer jamming eficaz — qualquer posto pode abrir um canal básico de curto alcance em emergência. Se Comunicações cair, a ponte não fica completamente muda: o Capitão pode abrir frequências diretamente, Tático pode aceitar um hail inimigo, Ciências pode contatar uma estação.

O que se perde sem Comunicações é a camada de expertise — interceptação passiva de comunicações próximas, jamming direcionado, identificação de protocolos desconhecidos.

#### Modos de operação

**Passivo — monitoramento local**
Sempre ativo. Detecta transmissões no sistema — comunicações entre naves inimigas próximas, sinais de socorro de outras naves, tráfego de estações. Mais simples que o monitoramento do longo alcance: o sinal é mais forte, mais claro, mais fácil de interpretar.

**Transmissivo — hailing**
Abrir frequências, responder hails, negociar, coordenar com aliados no sistema. Consumo baixo. É o canal de toda diplomacia e negociação tática — rendição, cessar-fogo, pedido de assistência.

**Ofensivo — jamming local**
Mais rápido e mais barato que o jamming do longo alcance. Dois níveis:

| Nível | Descrição | Custo |
|---|---|---|
| **Direcionado** | Bloqueia frequências conhecidas de uma nave específica próxima | Baixo |
| **Área** | Bloqueia todas as comunicações no sistema — inclusive aliados | Moderado — isola todos, não só o inimigo |

O jamming de área é a arma mais drástica de Comunicações — silencia o sistema inteiro. O inimigo não consegue coordenar com outras naves próximas, mas a tripulação também perde coordenação com qualquer aliado presente.

#### O canal de negociação

O Capitão ordena verbalmente: *"Comunicações, abra frequências"*. Comunicações executa — e passa a ser o intermediário da conversa. O que a outra parte diz chega primeiro no painel de Comunicações, que decide o que retransmitir para o viewscreen ou para o Capitão.

Comunicações pode silenciar partes da conversa, identificar mentiras por análise de protocolo de transmissão, detectar se a nave inimiga está transmitindo em dois canais simultaneamente — falando com sua própria tripulação enquanto negocia com o Capitão.

#### Degradação — três estados

**Estado 1 — Operação normal**
Monitoramento passivo, hailing e jamming local disponíveis.

**Estado 2 — Danificado**
Alcance reduzido — só consegue contato com naves muito próximas. Jamming local menos eficaz. Hailing pode ficar picotado — a outra parte ouve parcialmente.

**Estado 3 — Offline**
Silêncio local. Sem negociação, sem coordenação com aliados no sistema, sem monitoramento de comunicações próximas. Qualquer posto pode tentar abrir um canal básico mas sem garantia de sucesso — e sem as capacidades avançadas de Comunicações.

#### Energia e overload

Consumo muito baixo em operação normal — o mais econômico dos sistemas de comunicação. O jamming de área é o único modo que consome energia significativa.

**Não suporta overload.** Forçar o sistema além do limite não aumenta o alcance — apenas danifica os transmissores.

#### A assimetria com o longo alcance

Os dois sistemas de comunicação têm falhas em momentos diferentes:

- **Longo alcance cai primeiro** em hazards de interferência — a nave perde contato com a Frota mas ainda se comunica localmente
- **Curto alcance cai junto** em hazards de dano físico — perde contato externo e local simultaneamente
- Em combate, **ambos podem estar sob pressão** — jamming inimigo no longo alcance + dano ao curto alcance = isolamento completo

#### Interação com hazards

| Hazard | Efeito |
|---|---|
| **Nebulosa de Radiação** | Zona 1: leve degradação. Zona 2: instável, picotado. Zona 3: offline |
| **Nebulosa Tóxica** | Degradação progressiva do alcance |
| **Nebulosa Densa** | Interferência moderada — comunicações locais fragmentadas |
| **Poço Gravitacional** | Distorção de sinal próximo ao objeto massivo |
| **Anomalia de Subespaço** | Offline dentro da anomalia |
| **Tempestade de Partículas** | Dano progressivo ao hardware |
| **Mina de Interdição** | Pulso pode derrubar junto com outros sistemas |
| **Campo de Interdição** | Jamming externo ativo — comunicações locais perturbadas |

---

### Sistemas da nave — status

| Sistema | Status |
|---|---|
| Hull | ✅ |
| Energia | ✅ |
| Escudos | ✅ (parcial — valores numéricos pendentes) |
| Phasers | ✅ (parcial — valores numéricos pendentes) |
| Torpedos de Fótons | ✅ |
| Impulso | ✅ |
| Warp | ✅ |
| Sensores de Longo Alcance | ✅ |
| Sensores de Curto Alcance | ✅ |
| Suporte de Vida | ✅ |
| Loop de Combate | ✅ |
| Hazards de Navegação | ✅ |
| Computador de Navegação | ✅ |
| Transmissor de Longo Alcance | ✅ |
| Comunicador de Curto Alcance | ✅ |

---

## 15. Padrões de Missão ✅

O Starbridge gera missões proceduralmente combinando um **tipo base** com variáveis de contexto (facção, região, complicação, objetivo oculto do Capitão). Todos os tipos são executáveis inteiramente da ponte — sem away team, sem EVA.

### Estrutura procedural

Cada missão é gerada combinando:

| Variável | Função |
|---|---|
| **Tipo** | Um dos 23 padrões abaixo |
| **Objetivo primário** | O que define sucesso — conhecido pela tripulação |
| **Objetivo oculto** | Só o Capitão sabe — pode contradizer o aparente |
| **Facção envolvida** | Define comportamento e disponibilidade de negociação |
| **Região** | Define hazards disponíveis, alcance de comunicações, desconhecimento do mapa |
| **Complicação** | Uma variável que muda o estado da missão em algum ponto |
| **Condição de falha** | O que encerra a missão negativamente |

O **objetivo oculto do Capitão** é o elemento central de assimetria — a tripulação pode executar perfeitamente o que parece ser a missão e ainda assim falhar porque o Capitão tinha informação que não compartilhou. Ou ter sucesso além das expectativas porque o Capitão revelou o objetivo real no momento certo.

---

### Os 23 tipos de missão

---

#### 1. Intercepção / Perseguição
**Tom:** Velocidade e antecipação | **Postos:** Helm, Engenharia, Ciências

A nave precisa alcançar, interceptar ou ser interceptada por outro objeto em movimento antes que algo aconteça.

**Variações:** interceptar nave aliada sabotada em rota de colisão; perseguir nave hostil que foge com algo valioso; escapar de perseguição com nave superior; corrida para o mesmo destino com outra facção.

**Complicação procedural:** hazard no caminho; alvo muda de rota; terceira nave entra na equação.

---

#### 2. Escolta
**Tom:** Proteção sob pressão | **Postos:** Tático, Ciências, Comunicações, Helm

Proteger outro objeto em movimento de A até B. O objeto pode ser nave aliada, cargueiro, cápsula de escape.

**Variações:** nave aliada danificada sem armamento sob ataque intermitente; escolta com ameaça oculta — o atacante usa a nave escoltada como isca; escolta de refém com civis a bordo; escolta dupla de naves em direções opostas atacadas simultaneamente; escolta de desertor que a tripulação não sabe ser desertor.

**Complicação procedural:** nave escoltada toma decisões próprias; destino muda; hazard separa escolta do escoltado.

---

#### 3. Resgate / Recuperação
**Tom:** Urgência e verificação | **Postos:** Ciências, Comunicações, Helm, Engenharia

Recuperar algo ou alguém no espaço usando sistemas da nave — tractor beam, beaming, dock. Nenhum tripulante sai.

**Variações:** sinal de socorro que pode ser armadilha; recuperação de destroços com caixa-negra em área disputada; resgate em zona de combate que exige janela de extração; resgate com prazo de suporte de vida; sinal falso descoberto durante a aproximação.

**Complicação procedural:** sinal intermitente; terceira facção reivindica o objeto; extração abre brecha nos escudos.

---

#### 4. Exploração / Mapeamento
**Tom:** Curiosidade e risco | **Postos:** Ciências, Capitão

Investigar um fenômeno, região ou objeto desconhecido usando apenas os sistemas da nave.

**Variações:** scan de anomalia com comportamento imprevisível; mapeamento de região antes que outra facção chegue; investigação de destroços — a causa ainda pode estar presente; rastreamento e recuperação de sonda com dados classificados; fenômeno em evolução que Ciências tenta prever enquanto a situação escalona.

**Complicação procedural:** o fenômeno atrai ou interfere com sistemas; outra nave chega com agendas conflitantes; a própria investigação causa o evento.

---

#### 5. Diplomacia / Negociação
**Tom:** Tensão verbal e informação assimétrica | **Postos:** Comunicações, Capitão, Tático

Resolver um conflito ou criar uma aliança usando comunicação — da ponte, pelo viewscreen.

**Variações:** negociação de passagem por espaço controlado; mediação de conflito iminente entre duas facções; negociação sob pressão com inimigo armado; negociação com informação assimétrica — Comunicações sabe algo que o Capitão não sabe; negociação falsa onde a outra parte ganha tempo; leilão diplomático com múltiplas facções querendo a mesma coisa.

**Complicação procedural:** a outra parte descobre que Comunicações interceptou algo; terceira parte interfere no canal; a negociação trava e o Capitão precisa decidir se chama o blefe.

---

#### 6. Bloqueio / Controle de Acesso
**Tom:** Julgamento com dados parciais | **Postos:** Comunicações, Ciências, Capitão, Tático

Controlar quem passa por um ponto específico do espaço — impedindo ou permitindo passagem com base em critérios avaliados em tempo real.

**Variações:** bloqueio sanitário de nave potencialmente contaminada; bloqueio de embargo com a nave do lado errado; ponto de inspeção para identificar nave contrabandeando algo perigoso entre várias que passam; abrir janela de passagem temporária para aliados presos do outro lado; bloqueio com desertor de facção aliada tentando fugir.

**Complicação procedural:** nave suspeita chama reforços; o bloqueio é uma armadilha; a nave que passa carrega algo diferente do declarado.

---

#### 7. Fuga / Evasão
**Tom:** Velocidade e improvisação | **Postos:** Helm, Engenharia, Ciências, Comunicações

Sair de uma situação impossível de vencer por combate, chegando a um ponto seguro com a nave intacta o suficiente para continuar.

**Variações:** fuga com perseguidor de capacidades superiores usando hazards como cobertura; fuga com sistemas danificados e Engenharia em triagem; fuga com prazo externo — evento na região que vai destruir tudo; fuga falsa onde o perseguidor tenta entregar uma mensagem; fuga planejada onde o Capitão não revelou completamente o plano.

**Complicação procedural:** perseguidor tem exatamente o mesmo fator de warp; aliado aparece e complica; rota de saída passa por hazard não mapeado.

---

#### 8. Crise de Sistemas / Sobrevivência
**Tom:** Triagem e sobrevivência | **Postos:** Engenharia, Ciências

A nave está com sistemas falhando — por dano em combate, hazard, sabotagem ou evento desconhecido. A missão é sobreviver e sair com o máximo de sistemas funcionais.

**Variações:** dano em combate com sistemas críticos comprometidos e nave vulnerável; falha em cascata onde um sistema danificado causa falha em outros; sabotagem — sistemas falhando por razão desconhecida, Ciências e Comunicações tentam identificar se é mecânico ou intencional; evento externo que derrubou múltiplos sistemas e deixou a posição desconhecida; suporte de vida crítico com timer iniciado.

**Complicação procedural:** inimigos detectam a nave vulnerável; reparo de um sistema agrava outro; a causa da falha revela algo sobre a missão.

---

#### 9. Gato e Rato / Guerra de Sensores
**Tom:** Silêncio e dedução | **Postos:** Ciências, Engenharia, Capitão, Comunicações

Duas naves que se conhecem mutuamente jogam um jogo de dedução, posicionamento e enganação — sem combate declarado. A batalha é de informação.

**Base canônica:** "Balance of Terror" (TOS) — a Enterprise e o Pássaro de Rapina ficam em silêncio por quase dez horas, motores desligados. "For the Uniform" (DS9) — assinatura de nave maquis completamente falsa.

**Variações:** silêncio total com qualquer uso de energia revelando posição; isca e decoy para fingir estar em outro lugar; assinatura falsa de nave aliada para baixar escudos; espera ativa onde ambas as naves se localizaram mas nenhuma quer atirar primeiro.

**Complicação procedural:** terceira nave aparece; o silêncio tem um prazo — reforços chegando de um dos lados.

---

#### 10. Operação Coberta / Missão sob Identidade Falsa
**Tom:** Teatro e dupla agenda | **Postos:** Comunicações, Capitão, Ciências, Tático

A nave opera com identidade, bandeira ou intenção diferente da real. Comunicações gerencia a fachada; Capitão gerencia a missão real.

**Base canônica:** "The Enterprise Incident" (TOS) — Kirk age como comandante instável para encobrir missão de espionagem. "The Wounded" (TNG) — a missão real do Capitão não é declarada à tripulação até metade do episódio.

**Variações:** nave neutra fingindo facção para transitar por espaço contestado; missão dentro da missão onde o Capitão tem ordens secretas que contradizem o objetivo aparente; provocação calculada — a nave age de forma a induzir um comportamento específico na outra parte; cobertura que começa a ser questionada pela outra parte.

**Complicação procedural:** scan mais profundo ameaça revelar a identidade; um tripulante descobre a agenda real e o Capitão decide o que fazer com isso.

---

#### 11. Confronto / Impasse
**Tom:** Blefe e postura | **Postos:** Capitão, Comunicações, Tático, Ciências

Duas forças estão em standoff — armadas, em posição, nenhuma querendo ser a primeira a recuar nem a atacar. A resolução depende de quem acredita no blefe de quem.

**Base canônica:** "The Corbomite Maneuver" (TOS) — Kirk inventa o Corbomite. "Redemption" (TNG) — Picard usa a postura de uma frota inteira para bloquear suprimento romulano sem disparar um tiro.

**Variações:** blefe de capacidade com sistema que a nave não tem ou não usaria; impasse territorial onde qualquer movimento é interpretado como escalada; contagem regressiva de ultimato; impasse com audiência onde o resultado vai definir precedente regional.

**Complicação procedural:** terceira parte rompe o equilíbrio; o blefe é chamado; o prazo expira antes de resolução.

---

#### 12. Prevenção / Contra o Relógio
**Tom:** Pressão de prazo | **Postos:** Todos

Algo ruim vai acontecer num prazo definido. A missão é chegar, entender e resolver antes que o tempo acabe — inteiramente da nave.

**Base canônica:** "The Omega Directive" (VOY) — localizar e destruir moléculas Omega antes da detonação. "For the Uniform" (DS9) — planetas sendo envenenados enquanto a caça acontece.

**Variações:** localizar e chegar — o evento vai acontecer num ponto do espaço; parar à distância via sinal, pulso ou transmissão sem chegar fisicamente; escolha de salvamento — dois eventos, a nave só pode prevenir um; timer que acelera conforme a taxa de degradação muda durante a missão.

**Complicação procedural:** o prazo original estava errado; a solução funciona mas cria um novo problema; Ciências recalcula — há menos tempo do que pensavam.

---

#### 13. Investigação / Dedução
**Tom:** Raciocínio e evidência | **Postos:** Ciências, Comunicações, Capitão, Helm

Algo aconteceu. A missão é descobrir o que foi, quem foi, e por quê — usando apenas os sistemas da nave.

**Base canônica:** "For the Uniform" (DS9) — Sisko reconstrói o padrão de Eddington e prevê o próximo alvo. "Night Terrors" (TNG) — nave derelicta onde toda a tripulação se matou; o mistério é reconstruído pelos sistemas da nave.

**Variações:** investigação de destroços — a causa pode ainda estar presente; rastreamento de fugitivo por transmissões residuais e rastros de warp; identificação de ameaça oculta que opera na região — a missão termina quando o Capitão consegue nomeá-la com evidência; interrogatório por sinal — decodificando intenção e identidade de tráfego fragmentado.

**Complicação procedural:** a evidência é contradição em si mesma; o rastreamento leva a um lugar que cria um novo problema; identificar o responsável exige uma decisão sobre o que fazer com essa informação.

---

#### 14. Armadilha / Engodo
**Tom:** Paranoia crescente | **Postos:** Ciências, Comunicações, Capitão, Tático

A situação inicial é falsa. O que parece ser uma oportunidade, um socorro ou uma rota segura foi deliberadamente projetado para atrair a nave para uma posição de desvantagem.

**Base canônica:** "For the Uniform" (DS9) — assinatura de nave maquis completamente falsa que misdirects o Defiant enquanto o alvo real ataca em outro lugar.

**Variações:** sinal de socorro falso — ao chegar, a situação é diferente do reportado; destroço armado que detona ou ativa sistema hostil na aproximação; rota comprometida com informação sabotada ou desatualizada; nave fantasma sem sinais de vida mas com sistemas ativos que reage de forma imprevisível.

**Complicação procedural:** a armadilha tem múltiplas camadas; identificar que é engodo cria pressão de tempo — quem colocou sabe que a nave chegou.

---

#### 15. Pressão de Recursos / Subsistência
**Tom:** Tensão de gestão | **Postos:** Engenharia, Helm, Comunicações, Capitão

A nave está em estado crítico de algum recurso essencial. A missão é garantir reabastecimento ou economizar o suficiente para sobreviver até o próximo ponto seguro.

**Variações:** corrida para o reabastecimento com cada salto de warp consumindo o que sobrou; negociação de recursos com facção que tem condições próprias; triagem de energia com Engenharia decidindo quais sistemas manter ativos; recurso como moeda de missão — completar o objetivo vai custar o que mal há.

**Complicação procedural:** o ponto de reabastecimento está comprometido; a negociação tem um custo que não era esperado; o recurso crítico cai mais rápido do que o previsto.

---

#### 16. Transporte com Segredo
**Tom:** Comprometimento crescente | **Postos:** Comunicações, Ciências, Capitão, Tático

A nave está transportando algo ou alguém de A para B. Durante o trajeto, a tripulação descobre que a carga ou o passageiro não é o que foi declarado.

**Base canônica:** Sunless Skies — transporte com consequências narrativas que se revelam durante o trajeto.

**Variações:** passageiro com agenda usando a nave para fins não declarados; carga proibida descoberta quando uma abordagem de inspeção está a caminho; carga que muda de status — o que era neutro se torna estrategicamente sensível em trânsito; passageiro que sabe demais — Comunicações descobre pela interceptação que outras partes querem o que está a bordo.

**Complicação procedural:** quem contratou o transporte está monitorando o progresso; a cada revelação as opções diminuem; descartar a carga resolve um problema e cria outro.

---

#### 17. Decodificação / Interpretação sob Pressão
**Tom:** Urgência intelectual | **Postos:** Comunicações, Ciências, Capitão

A nave recebeu algo que precisa ser interpretado corretamente antes de um prazo. A informação está distribuída entre postos que não compartilham visão direta. Errar tem consequências.

**Base canônica:** Keep Talking and Nobody Explodes — assimetria de informação onde quem vê o problema não tem o manual e quem tem o manual não vê o problema.

**Variações:** transmissão cifrada urgente que requer informação de Ciências para ser decodificada por Comunicações com interpretação final do Capitão; identificação amigo/inimigo de nave sem transponder a partir de padrões de emissão e tráfego interceptado; sequência de destravamento cujas pistas estão distribuídas entre sistemas diferentes; alerta de autenticidade — ordem da Frota que parece contraditória com ordens anteriores.

**Complicação procedural:** o prazo muda durante a decodificação; a resposta correta cria uma nova pergunta urgente; errar uma etapa não revela que errou — só as consequências revelam.

---

#### 18. Oportunidade de Terceiro / Colisão de Contextos
**Tom:** Improvisação e oportunismo | **Postos:** Ciências, Comunicações, Capitão, todos

A nave chega a uma situação que não foi criada para ela. Não havia missão definida; ela emerge do contexto.

**Base canônica:** FTL — a nave chega a um beacon e encontra algo inesperado; a decisão de o que fazer é toda do Capitão, sem briefing prévio.

**Variações:** duas naves em conflito com a nave no meio — pode intervir em qualquer lado, ficar de fora ou aproveitar a distração; janela de extração criada por situação em andamento que se fecha rapidamente; evento em cascata que mudou o contexto da missão original enquanto a nave transitava; nave funcional sem tripulação com destino programado, carga a bordo e história por trás.

**Complicação procedural:** a situação é mais complexa do que parecia; intervir cria uma obrigação; não intervir tem um custo que só aparece depois.

---

#### 19. Legado / Reputação
**Tom:** Peso do histórico | **Postos:** Capitão, Comunicações

O passado da nave encontra o presente. Uma dívida, um juramento, uma ação antiga que agora tem consequências. A missão não chegou via briefing da Frota — ela encontrou a nave.

**Base canônica:** "Blood Oath" (DS9) — juramento de 81 anos que encontra o herdeiro da identidade independentemente de quem ele seja agora. "The Wounded" (TNG) — reputação de inimigo que persiste mesmo após o tratado. Voyager construindo reputação positiva no Delta Quadrant que abre portas.

**Variações:** dívida a cobrar — favor prometido por Capitão anterior sendo reclamado; reputação de inimigo em região onde ações passadas criaram hostilidade latente; reputação de aliado com expectativas maiores do que a nave consegue entregar; juramento herdado registrado no log da nave que o Capitão atual está obrigado a honrar.

**A dinâmica cooperativa central:**

*"Comunicações: estou recebendo uma transmissão endereçada à nave — não ao Capitão pelo nome, à nave. Usam o código de identificação antigo."*
*"Capitão: [consulta o log] Isso é de três anos atrás. Do Capitão anterior."*
*"O que eles querem?"*
*"O que foi prometido."*

---

#### 20. Presença Indesejada
**Tom:** Tensão latente — cada decisão de navegação é também uma declaração política | **Postos:** Comunicações, Ciências, Helm, Capitão

A nave está num lugar onde não é bem-vinda — não por ação hostil, mas por existir ali. Cada rota que Helm escolhe passa pelo espaço de uma facção diferente. Cada scan ativo de Ciências é registrado por quem está monitorando.

**Base canônica:** "The Wounded" (TNG) — a Enterprise navega por espaço Cardassiano com oficial inimigo a bordo monitorando cada movimento; a presença é provocação. Voyager no Delta Quadrant — constantemente em território de facções que têm suas próprias agendas.

**Variações:** espaço disputado onde qualquer rota endorsa uma posição; testemunha indesejada de algo que as partes envolvidas prefeririam que ninguém visse; presença que muda o equilíbrio de forças entre duas facções estáveis; identidade conhecida como problema em região com histórico não declarado no briefing.

**A dinâmica cooperativa central:**

*"Capitão, qualquer direção que tomemos, estamos tomando uma posição."*
*"Então tomamos a posição que completa a missão e deixa o máximo de opções abertas."*
*"Não existe essa posição."*
*"Encontre a mais próxima."*

---

#### 21. Missão Reinterpretada
**Tom:** Peso moral crescente | **Postos:** Comunicações, Capitão

O objetivo da missão continua válido. Mas o que ele significa mudou no meio do caminho. A tripulação não sabe. O Capitão decide quanto compartilhar e quando.

**Base canônica:** "In the Pale Moonlight" (DS9) — Sisko começa querendo trazer os Romulanos para a guerra e vai descobrindo o custo real do que está disposto a fazer. "Yesterday's Enterprise" (TNG) — o significado da missão muda completamente quando se descobre o que realmente está em jogo.

**Variações:** o objetivo serve a quem? — a Frota mandou fazer X, mas Comunicações revela que X vai beneficiar uma facção que a nave normalmente não apoiaria; a situação mudou — o contexto que justificava a missão não existe mais mas a Frota ainda não sabe; a informação estava errada — o briefing era baseado em inteligência incorreta descoberta durante a execução; o custo real — a missão vai ser cumprida mas Comunicações descobriu o que ela vai custar em vidas ou consequências não declaradas.

**A dinâmica cooperativa central:**

*"Capitão, estamos a 20 minutos do objetivo. Alguma ordem adicional?"*

Pausa.

*"Mantenham o curso."*

A tripulação não sabe o que o Capitão sabe. O Capitão não sabe ainda o que vai fazer com isso. A missão continua — mas já não é a mesma missão.

---

#### 22. Escolha Impossível
**Tom:** Confronto sem saída boa | **Postos:** Todos — cada um com um dado diferente que pesa na decisão

A ponte confronta uma decisão sem resposta certa. Duas coisas reais e irreconciliáveis. A missão não termina quando o objetivo é alcançado — termina quando a escolha é feita e suas consequências começam.

**Base canônica:** "Caretaker" (VOY) — Janeway destrói o array para proteger os Ocampa, condenando a tripulação a 70 anos longe de casa. "Pen Pals" (TNG) — salvar um planeta vs. respeitar a Diretiva Primeira. "The Quality of Life" (TNG) — vidas humanas vs. direitos de uma nova forma de vida.

**Variações:** dois objetos a resgatar, tempo para um — Helm calcula rotas, Ciências avalia urgências, Comunicações tenta negociar tempo, o Capitão escolhe; dois lados de um conflito pedindo ajuda ao mesmo tempo — a nave vai definir o resultado do conflito pela escolha de quem ajuda; destruir algo valioso para salvar algo mais valioso — mas "mais valioso" é julgamento, não cálculo; honrar uma aliança ou proteger civis — as duas coisas são impossíveis ao mesmo tempo.

**O que diferencia:** não é urgência (tipo 12) onde existe uma saída se a nave for rápida o suficiente. É quando qualquer saída tem um custo real e permanente. A tripulação sente o peso porque cada posto contribui sua perspectiva — e o Capitão tem que decidir mesmo assim.

---

#### 23. Missão que Revela
**Tom:** Descoberta que muda a percepção | **Postos:** Comunicações, Ciências — o que eles encontram transforma o que a missão significa

Uma missão aparentemente simples — rotineira, clara, sem complicação aparente — que durante a execução expõe algo que muda a percepção da tripulação sobre onde estão, para quem trabalham, ou o que essa nave significa.

**Base canônica:** "Lower Decks" (TNG) — missão de rotina revela como a ponte funciona de baixo para cima. "Duet" (DS9) — identificação de prisioneiro vira confronto com a história inteira da ocupação. "Measure of a Man" (TNG) — audiência técnica revela o que a Federação realmente acredita sobre vida e direito.

**Mecânica procedural única:** esta missão funciona como **gatilho narrativo**. O que é revelado não é aleatório — é filtrado pelo log da nave. Uma nave que nunca esteve nessa região não ativa o mesmo thread que uma nave com história lá. Uma nave com uma facção específica no seu histórico ativa revelações específicas sobre essa facção. O sistema de lineage alimenta diretamente o gerador de missões: a missão simples é o pretexto; a revelação é o conteúdo específico daquela nave naquele momento da sua história.

**Variações:** scan de rotina revela que uma instalação conhecida tem função diferente da declarada; entrega simples que expõe como a Frota realmente trata essa região; identificação de objeto que revela algo sobre o Capitão anterior; patrulha de rotina que encontra evidência de algo que a nave inadvertidamente causou numa missão anterior.

**O que diferencia de todos os outros:** não há objetivo oculto, não há complicação externa, não há urgência. O que muda é interno. A missão é um espelho — e o que ela reflete é específico para aquela nave, naquele ponto da sua história.

---

### Resumo — 23 tipos de missão

| # | Tipo | Tom central |
|---|---|---|
| 1 | Intercepção / Perseguição | Velocidade e antecipação |
| 2 | Escolta | Proteção sob pressão |
| 3 | Resgate / Recuperação | Urgência e verificação |
| 4 | Exploração / Mapeamento | Curiosidade e risco |
| 5 | Diplomacia / Negociação | Tensão verbal |
| 6 | Bloqueio / Controle de acesso | Julgamento parcial |
| 7 | Fuga / Evasão | Velocidade e improvisação |
| 8 | Crise de sistemas | Triagem e sobrevivência |
| 9 | Gato e rato / Guerra de sensores | Silêncio e dedução |
| 10 | Operação coberta | Teatro e dupla agenda |
| 11 | Confronto / Impasse | Blefe e postura |
| 12 | Prevenção / Contra o relógio | Pressão de prazo |
| 13 | Investigação / Dedução | Raciocínio e evidência |
| 14 | Armadilha / Engodo | Paranoia crescente |
| 15 | Pressão de recursos | Tensão de gestão |
| 16 | Transporte com segredo | Comprometimento crescente |
| 17 | Decodificação / Interpretação | Urgência intelectual |
| 18 | Oportunidade de terceiro | Improvisação e oportunismo |
| 19 | Legado / Reputação | Peso do histórico |
| 20 | Presença Indesejada | Tensão latente |
| 21 | Missão Reinterpretada | Peso moral crescente |
| 22 | Escolha Impossível | Confronto sem saída boa |
| 23 | Missão que Revela | Descoberta que muda a percepção |

---

## 16. Decisões Pendentes

| Decisão | Status | Opções em aberto |
|---|---|---|
| Range de capacidade inicial na herança | **Pendente** | 30–45% / 20–40% / 10–35% |
| Recuperação de upgrades herdados | **Pendente** | Linear por missão vs. proporcional à dificuldade |
| Tom do jogo | ✅ **Definido** | Aventura/exploração cooperativa — referência: Star Trek TOS. Nem tenso/sério nem caótico/cômico. |
| Progressão dentro da sessão | **Pendente** | Como créditos são ganhos e gastos durante a missão |
| Sistema de missões procedurais | ✅ **Definido** | 23 tipos detalhados com variações, base canônica e dinâmica cooperativa |
| Penalidade de falha de missão | **Pendente** | O que a nave perde quando a missão fracassa |
| Valores de hull por tier | **Pendente** | A definir após todos os sistemas estarem definidos |
| Número de tipos de modulação | **Pendente** | Quantidade de caracteres possíveis na modulação |
| Quantidade de reparos de emergência por tier | **Pendente** | A definir |
| Munição de torpedos por tier | **Pendente** | A definir |
| Timer do suporte de vida | **Pendente** | Duração do timer crítico por tier |
| Teto de warp por tier | **Pendente** | Fator máximo seguro por tier da nave |
| Consumo de energia por fator de warp | **Pendente** | Curva de consumo a calibrar |
| Conteúdo dos eventos de warp | **Pendente** | Definir em sessão específica — filtrado por região |
| Facções por região | **Pendente** | Definir identidade e comportamento de cada facção |
| Pontos de interesse por região | **Pendente** | Tipos específicos de POI por região |
| Mina de Interdição — detalhamento | ✅ **Definido** | Uso único, bóia de sinalização, duas fases de tensão |
| Campo de Interdição — detalhamento | ✅ **Definido** | Campo contínuo, combate a impulso, sinergia com Mina |
| Computador de navegação — detalhamento | ✅ **Definido** | Energia, degradação, cadeia de dependência, interação com hazards |
| Transmissor de longo alcance — detalhamento | ✅ **Definido** | Canais, modos de operação, jamming, degradação por região e dano |
| Comunicador de curto alcance — detalhamento | ✅ **Definido** | Modos de operação, jamming local, canal de negociação, degradação |
| Nebulosa de Radiação — detalhamento | ✅ **Definido** | Três zonas, leituras falsas, dinâmica cooperativa |
| Nebulosa Tóxica — detalhamento | ✅ **Definido** | Três zonas, ponto de não-retorno, corrosão por camadas aleatória |
| Nebulosa Densa — detalhamento | ✅ **Definido** | Resistência gradual, sensores comprimidos, duas decisões cooperativas |
| Poço Gravitacional — detalhamento | ✅ **Definido** | Arrasto direcional, estilingue, reinicialização de emergência |
| Tempestade de Partículas — detalhamento | ✅ **Definido** | Dinâmica, dano por camadas, escudos como variável |
| Anomalia de Subespaço — detalhamento | ✅ **Definido** | Silêncio ativo, warp impossível, navegação por inferência |

---

## 17. Referências de Design

| Jogo | O que inspirou |
|---|---|
| **FTL: Faster Than Light** | Loop de gameplay, nave com sistemas interdependentes, missões procedurais |
| **No Man's Sky** | Herança de nave abandonada, restauração como arco narrativo |
| **Darkest Dungeon** | Missões aleatórias + base persistente entre runs |
| **Sunless Skies** | Nave com história e upgrades persistentes entre viagens |
| **Star Trek: Bridge Crew** | Referência de papéis assimétricos na ponte (4 jogadores, VR) |
| **Keep Talking and Nobody Explodes** | Assimetria de informação como mecânica central |
| **Hades** | Progressão roguelite bem executada com meta-progressão |
| **Mastermind** | Sistema de modulação de escudos e phasers |
| **Pokémon** | Referência de tipos e efetividade para o sistema de modulação |

---

## 18. Nome
**Starbridge Explorers** — nome definitivo. Abreviação natural: *Starbridge*.

---

*Documento gerado a partir de sessão de design. Atualizar conforme decisões forem tomadas.*
