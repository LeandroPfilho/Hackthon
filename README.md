# LinhaMap

> **Plataforma Preditiva de Trafegabilidade Rural para Ariquemes/RO**
> Inteligência de dados para prevenção de bloqueios em estradas vicinais.

[![Testes e validação](https://github.com/ArmandoGT/LinhaMap/actions/workflows/tests.yml/badge.svg)](https://github.com/ArmandoGT/LinhaMap/actions/workflows/tests.yml)
[![Status](https://img.shields.io/badge/status-MVP%20funcional-success)]()
[![Stack](https://img.shields.io/badge/stack-Next.js%20%2B%20TypeScript-black)]()
[![Hackathon](https://img.shields.io/badge/Hackathon-IFRO%20Ariquemes%202026%2F1-green)]()

---

## Identificação

- **Curso/Turma:** Tecnologia em Análise e Desenvolvimento de Sistemas (ADS) — IFRO Campus Ariquemes
- **Categoria:** Desafio Empresa e Comunidade
- **Desafio:** Plataforma Preditiva de Trafegabilidade (Proponente: QUANYX Tecnologia)
- **Equipe:** 3 Hacketeers
- **Integrantes:** Armando Giordani Trassi, Leandro Pires de Moraes Filho e Pedro Felipe Vieira Gouveia

## Links de entrega

- **MVP online:** **https://linha-map.vercel.app**
- **Vídeo de pitch:** https://youtu.be/5pwjlIJWfvU
- **Apresentação/slides Pitch 26/06/26:** https://canva.link/linha-map

---

## 🛑 Problema

No período chuvoso, as linhas rurais de Ariquemes/RO ficam intransitáveis e comprometem o
transporte de leite, peixe, gado, café, hortaliças e insumos. Hoje a manutenção é **reativa** —
só acontece depois que caminhões atolam ou produtores já tiveram prejuízo. Faltam ferramentas
que cruzem dados de chuva, características das vias e relatos para **antecipar** trechos críticos.

**Público afetado:** produtores rurais (piscicultores, pecuaristas, produtores de leite e café),
transportadoras, cooperativas e a Secretaria Municipal de Obras.

## 💡 Solução

O LinhaMap cruza **previsão de chuva (7 dias)**, **chuva acumulada (72h)**, **declividade** e
**relatos da comunidade** para gerar um **Índice de Trafegabilidade (0–100)** por trecho,
classificando-o em 4 níveis — **Baixo, Médio, Alto, Crítico** — com até 7 dias de antecedência.
O cálculo é **explicável** (fórmula ponderada, não caixa-preta), gerando justificativa textual e
recomendações de ação. Assim, a manutenção deixa de ser reativa e passa a ser **preventiva**.

---

## Como testar o MVP (online, sem instalar nada)

> Para a banca avaliar **direto no navegador** (computador ou celular) — **não precisa login**.

1. Acesse **https://linha-map.vercel.app**.
2. Abra o **Mapa** (`/mapa`) → clique no trecho **Ponte do Branco (C-65)** → veja o índice de
   risco, os fatores e a **explicação** do porquê.
3. Faça uma **denúncia** (`/denuncia`): descreva um problema, toque em **"Usar minha
   localização"** e envie → a **IA classifica** automaticamente e mostra o resultado.
4. (Opcional) Veja o painel da **Secretaria** (`/dashboard`): mapa de calor, trechos
   prioritários, filtros e exportação CSV; e o **relatório semanal** (`/relatorios`).
5. **Denúncia por WhatsApp** (diferencial): _o agente fica ligado durante a apresentação_ —
   enviando `linhamap-hackathon <problema> na C-65`, a denúncia cai no mapa.

_Contas de teste e papéis (produtor × Secretaria) em [`PAPEIS_E_CONTAS.md`](./Docs%20-%20MD/PAPEIS_E_CONTAS.md)._

---

## Funcionalidades

- Landing page de apresentação com estatísticas ao vivo
- Mapa de risco interativo (Leaflet) com trechos coloridos e painel de detalhe
- Índice de Trafegabilidade 0–100 explicável, com fatores e recomendações
- Cadastro de denúncia colaborativa (geolocalização + foto)
- Classificação automática da denúncia por IA (com fallback por regras)
- **Denúncia por WhatsApp**: agente conversacional (**n8n self-hosted + WAHA**) registra a denúncia direto do Zap, com palavra-chave de ativação
- Dashboard da Secretaria (cards, mapa de calor, filtros, exportar CSV)
- Relatório semanal pronto para ata/ofício
- Reprocessamento diário automático (Vercel Cron / GitHub Actions)
- **Alertas + "seguir trecho"**: avisa quando um trecho acompanhado piora (central de notificações; e-mail/WhatsApp simulados)
- **Melhor janela para escoar**: melhor dia dos próximos 7 para transportar a produção
- **Ordens de serviço**: trecho crítico/denúncia → manutenção; concluir resolve denúncias e baixa o risco
- **Consulta de trajeto A→B**: risco agregado do caminho (limitado pelo pior trecho) + melhor janela
- API REST completa (Route Handlers)

## Telas

| Tela | Descrição |
| --- | --- |
| **Início** (`/`) | Apresenta o projeto, o problema, o público e como funciona; CTAs para mapa e denúncia. |
| **Mapa** (`/mapa`) | Linhas vicinais coloridas por risco; clique no trecho abre o painel com índice, chuva, declividade, relatos, explicação e recomendações. |
| **Denúncia** (`/denuncia`) | Formulário com GPS automático, upload de foto e classificação automática por IA. |
| **Dashboard** (`/dashboard`) | Cards de resumo, trechos prioritários, mapa de calor, tabela filtrável e exportação CSV. |
| **Relatórios** (`/relatorios`) | Relatório semanal textual + indicadores, com copiar/imprimir. |
| **Trajeto** (`/trajeto`) | Seleciona os trechos do caminho e mostra a passabilidade do trajeto + melhor janela. |
| **Ordens** (`/ordens`) | Quadro de ordens de serviço (agendada → em execução → concluída) da Secretaria. |
| **Alertas** (`/notificacoes`) | Central de notificações dos trechos acompanhados. |
| **Sobre** (`/sobre`) | Como funcionam o score e a IA, fontes de dados e stack. |

---

## Stack técnica

| Camada | Tecnologias |
| --- | --- |
| Fullstack | **Next.js 14 (App Router) + TypeScript** — UI e API (Route Handlers) no mesmo projeto |
| UI | TailwindCSS, shadcn/ui, Leaflet (react-leaflet) + leaflet.heat |
| Banco de dados | Supabase (PostgreSQL + PostGIS) — opcional; roda em modo mock sem ele |
| IA | Anthropic Claude (multimodal) com fallback por regras |
| Automação | Vercel Cron / GitHub Actions (cron diário) |
| Denúncia por WhatsApp | **n8n (self-hosted)** + **WAHA** — agente que registra via `POST /api/reports` |
| Deploy | Vercel (deploy único) |
| Dados públicos | **Open-Meteo (chuva real, integrado)**, OpenStreetMap (geometria das linhas); SRTM/INMET preparados para integração |

### Arquitetura

Aplicação **100% Next.js**: o backend roda como **Route Handlers** (`app/api/...`), sem servidor
separado. A lógica de domínio fica em `lib/` e é agnóstica à fonte de dados (mock ou Supabase).

```
app/
  (páginas)         → /, /mapa, /denuncia, /dashboard, /relatorios, /sobre
  api/              → Route Handlers (REST): segments, reports, ai, dashboard, worker
lib/
  types.ts          → tipos/enums de domínio
  mock-data.ts      → dados mockados de Ariquemes
  services/         → scoring · ai-classifier · reporting · dashboard · weather · worker
  repository/       → modo dual mock/supabase + factory
  supabase/         → cliente supabase-js
components/          → ui (shadcn), map, dashboard, report
database/           → schema.sql + seed.sql
.github/workflows/  → daily-reprocess.yml (cron)
```

---

## Como rodar

### Pré-requisitos
- Node.js 18+
- (Opcional) Conta Supabase — o app roda em **modo mock** sem ela.

### Desenvolvimento
```bash
npm install
cp .env.example .env.local   # ENABLE_MOCK_DATA=true já roda sem Supabase
npm run dev                  # http://localhost:3000
```

### Build de produção
```bash
npm run build && npm run start
```

### Testes automatizados
```bash
npm test         # suíte por funcionalidade: caminho feliz + erro/valor-limite
npm run verify   # checagem de paridade do núcleo (score/classificação/repositório)
```

---

## Variáveis de ambiente

Veja [`.env.example`](./.env.example). O sistema **funciona sem nenhuma chave** (modo mock).

| Variável | Função |
| --- | --- |
| `ENABLE_MOCK_DATA` | `true` (padrão) usa dados em memória; `false` usa Supabase |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Conexão server-side com o Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente (browser) |
| `OPEN_METEO_BASE_URL` | Endpoint do Open-Meteo |
| `ENABLE_WEATHER` | `true` (padrão) busca chuva real no reprocessamento; `false` para demo offline |
| `ANTHROPIC_API_KEY` / `ENABLE_AI_CLASSIFICATION` | Liga a classificação por IA (senão, fallback) |
| `CRON_SECRET` | Protege o endpoint do worker no cron |
| `DEMO_MODE` | `true` congela os níveis curados (painel mostra valor armazenado; cron não sobrescreve) — útil para a apresentação |

## Como configurar o Supabase (opcional)

1. Crie um projeto no [Supabase](https://supabase.com).
2. No **SQL Editor**, execute na ordem: `database/schema.sql` e depois `database/seed.sql`.
3. Em `.env.local`, defina `ENABLE_MOCK_DATA=false` e preencha as chaves do Supabase.

---

## Como funciona o score de risco

Fórmula ponderada e transparente (`lib/services/scoring.ts`). Cada fator vira um sub-score 0–100,
combinado por pesos fixos:

| Fator | Peso |
| --- | --- |
| Chuva acumulada (72h) | 30% |
| Previsão de chuva (7 dias) | 25% |
| Declividade | 15% |
| Relatos da comunidade (gravidade × recência) | 30% |

Faixas: **0–24 baixo · 25–49 médio · 50–74 alto · 75–100 crítico**. Denúncias críticas e recentes
pesam mais. O sistema gera uma **explicação textual** (ex.: _"Risco crítico devido a chuva acumulada
de 92 mm nas últimas 72h, previsão de chuva intensa e 2 relatos recentes de lama e buraco."_).

## Como funciona a classificação por IA

Em `lib/services/ai-classifier.ts`. Ao enviar uma denúncia, a categoria e a severidade são
preenchidas automaticamente: com `ANTHROPIC_API_KEY`, o **Claude (multimodal)** analisa foto +
descrição; sem chave, um **fallback por palavras-chave** garante o funcionamento. A resposta segue
o formato `{ categoria, severidade, confianca, justificativa }`. O relatório semanal também pode ser
redigido por IA, com fallback por lógica simples.

## Como funciona o cron diário

`POST/GET /api/worker/reprocess-daily` **atualiza a chuva real de cada trecho via Open-Meteo**
(acumulado 72h + previsão 7d), recalcula o score de todos os trechos e registra um log.
É agendado por **Vercel Cron** (`vercel.json`) e/ou **GitHub Actions**
([`.github/workflows/daily-reprocess.yml`](./.github/workflows/daily-reprocess.yml)), protegido por
`CRON_SECRET`.

## Denúncia por WhatsApp (agente)

Além do formulário web, o produtor pode denunciar **direto pelo WhatsApp** — o canal de menor
fricção para quem está no campo. Um **agente conversacional** recebe a mensagem, identifica a
linha vicinal, registra a denúncia no LinhaMap (`POST /api/reports`) e responde confirmando; a
categoria e a severidade são preenchidas pela **mesma IA do backend**.

- **Orquestração:** **n8n (self-hosted)** — sem limite de execuções.
- **Ponte com o WhatsApp:** **WAHA** (conecta por QR, repassa as mensagens ao n8n).
- **Ativação por palavra-chave** (`linhamap-hackathon`) para o bot **não** reagir a conversas
  normais; **saudações** recebem um tutorial e **mensagens de grupo são ignoradas**. Palavra-chave usada para modelo MVP, em produção não será usada.
- **Score curado preservado:** em `DEMO_MODE`, denúncias (web ou WhatsApp) **não** sobrescrevem
  o risco curado dos trechos — vários testes não desconfiguram o mapa.

Fluxo: `WhatsApp → WAHA → n8n → POST /api/reports → resposta via WAHA`.
Lista completa de mensagens aceitas e detalhes técnicos em
[`AGENTE_WHATSAPP.md`](./Docs%20-%20MD/AGENTE_WHATSAPP.md).

## Deploy (Vercel)

Guia completo passo a passo em **[`DEPLOY.md`](./Docs%20-%20MD/DEPLOY.md)** (GitHub + Supabase + Vercel).
Resumo:

1. Importe o repositório na Vercel.
2. Defina as variáveis de ambiente (mínimo: `ENABLE_MOCK_DATA`; para produção, as do Supabase + `CRON_SECRET`).
3. Deploy — o `vercel.json` já agenda o reprocessamento diário.

---

## Testes e validação

> Seção da disciplina **Teste de Software** (Hackathon IFRO Ariquemes 2026/1). A pergunta da
> banca não é só _"funciona?"_, mas _"como vocês sabem que funciona?"_. Abaixo está a resposta.

### O que significa "funcionar" (oráculo)

O coração do LinhaMap é uma **regra explicável** que converte chuva, declividade e relatos em um
**Índice de Trafegabilidade (0–100)** e em um **nível de risco**. "Funcionar corretamente" significa:

- o **score é determinístico** e reproduzível pela fórmula ponderada (não é caixa-preta);
- o **nível segue as faixas fixas**: `0–24 baixo · 25–49 médio · 50–74 alto · 75–100 crítico`;
- toda classificação de denúncia retorna um **contrato válido** `{ categoria, severidade }`, mesmo
  sem IA (fallback por regras) — nunca derruba o cadastro;
- registrar uma denúncia **recalcula** o risco do trecho.

O **oráculo** são esses valores esperados, codificados como asserções em `scripts/test-suite.ts`.

### Plano mínimo de teste

Aplicamos **Análise de Valor-Limite** e **Particionamento de Equivalência** (BSTQB 2023, Cap. 6):
cobrimos o caminho feliz **e** as bordas/erros das funções críticas.

| Funcionalidade | O que deve acontecer (oráculo) | Caminho feliz (entrada → saída) | Erro / borda (entrada → saída) | Evidência |
| --- | --- | --- | --- | --- |
| **Índice de Trafegabilidade** | Score 0–100 e nível pela faixa correta | Ponte do Branco (92mm, 140mm, 8,5%, 2 relatos) → **92 / crítico** | Chuva acumulada **83mm → baixo** e **84mm → médio** (demais fatores nulos); entrada vazia → **0 / baixo**; chuva negativa → saneada (clamp) | `npm test` (F1) |
| **Classificação da denúncia** | Sempre devolve `{categoria, severidade}` válidos | _"ponte cedendo, grave"_ → **ponte_danificada / crítica** | Texto sem palavra-chave ou vazio/nulo → **"outro"** (degrada com segurança) | `npm test` (F2) |
| **Recalcular risco ao denunciar** | Denúncia incrementa contagem e recalcula | `createReport` em trecho baixo → **reports_count +1** | Denúncia crítica e recente em trecho baixo → **risco sobe de nível** | `npm test` (F3) |

> **Caso de borda mais importante** (orientação do roteiro para a categoria _Empresa e Comunidade_):
> mantendo os demais fatores nulos, o trecho cruza de **Baixo para Médio entre 83 mm e 84 mm** de
> chuva acumulada (score 24,9 → 25,2). Esse limite é testado automaticamente.

### Como executar e evidência

```bash
npm test         # 24 casos (caminho feliz + erro/valor-limite), com relatório PASS/FAIL
npm run verify   # checagem de paridade do motor de score
npx tsc --noEmit # verificação estática de tipos
```

A suíte roda também em **Integração Contínua** a cada `push`/PR
([`.github/workflows/tests.yml`](./.github/workflows/tests.yml)); o resultado fica na aba **Actions**
e no **selo no topo deste README** — essa é a evidência versionada de que a solução funciona.

### Reflexão (Sprint 4)

Ter testes passando **não prova** que o sistema está 100% correto — prova que os comportamentos
especificados no oráculo se mantêm. Por isso priorizamos os **valores-limite** (onde os defeitos se
escondem) e a **validação com usuário real** abaixo, e não apenas o caminho feliz.

### Validação com usuários

- **Desafio real de empresa:** o problema foi proposto pela **QUANYX Tecnologia**
  (categoria _Empresa e Comunidade_), garantindo aderência a uma necessidade concreta de
  Ariquemes (escoamento da produção nas linhas vicinais C-65/C-70).
- **Feedback de orientação aplicado:** após retorno sobre a **clareza para o produtor rural**,
  criamos a tela **`/resumo`** em linguagem leiga (situação das estradas sem o número técnico
  0–100) e simplificamos a denúncia (telefone com máscara, localização por 1 toque) — exemplo de
  **iteração a partir de validação**.
- **Acessibilidade do público-alvo:** denúncia por **WhatsApp** e **PWA offline** nascem da
  realidade do produtor/caminhoneiro sem sinal — o canal que ele **já usa**, sem instalar app.

#### Evidências de qualidade do sistema

Os testes do LinhaMap foram planejados com base em técnicas de caixa-preta, especialmente a análise de valor-limite e o particionamento de equivalência. A suíte cobre caminhos felizes, entradas inválidas e valores de borda das principais regras do sistema, como as faixas do Índice de Trafegabilidade e o contrato de classificação das denúncias (BSTQB, 2023).

Os testes são executados de forma automatizada, o que melhora a repetibilidade e permite identificar falhas com maior rapidez, embora a equipe ainda precise revisar os resultados e manter os casos atualizados conforme o sistema evolui (COUTINHO; NASCIMENTO, 2025).

A execução no GitHub Actions a cada push ou pull request mantém uma evidência versionada da qualidade do projeto, incluindo a verificação dos tipos TypeScript e a execução da suíte automatizada (GITHUB, 2024). A documentação dos casos, resultados esperados e evidências também contribui para a rastreabilidade entre os requisitos e as validações realizadas (ISO, 2021).

---

## Registros Adicionais de Validação

Abaixo estão os registros que comprovam o contato direto com nosso público-alvo, evidenciando o impacto e a necessidade da ferramenta:

**1. Print de Validação:**
![Print de Validação do LinhaMap](./Docs%20-%20MD/Validação-LinhaMap.png)

**2. Relato - Motorista Boiadeiro (Transporte Vivo):**
- **Perfil:** Motorista que realiza o frete de gado de corte das fazendas nas linhas até o frigorífico.
- **Validação:** Ele relatou que o maior problema não é apenas o caminhão atolar, mas o estresse e a perda de peso dos animais quando o veículo fica horas parado na lama esperando socorro. Ele avaliou que saber o nível de risco com dias de antecedência pelo LinhaMap permite negociar com o pecuarista o adiamento do embarque do gado, evitando perdas financeiras e maus-tratos.

**3. Relato - Motorista de Distribuidora de Bebidas:**
- **Perfil:** Motorista de caminhão que atende pequenos comércios e mercearias na zona rural.
- **Validação:** Mencionou que frequentemente precisam retornar à base com a carga após encontrarem pontes submersas ou ladeiras intransitáveis (gastando combustível e perdendo o dia). Ele destacou que a funcionalidade de "Trajeto A→B" do LinhaMap seria excelente para planejar a rota de entrega logo de manhã, escolhendo caminhos com melhor índice de trafegabilidade.

## 🤝 Uso de Inteligência Artificial

Declaração completa em [`DECLARACAO_IA.md`](./Docs%20-%20MD/DECLARACAO_IA.md) (exigência do edital):
ferramentas usadas, finalidade, partes do projeto apoiadas e o que a equipe revisou/validou.

---

## O que funciona × O que ainda pode melhorar

**Funciona hoje (no MVP online):**
- Mapa de risco com **Índice de Trafegabilidade explicável** (fatores + justificativa textual).
- Denúncia **web**, por **WhatsApp** (agente n8n self-hosted + WAHA) e **offline (PWA)** com auto-sync.
- **Classificação por IA** da denúncia (Claude) com fallback por regras.
- Dashboard da Secretaria (mapa de calor, prioridades, filtros, **CSV**) e **relatório semanal**.
- **Chuva real** do Open-Meteo + reprocessamento diário automático; deploy online (Vercel).
- 24 testes automatizados + CI a cada push (selo no topo).

**O que ainda pode melhorar (roadmap):**
- **Declividade** ainda curada na demo (script de topografia pronto, falta recálculo dos scores).
- Score por **fórmula explicável**, não por modelo treinado com histórico real de incidentes.
- Foto da denúncia em **data URL** (migrar para Supabase Storage).
- Notificação preventiva ativa (WhatsApp/SMS de alerta) e modelo preditivo histórico.

## 🗺️ Roadmap pós-hackathon

- Integração real com Open-Meteo, INMET, OpenStreetMap e SRTM
- Modelo preditivo treinado com histórico real de incidentes
- App mobile / PWA para produtores em campo
- Notificações (WhatsApp/SMS) de alerta preventivo
- Autenticação e perfis (produtor × Secretaria)

## ⚠️ Limitações do MVP

- Chuva (acumulada 72h + previsão 7d) vem **real do Open-Meteo** no reprocessamento; **declividade** ainda é mockada
- Score baseado em fórmula explicável (não em modelo treinado com histórico real)
- Persistência completa requer configuração do Supabase (modo mock não persiste entre instâncias serverless)

## Melhorias futuras

- Upload de fotos para Supabase Storage (hoje em data URL no modo demo)
- Histórico temporal do índice por trecho (séries e tendências)
- Roteirização evitando trechos críticos
- Painel público de transparência para a Secretaria

## Licença

[MIT](./LICENSE).