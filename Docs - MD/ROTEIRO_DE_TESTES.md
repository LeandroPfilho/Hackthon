# LinhaMap — Roteiro de Testes do Sistema

> Plano de teste manual completo da Plataforma Preditiva de Trafegabilidade Rural.
> Disciplina **Teste de Software** — Hackathon Extensionista IFRO Ariquemes 2026/1.
> Abordagem alinhada ao **BSTQB/ISTQB CTFL 4.0, Cap. 6** (Particionamento de
> Equivalência e Análise de Valor-Limite). Complementa a suíte automatizada
> (`npm test`, 24 casos) com verificação ponta a ponta da interface e da API.

---

## 1. Objetivo

Comprovar que o LinhaMap **funciona corretamente** — não apenas que "responde", mas
que **responde com o resultado certo** (oráculo definido) — em cada funcionalidade
crítica, no caminho feliz e nas bordas/erros. A execução deste roteiro é a
**evidência de validação** exigida pelo edital e pela disciplina.

## 2. Escopo

| Em escopo | Fora de escopo |
| --- | --- |
| ~12 páginas, ~20 rotas de API, **contas (cadastro/login via Supabase Auth) e escopo de dados por usuário**, motor de score, classificação por IA (regras), integração Open-Meteo, ordens de serviço, alertas, **filtro de origem das denúncias**, modo demo, modos mock/Supabase | Carga/stress de larga escala, testes de penetração, e-mail/WhatsApp reais (são simulados no MVP), verificação de identidade real do usuário (conta = só e-mail+senha) |

## 3. Ambiente de teste

| Ambiente | URL / Comando | Modo de dados |
| --- | --- | --- |
| **Produção** | https://linha-map.vercel.app | Supabase + `DEMO_MODE=true` |
| **Local (Supabase)** | `npm run dev` → http://localhost:3000 | `.env.local` com `ENABLE_MOCK_DATA=false` |
| **Local (mock/offline)** | `ENABLE_MOCK_DATA=true` no `.env.local` | Em memória |
| **Automatizado** | `npm test` · `npm run verify` · `npx tsc --noEmit` | Mock |

**Navegadores alvo:** Chrome/Edge (desktop) e Chrome mobile (Android). Resoluções: 1366×768 e 390×844.

## 4. Convenções

- **ID do caso:** `CT-<suíte>-<n>` (ex.: `CT-MAPA-03`).
- **Tipo:** 🟢 Feliz · 🟡 Borda/Valor-limite · 🔴 Erro/Inválido.
- **Prioridade:** P1 (crítico — derruba a solução) · P2 (importante) · P3 (desejável).
- **Status de execução:** ✅ Passou · ❌ Falhou · ⚠️ Bloqueado · ⬜ Não executado.

## 5. Pré-condições gerais

1. Banco com o **seed** carregado (8 trechos, 6 denúncias). Para restaurar a qualquer
   momento: **Supabase → SQL Editor → colar e rodar `database/seed.sql`** (ver Apêndice B).
2. Conhecer os **8 trechos de referência** e seus IDs (Apêndice A).
3. Para testes de API protegida, ter o valor do `CRON_SECRET`.

## 6. Oráculo do sistema (regras de referência)

Todo "resultado esperado" deste roteiro deriva destas regras (fonte: `lib/services/scoring.ts`):

| Parâmetro | Valor |
| --- | --- |
| Pesos | chuva 72h **0,30** · previsão 7d **0,25** · declividade **0,15** · relatos **0,30** |
| Referências (100%) | chuva 72h **100 mm** · previsão 7d **150 mm** · declividade **10%** |
| Pontos de severidade | baixa **15** · média **30** · alta **45** · crítica **60** |
| Recência dos relatos | decai linearmente em **14 dias** (após isso, não conta) |
| Faixas de nível | **0–24 baixo · 25–49 médio · 50–74 alto · 75–100 crítico** |
| Janela de escoamento | projeção ≤20 mm **boa** · ≤45 mm **moderada** · >45 mm **ruim** |

> **Fato-chave para bordas:** a chuva+previsão+declividade somam no máximo **70 pontos**
> → **"crítico" (≥75) só é atingível com relatos recentes**. Esse acoplamento é a base
> de vários casos de valor-limite abaixo.

---

# SUÍTES DE TESTE

## ST-LANDING — Página inicial (`/`)

| ID | Tipo | P | Passos | Resultado esperado (oráculo) |
| --- | --- | --- | --- | --- |
| CT-LANDING-01 | 🟢 | P2 | Abrir `/` | Carrega < 3 s; exibe problema, público, "como funciona" e CTAs "Ver mapa"/"Registrar denúncia" |
| CT-LANDING-02 | 🟢 | P2 | Observar as estatísticas ao vivo | Números batem com o estado atual (ex.: nº de trechos críticos = 2 com o seed) |
| CT-LANDING-03 | 🟢 | P3 | Clicar em "Ver mapa de risco" | Navega para `/mapa` |
| CT-LANDING-04 | 🟡 | P3 | Abrir em tela 390×844 (mobile) | Layout responsivo, sem overflow horizontal, CTAs clicáveis |

## ST-MAPA — Mapa de risco e painel de detalhe (`/mapa`)

| ID | Tipo | P | Passos | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-MAPA-01 | 🟢 | P1 | Abrir `/mapa` | Mapa Leaflet centrado em Ariquemes; **8 trechos** desenhados como linhas coloridas |
| CT-MAPA-02 | 🟢 | P1 | Conferir cores por risco | crítico=vermelho, alto=laranja, médio=amarelo, baixo=verde; distribuição 2/2/2/2 |
| CT-MAPA-03 | 🟢 | P1 | Clicar no **Trecho Ponte do Branco** (C-65) | Abre painel com nível **crítico**, score, chuva 72h, previsão, declividade, relatos, **explicação textual** e **recomendações** |
| CT-MAPA-04 | 🟢 | P2 | Verificar a posição da **Linha C-70** | Linha aparece na localização real (~-9,84 / -62,98), não deslocada |
| CT-MAPA-05 | 🟡 | P2 | Com `DEMO_MODE=true`, comparar score do painel vs antes | Painel mostra o valor **armazenado/congelado** (ex.: Ponte do Branco = crítico/86), estável ao longo dos dias |
| CT-MAPA-06 | 🟢 | P2 | Clicar num trecho **baixo** (Laticínio C-75) | Painel mostra nível baixo e explicação de "trecho estável/trafegável" |
| CT-MAPA-07 | 🟡 | P3 | Dar zoom in/out e arrastar | Tiles carregam; tooltips mostram `rural_line — nome` ao passar o mouse |
| CT-MAPA-08 | 🔴 | P3 | Abrir `/mapa` com internet de tiles bloqueada | App não quebra; linhas/painel ainda funcionam (degradação visual dos tiles apenas) |

## ST-DENUNCIA — Denúncia colaborativa + classificação por IA (`/denuncia`)

| ID | Tipo | P | Passos / Dados | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-DEN-01 | 🟢 | P1 | Preencher descrição "Muita lama escorregadia na descida" e enviar | Denúncia criada; **categoria = lama**; risco do trecho **recalculado** |
| CT-DEN-02 | 🟢 | P1 | Descrição "Ponte cedendo, situação grave e intransitável" | **categoria = ponte_danificada**, **severidade = crítica** |
| CT-DEN-03 | 🟢 | P2 | Descrição "Atolei a caminhonete no barro" | **categoria = atolamento** |
| CT-DEN-04 | 🟢 | P2 | Acessar `/denuncia?segment=<id>` | Trecho vem **pré-selecionado** no formulário |
| CT-DEN-05 | 🟢 | P2 | Permitir GPS do navegador | Latitude/longitude preenchidas automaticamente |
| CT-DEN-06 | 🟢 | P3 | Anexar foto ≤ 2 MB | Upload aceito (data URL no modo demo) |
| CT-DEN-07 | 🟡 | P2 | Descrição "apareceu algo na via" (sem palavra-chave) | **categoria = outro** (degrada com segurança, não quebra) |
| CT-DEN-08 | 🔴 | P1 | Enviar com descrição vazia | Validação impede o envio (ou retorna erro tratado), **sem crash** |
| CT-DEN-09 | 🔴 | P2 | Enviar sem selecionar trecho | Bloqueia ou trata o erro com mensagem clara |
| CT-DEN-10 | 🔴 | P3 | Anexar foto > 2 MB | Rejeita com mensagem; não trava o formulário |
| CT-DEN-11 | 🟢 | P1 | Após enviar, abrir o trecho no mapa | `reports_count` aumentou e o score subiu coerentemente |
| CT-DEN-12 | 🟢 | P1 | Enviar denúncia **deslogado** | Criada normalmente como **anônima** (`user_id` nulo) — o envio **não exige conta** |
| CT-DEN-13 | 🟢 | P1 | Enviar denúncia **logado** | Vinculada à conta (`user_id` preenchido); aparece em `/conta` → "Minhas denúncias" |
| CT-DEN-14 | 🟡 | P2 | Nome do produtor com números/símbolos (ex.: "Jo@o 123") | Campo aceita **só letras e espaços** (limpa o resto); máx **60** caracteres |
| CT-DEN-15 | 🟡 | P2 | Telefone com letras/símbolos; depois enviar com 9 dígitos | Campo aceita **só dígitos** (máx **11**); ao enviar com <10 → erro "telefone incompleto" |
| CT-DEN-16 | 🟡 | P3 | Descrição: digitar e observar contador; enviar com 5 caracteres | Contador **x/1000**; envio bloqueado com "pelo menos 10 caracteres" |

## ST-CONTA — Contas de usuário: cadastro, login e escopo (`/cadastro`, `/login`, `/conta`)

> Autenticação via **Supabase Auth** (`@supabase/ssr`). Em produção, exige
> `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` e o provedor Email
> habilitado com **"Confirm email" desligado** (login imediato). Verificável em
> `GET {SUPABASE_URL}/auth/v1/settings` → `external.email:true`, `disable_signup:false`,
> `mailer_autoconfirm:true`.

| ID | Tipo | P | Passos / Dados | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-CONTA-01 | 🟢 | P1 | `/cadastro`: e-mail novo + senha (≥6) + confirmar iguais → "Criar conta" | Conta criada e **login imediato** → redireciona para `/conta` (sem confirmar e-mail) |
| CT-CONTA-02 | 🔴 | P2 | Cadastro com senha de 4 caracteres | Bloqueia: "a senha precisa ter pelo menos 6 caracteres" |
| CT-CONTA-03 | 🔴 | P2 | Cadastro com "senha" ≠ "confirmar senha" | Bloqueia: "As senhas não coincidem"; nada é enviado |
| CT-CONTA-04 | 🔴 | P2 | Cadastrar com e-mail já existente | Erro tratado: "Este e-mail já tem conta. Faça login." |
| CT-CONTA-05 | 🟢 | P1 | `/login` com credenciais corretas | Entra; header passa a mostrar **Conta** e **Sair** |
| CT-CONTA-06 | 🔴 | P1 | `/login` com senha errada | "E-mail ou senha incorretos."; **sem crash** |
| CT-CONTA-07 | 🟢 | P2 | Clicar **Sair** | Volta a deslogado (header mostra **Entrar**); sessão encerrada |
| CT-CONTA-08 | 🔴 | P1 | Acessar `/conta` **deslogado** | Redireciona para `/login?next=/conta` (HTTP 307) |
| CT-CONTA-09 | 🟢 | P1 | Logado, abrir `/conta` | Mostra o e-mail e **só os dados do usuário**: minhas denúncias, trechos que sigo e minhas notificações |
| CT-CONTA-10 | 🟡 | P1 | Criar 2 contas (A e B); cada uma faz 1 denúncia; abrir `/conta` em cada | Usuário **A não vê** a denúncia/notificação de **B** e vice-versa (escopo por `user_id`) |
| CT-CONTA-11 | 🟢 | P2 | Após login, recarregar a página | Sessão **persiste** (cookie); continua logado |
| CT-CONTA-12 | 🟢 | P3 | Header em diferentes estados | Deslogado → "Entrar"; logado → "Conta" + "Sair" |

## ST-SCORE — Motor do Índice de Trafegabilidade (valor-limite)

> Cobertos também por `npm test` (F1); aqui valida-se via API (`/api/segments/[id]` recompõe ao vivo quando `DEMO_MODE=false`).

| ID | Tipo | P | Entrada (demais fatores nulos) | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-SCORE-01 | 🟡 | P1 | Chuva 72h = **83 mm** | score 24,9 → **baixo** |
| CT-SCORE-02 | 🟡 | P1 | Chuva 72h = **84 mm** | score 25,2 → **médio** (fronteira baixo/médio) |
| CT-SCORE-03 | 🟡 | P1 | score = 49,9 vs 50 | **médio** vs **alto** (fronteira) |
| CT-SCORE-04 | 🟡 | P1 | score = 74,9 vs 75 | **alto** vs **crítico** (fronteira) |
| CT-SCORE-05 | 🟡 | P2 | Sem relatos, chuva/previsão/decliv. máximas | Máximo **70 → alto** (não atinge crítico sem relatos) |
| CT-SCORE-06 | 🟢 | P1 | Ponte do Branco (92/140/8,5 + 2 relatos) | score ≈ **92**, **crítico**, explicação cita "72h", 4 fatores, recomendações |
| CT-SCORE-07 | 🟡 | P2 | Relato com 15 dias | Recência ≈ 0 → relato **não** contribui |
| CT-SCORE-08 | 🔴 | P2 | Chuva negativa / valor absurdo | Saneado (clamp); score em [0,100]; **não explode** |
| CT-SCORE-09 | 🟢 | P2 | Trecho sem nenhum fator | score 0 → **baixo**; explicação "condições estáveis" |

## ST-DASH — Dashboard da Secretaria (`/dashboard`)

| ID | Tipo | P | Passos | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-DASH-01 | 🟢 | P1 | Abrir `/dashboard` | Cards de resumo: total de trechos (8), nº por nível, nº de denúncias |
| CT-DASH-02 | 🟢 | P2 | Conferir "trechos prioritários" | Ordenados por risco decrescente; Ponte do Branco no topo |
| CT-DASH-03 | 🟢 | P2 | Conferir mapa de calor | Pontos quentes coincidem com trechos de maior risco |
| CT-DASH-04 | 🟢 | P2 | Filtrar denúncias por categoria/status | Tabela filtra corretamente |
| CT-DASH-05 | 🟢 | P1 | Clicar "Exportar CSV" | Baixa CSV válido; abre no Excel; colunas e acentuação corretas |
| CT-DASH-06 | 🟡 | P3 | Exportar com filtro aplicado | CSV reflete apenas o subconjunto filtrado |
| CT-DASH-07 | 🟢 | P3 | Após criar denúncia nova, recarregar | Card de denúncias e tabela atualizam |
| CT-DASH-08 | 🟢 | P2 | Na tabela, conferir a coluna **Origem** | Denúncia de conta = selo **"Com conta"**; denúncia anônima = **"Anônima"** (derivado de `user_id`) |
| CT-DASH-09 | 🟢 | P2 | Filtro **origem** = "Com conta" / "Anônimas" / "Todas" | Tabela **e** mapa de calor filtram pela origem corretamente |
| CT-DASH-10 | 🟡 | P1 | Criar denúncia e **logo abrir** `/dashboard` | A denúncia recém-criada aparece **na hora** (dados server-side sempre frescos, `no-store`); contagem bate com `GET /api/reports` |

## ST-REL — Relatório semanal (`/relatorios`)

| ID | Tipo | P | Passos | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-REL-01 | 🟢 | P1 | Abrir `/relatorios` | Gera relatório textual citando **Ariquemes** e indicadores da semana |
| CT-REL-02 | 🟢 | P2 | Conferir conteúdo | Menciona trechos críticos e recomendações; pronto para ata/ofício |
| CT-REL-03 | 🟢 | P3 | Clicar "Copiar" / "Imprimir" | Copia para a área de transferência / abre diálogo de impressão |
| CT-REL-04 | 🟡 | P3 | Sem `ANTHROPIC_API_KEY` | Relatório é gerado pelo **fallback por regras** (`generated_by = regras`) |

## ST-JANELA — Melhor janela e trajeto (`/trajeto`)

| ID | Tipo | P | Passos | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-JAN-01 | 🟢 | P2 | Abrir painel de um trecho e ver a "melhor janela" | Mostra barras por dia (7) coloridas por trafegabilidade + recomendação do melhor dia |
| CT-JAN-02 | 🟡 | P2 | Trecho com previsão alta todos os dias | "Sem janela segura nos próximos 7 dias" |
| CT-JAN-03 | 🟢 | P1 | Em `/trajeto`, selecionar 3 trechos (1 crítico) | Passabilidade do trajeto **limitada pelo pior trecho** (crítico domina) |
| CT-JAN-04 | 🟢 | P2 | Conferir a janela do trajeto | Reflete o **pior dia** entre os trechos do caminho |
| CT-JAN-05 | 🔴 | P3 | Trajeto sem trechos selecionados | Mensagem de "selecione trechos"; sem crash |

## ST-OS — Ordens de serviço (`/ordens`)

| ID | Tipo | P | Passos | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-OS-01 | 🟢 | P1 | Criar OS para um trecho com denúncias abertas | OS criada (status **agendada**); **denúncias abertas do trecho são anexadas** automaticamente |
| CT-OS-02 | 🟢 | P1 | Concluir a OS | Denúncias vinculadas viram **resolvidas**; trecho **recalcula e o risco cai** |
| CT-OS-03 | 🟡 | P2 | Após concluir, conferir o score | Denúncias resolvidas **não pesam** mais no cálculo |
| CT-OS-04 | 🟢 | P2 | Mover OS pelos status (agendada→execução→concluída) | Quadro atualiza as colunas corretamente |
| CT-OS-05 | 🔴 | P3 | Criar OS sem título | Bloqueia/retorna erro tratado |

## ST-ALERTA — Alertas, seguir trecho e notificações (`/notificacoes`)

| ID | Tipo | P | Passos | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-ALE-00 | 🔴 | P1 | **Deslogado**, abrir painel de um trecho e tentar seguir | Botão leva ao login ("Entrar para receber alertas"); `POST /api/follows` sem sessão → **401** |
| CT-ALE-01 | 🟢 | P2 | **Logado**, no painel de um trecho, clicar "Seguir" | Inscrição criada (vinculada à conta); sino de notificações no header reflete |
| CT-ALE-02 | 🟢 | P1 | Provocar piora do trecho seguido (denúncia crítica) até virar alto/crítico | **Alerta gerado** (notificação in-app); e-mail/WhatsApp **simulados** |
| CT-ALE-03 | 🟡 | P2 | Piora que **não** muda a faixa (ex.: baixo→baixo) | **Não** gera alerta (só dispara quando piora E vira alto/crítico) |
| CT-ALE-04 | 🟢 | P2 | Abrir `/notificacoes` logado | Lista **só as notificações do usuário**, mais recentes primeiro (deslogado → redireciona ao login) |
| CT-ALE-05 | 🟢 | P3 | Deixar de seguir o trecho | Inscrição removida; não recebe novos alertas |
| CT-ALE-06 | 🟡 | P1 | Usuário B segue um trecho; usuário A **não** segue | O alerta de piora vai **só para B**; A não vê notificação de B (sino e `/api/notifications` escopados) |

## ST-CLIMA — Integração Open-Meteo e worker/cron

| ID | Tipo | P | Passos | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-CLI-01 | 🟢 | P1 | `POST /api/worker/reprocess-daily?weather=1` com Bearer correto | Retorna `success`; mensagem "N com previsão real do Open-Meteo"; trechos recebem chuva real (datas DD/MM) |
| CT-CLI-02 | 🔴 | P1 | Mesmo POST **sem** Authorization | **HTTP 401** (cron protegido) |
| CT-CLI-03 | 🟡 | P2 | `?weather=0` ou `ENABLE_WEATHER=false` | Recalcula **sem** buscar clima (mantém valores atuais) |
| CT-CLI-04 | 🟡 | P2 | Open-Meteo indisponível (timeout) | Degrada com segurança: trecho **mantém** os dados atuais; worker não falha |
| CT-CLI-05 | 🟢 | P3 | Conferir log em `processing_logs` | Registro da execução criado |

## ST-DEMO — Modo demonstração (blindagem) `DEMO_MODE=true`

| ID | Tipo | P | Passos | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-DEMO-01 | 🟢 | P1 | `GET /api/segments/[id]` do Ponte do Branco | Painel devolve o **valor armazenado** (crítico/86), não o recalculado |
| CT-DEMO-02 | 🟢 | P1 | Disparar `recalculateAll` (cron) | **Não sobrescreve** os trechos curados (no-op de escrita) |
| CT-DEMO-03 | 🟢 | P2 | Criar denúncia num trecho | **Continua** recalculando aquele trecho (bump ao vivo funciona) |
| CT-DEMO-04 | 🟢 | P2 | `?weather=1` no worker | **Continua** atualizando a chuva real (ação explícita) |
| CT-DEMO-05 | 🟡 | P2 | Comparar com `DEMO_MODE=false` no mesmo trecho | Sem demo: recalcula e pode cair (ex.: baixo); com demo: congelado |

## ST-API — Contratos e robustez da API REST

| ID | Tipo | P | Requisição | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-API-01 | 🟢 | P1 | `GET /api/health` | 200; JSON com `status:ok` e `mode` (`mock`/`supabase`) |
| CT-API-02 | 🟢 | P1 | `GET /api/segments` | 200; **8** trechos com `coordinates`/`geometry` |
| CT-API-03 | 🟢 | P1 | `GET /api/segments/<id válido>` | 200; inclui `factors`, `recommendations`, `explanation` |
| CT-API-04 | 🔴 | P1 | `GET /api/segments/<id inexistente>` | **404** com `{error}` |
| CT-API-05 | 🟢 | P1 | `POST /api/reports` (corpo válido) | 201/200; retorna a denúncia com `category`/`severity`/`id` |
| CT-API-06 | 🔴 | P2 | `POST /api/reports` (JSON malformado) | Erro tratado (4xx); **sem 500 não tratado** |
| CT-API-07 | 🟢 | P2 | `PATCH/PUT /api/reports/[id]/status` (resolvida) | Status muda; trecho recalcula |
| CT-API-08 | 🟢 | P2 | `GET /api/dashboard/summary` | Totais coerentes com os dados |
| CT-API-09 | 🟢 | P2 | `GET /api/dashboard/export-csv` | 200; `Content-Type` CSV; corpo com cabeçalho |
| CT-API-10 | 🟢 | P3 | `GET /api/dashboard/reports-by-category` | Contagem por categoria correta |
| CT-API-11 | 🟢 | P2 | `GET/POST /api/follows` e `/api/notifications` | **Logado**: cria/lista escopado ao usuário. **Sem sessão**: `POST /api/follows` → **401**; `GET` retorna `[]` |
| CT-API-12 | 🟢 | P2 | `GET/POST /api/work-orders` | Cria/lista; conclusão resolve denúncias |
| CT-API-13 | 🔴 | P3 | Método não suportado numa rota | 405/erro tratado |

## ST-MODO — Modos de dados (mock × Supabase)

| ID | Tipo | P | Passos | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-MODO-01 | 🟢 | P1 | `.env.local` com Supabase válido → `/api/health` | `mode: supabase` |
| CT-MODO-02 | 🟢 | P2 | `ENABLE_MOCK_DATA=true` → `/api/health` | `mode: mock`; app funciona sem nenhuma chave |
| CT-MODO-03 | 🔴 | P2 | `ENABLE_MOCK_DATA=false` mas **sem** service_role | Cai automaticamente em **mock** (não quebra) |
| CT-MODO-04 | 🟢 | P2 | Criar denúncia em modo Supabase e conferir no banco | Registro **persiste** na tabela `reports`; trecho atualizado |

## ST-NFR — Não-funcionais

| ID | Tipo | P | Aspecto | Resultado esperado |
| --- | --- | --- | --- | --- |
| CT-NFR-01 | 🟢 | P2 | **Responsivo** | Todas as páginas usáveis em mobile (390 px) |
| CT-NFR-02 | 🟢 | P2 | **Desempenho** | Páginas principais carregam < 3 s; mapa interativo sem travar |
| CT-NFR-03 | 🟢 | P1 | **Segurança** | Worker exige `CRON_SECRET` (401 sem); `service_role` nunca exposta no cliente; RLS ativo no banco |
| CT-NFR-04 | 🟢 | P3 | **Acessibilidade** | Contraste adequado; navegação por teclado nos formulários; textos alternativos |
| CT-NFR-05 | 🟢 | P3 | **Compatibilidade** | Chrome e Edge sem erros de console |
| CT-NFR-06 | 🟡 | P3 | **Resiliência** | Sem internet de APIs externas (Open-Meteo/tiles), o app continua operável |

---

## 7. Testes automatizados (referência)

Antes/depois da bateria manual, rodar:

```bash
npm test          # 24 casos (F1 score · F2 IA · F3 repositório · F4 Open-Meteo · F5 modo demo · F6 mapa de calor)
npm run verify    # 13 checagens de paridade do núcleo
npx tsc --noEmit  # verificação estática de tipos
```

O CI (GitHub Actions, `.github/workflows/tests.yml`) roda `npm test` a cada push/PR.
**Critério:** todos verdes. Lembrar (reflexão BSTQB): testes verdes **não provam**
ausência total de defeitos — por isso o foco em valores-limite e na validação com usuário.

## 8. Matriz de rastreabilidade (funcionalidade → suíte)

| Funcionalidade | Suíte(s) | Automatizado |
| --- | --- | --- |
| Mapa de risco | ST-MAPA | parcial (F1) |
| Contas / login / escopo por usuário | ST-CONTA | — (validação manual) |
| Denúncia + IA | ST-DENUNCIA | F2 |
| Origem da denúncia (filtro/selo) | ST-DASH | — |
| Motor de score | ST-SCORE | F1 |
| Recalcular ao denunciar | ST-DENUNCIA, ST-API | F3 |
| Open-Meteo | ST-CLIMA | F4 |
| Modo demo | ST-DEMO | F5 |
| Dashboard / mapa de calor | ST-DASH | F6 |
| Dashboard / CSV | ST-DASH | — |
| Relatório semanal | ST-REL | F3 (parcial) |
| Janela / trajeto | ST-JANELA | — |
| Ordens de serviço | ST-OS | — |
| Alertas / seguir | ST-ALERTA | — |
| API / modos | ST-API, ST-MODO | F3 |
| Não-funcionais | ST-NFR | — |

## 9. Critérios de saída (aceitação)

- **100% dos casos P1** executados e **✅ Passou**.
- **≥ 90% dos P2** ✅; nenhum defeito P1/P2 aberto sem contorno.
- `npm test`, `npm run verify` e `tsc` **verdes**.
- Pelo menos **1 validação com usuário real** registrada (Seção "Validação com usuários" do README).
- Evidências (prints/saídas) anexadas para os casos P1.

## 10. Smoke test rápido (regressão de 5 min)

Executar após cada deploy:

1. `GET /api/health` → `mode` correto.
2. `/mapa` abre com 8 trechos coloridos (2/2/2/2).
3. Clicar no Ponte do Branco → painel crítico com explicação.
4. **Cadastro** de um e-mail de teste → cai direto em `/conta` (login imediato).
5. Criar 1 denúncia **logado** → aparece no Dashboard com selo **"Com conta"** e em `/conta`.
6. `/dashboard` abre, filtra por origem e exporta CSV.
7. `/conta` deslogado → redireciona para `/login`; `POST /api/worker/reprocess-daily` sem auth → **401**.
8. **Limpar** a conta + denúncia de teste (Apêndice B) ou restaurar seed.

### Última execução — 16/06/2026 (produção, https://linha-map.vercel.app)

| # | Passo | Status | Evidência |
| --- | --- | --- | --- |
| 1 | `/api/health` → mode | ✅ | `status: ok`, `mode: supabase` |
| 2 | `/mapa` 8 trechos (2/2/2/2) | ✅ | `{crítico:2, alto:2, médio:2, baixo:2}` |
| 3 | Ponte do Branco → crítico | ✅ | crítico, score 86, explicação + 4 fatores |
| 4 | Cadastro → `/conta` (login imediato) | ✅ | redireciona para `/conta` sem confirmar e-mail |
| 5 | Denúncia logada → Dashboard "Com conta" + frescor | ✅ | aparece na hora, com `user_id` |
| 6 | Dashboard filtra + CSV filtrado | ✅ | CSV total=7, `?status=resolvida`=1 |
| 7 | `/conta` deslogado → `/login` (307); worker sem auth → 401 | ✅ | ambos |
| 8 | Limpeza dos dados de teste | ✅ | conta + denúncia removidas via SQL |

> Observações: o congelamento do `DEMO_MODE` foi corrigido (o cron não erode mais o
> mapa) e **manteve o 2/2/2/2 mesmo após criar denúncia**. Dados server-side sempre
> frescos (`no-store`). Filtros do Dashboard 100% reativos e CSV respeitando filtros.

## 11. Registro de execução (preencher)

| ID do caso | Ambiente | Data | Testador | Status | Evidência (link/print) | Observações |
| --- | --- | --- | --- | --- | --- | --- |
| CT-MAPA-01 | prod | | | ⬜ | | |
| CT-CONTA-01 | prod | | | ⬜ | | |
| CT-CONTA-10 | prod | | | ⬜ | | |
| CT-DEN-02 | prod | | | ⬜ | | |
| CT-DASH-08 | prod | | | ⬜ | | |
| CT-SCORE-02 | local | | | ⬜ | | |
| CT-OS-02 | local | | | ⬜ | | |
| CT-CLI-02 | prod | | | ⬜ | | |
| CT-DEMO-01 | prod | | | ⬜ | | |
| … | | | | ⬜ | | |

> Duplicar linhas conforme necessário. Recomenda-se priorizar todos os **P1** primeiro.

---

## Apêndice A — Trechos de referência (seed)

| Nome | Linha | ID (final) | Nível seed |
| --- | --- | --- | --- |
| Trecho Ponte do Branco | Linha C-65 | `…0001` | crítico |
| Trecho Atravessa Igarapé | Linha 60 | `…0007` | crítico |
| Trecho Igarapé Verde | Linha C-70 | `…0002` | alto |
| Trecho Travessão 40 | Linha Gaúcha | `…0005` | alto |
| Trecho Sítio Boa Vista | Linha C-60 | `…0003` | médio |
| Trecho Cafezal Alto | Linha 57,5 | `…0006` | médio |
| Trecho Laticínio | Linha C-75 | `…0004` | baixo |
| Trecho Curva da Serra | Linha C-65 | `…0008` | baixo |

> ID completo = `11111111-1111-1111-1111-0000000000XX`.

## Apêndice B — Comandos úteis

**PowerShell (Windows):**
```powershell
$BASE = "https://linha-map.vercel.app"   # ou http://localhost:3000
Invoke-RestMethod "$BASE/api/health"
Invoke-RestMethod "$BASE/api/segments" | Select-Object -First 1
# Criar denúncia de teste:
Invoke-RestMethod -Method Post "$BASE/api/reports" -ContentType "application/json" -Body '{"road_segment_id":"11111111-1111-1111-1111-000000000008","description":"Ponte cedendo, grave","reporter_name":"Tester"}'
# Worker com clima real (pitch):
Invoke-RestMethod -Method Post "$BASE/api/worker/reprocess-daily?weather=1" -Headers @{ Authorization = "Bearer SEU_CRON_SECRET" }
```

**Restaurar o seed após testes** (deixa o banco limpo para a demo):
Supabase → **SQL Editor** → colar o conteúdo de `database/seed.sql` → **Run**.
(Lembrete: o seed usa `now() - interval`, então re-rodar deixa as denúncias "frescas".)

**Limpar apenas denúncias de teste:**
```sql
delete from reports where reporter_name in ('Tester','Teste Producao','Teste Validacao');
```

**Limpar contas e denúncias de teste de conta** (ajuste o padrão do e-mail usado):
```sql
delete from reports   where description like 'Teste %' or description like 'Ciclo%';
delete from auth.users where email like 'teste.%@gmail.com' or email like 'ciclo%@gmail.com';
-- (apagar o usuário com denúncia anexada deixa user_id nulo — a denúncia vira anônima;
--  apague as denúncias de teste antes, como acima, se quiser remover tudo.)
```

**Verificar config do Supabase Auth (sem criar conta):**
```powershell
Invoke-RestMethod "$($env:SUPABASE_URL)/auth/v1/settings" -Headers @{ apikey = "SUA_ANON_KEY" }
# Esperado: external.email = true · disable_signup = false · mailer_autoconfirm = true
```

---

_Documento da disciplina Teste de Software — LinhaMap / Equipe 3 Hacketeers — IFRO Ariquemes 2026/1._
