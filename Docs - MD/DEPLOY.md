# Guia de Deploy — LinhaMap (Etapa 17)

Passo a passo para publicar o MVP online (entregável obrigatório do edital) com
**GitHub + Supabase + Vercel**. Tempo estimado: ~30 min.

> O app **já funciona sem Supabase** (modo mock). Você pode até fazer o deploy só com
> `ENABLE_MOCK_DATA=true` e ter um MVP online no ar em minutos. Os passos do Supabase são
> para ter **persistência real** das denúncias entre acessos.

---

## 0. Pré-requisitos

- [ ] Conta no **GitHub** (https://github.com)
- [ ] Conta no **Supabase** (https://supabase.com) — opcional, mas recomendado
- [ ] Conta na **Vercel** (https://vercel.com) — pode logar com o GitHub
- [ ] (Opcional) `ANTHROPIC_API_KEY` para ligar a IA multimodal

---

## 1. Subir o código para o GitHub

O **link do repositório é o único entregável oficial** do edital.

### Opção A — com GitHub CLI (`gh`)
```bash
gh repo create linhamap --public --source=. --remote=origin --push
```

### Opção B — manual
1. Crie um repositório **vazio** no GitHub (sem README), ex.: `linhamap`.
2. No terminal, na raiz do projeto:
```bash
git remote add origin https://github.com/SEU_USUARIO/linhamap.git
git push -u origin main
```

- [ ] Repositório no ar com todos os commits.

---

## 2. Criar o projeto Supabase (persistência real)

1. Em https://supabase.com → **New project**. Defina nome (`linhamap`), senha do banco e
   região (recomendado: **South America (São Paulo)**).
2. Aguarde provisionar (~2 min).
3. Vá em **SQL Editor** → **New query** e execute, **nesta ordem**:
   - Cole e rode todo o conteúdo de [`database/schema.sql`](../database/schema.sql).
   - Cole e rode todo o conteúdo de [`database/seed.sql`](../database/seed.sql).
4. Confira em **Table Editor**: devem existir `road_segments` (8 linhas), `reports` (6),
   `weather_snapshots` e `processing_logs`.

### Pegar as chaves (Settings → API)
| Campo no Supabase | Variável de ambiente |
| --- | --- |
| Project URL | `SUPABASE_URL` **e** `NEXT_PUBLIC_SUPABASE_URL` |
| `service_role` key (secreta) | `SUPABASE_SERVICE_ROLE_KEY` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

> **Segurança:** a `service_role` key é secreta e só é usada **no servidor** (Route Handlers).
> O app não expõe dados sensíveis ao browser. Como todo acesso ao banco passa pelo servidor com
> a service role, **não é obrigatório configurar RLS** para o MVP (mas é recomendável depois).

- [ ] Tabelas criadas e chaves anotadas.

---

## 3. Importar na Vercel e configurar variáveis

1. Em https://vercel.com → **Add New… → Project** → importe o repositório `linhamap`.
2. A Vercel detecta Next.js automaticamente (não mude build/output).
3. Em **Environment Variables**, adicione:

| Variável | Valor |
| --- | --- |
| `ENABLE_MOCK_DATA` | `false` _(ou `true` para deploy só com mock)_ |
| `SUPABASE_URL` | _Project URL_ |
| `SUPABASE_SERVICE_ROLE_KEY` | _service_role key_ |
| `NEXT_PUBLIC_SUPABASE_URL` | _Project URL_ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _anon public key_ |
| `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com/v1/forecast` |
| `CRON_SECRET` | _uma string aleatória forte_ (ex.: gere com `openssl rand -hex 16`) |
| `ANTHROPIC_API_KEY` | _(opcional)_ sua chave |
| `ENABLE_AI_CLASSIFICATION` | `true` se usar IA; senão `false` |

4. Clique em **Deploy**. Ao final, anote a URL pública (ex.: `https://linhamap.vercel.app`).

- [ ] Deploy concluído e URL pública anotada.

---

## 4. Sincronizar os scores e validar o cron

1. **Recalcular os scores** com o motor (uma vez, após o seed):
   ```bash
   curl -X POST https://SEU-APP.vercel.app/api/segments/recalculate
   ```
   Deve retornar `{"updated": 8, ...}`.
2. O **Vercel Cron** (em `vercel.json`) já está agendado para 08:00 UTC diariamente e usará o
   `CRON_SECRET` automaticamente. Para testar manualmente o worker:
   ```bash
   curl -X POST https://SEU-APP.vercel.app/api/worker/reprocess-daily \
     -H "Authorization: Bearer SEU_CRON_SECRET"
   ```
3. (Opcional) **GitHub Actions** como redundância: em **Settings → Secrets and variables →
   Actions**, crie os secrets `APP_URL` (a URL da Vercel) e `CRON_SECRET` (o mesmo valor).
   O workflow `daily-reprocess.yml` passa a rodar sozinho e pode ser acionado em **Actions →
   Run workflow**.

- [ ] `recalculate` retornou 8; worker responde `success`.

---

## 5. Verificação pós-deploy (smoke test do MVP online)

Acesse a URL pública e confirme:

- [ ] `/` (landing) abre sem erros e mostra estatísticas.
- [ ] `/mapa` mostra os trechos coloridos; clicar abre o painel de detalhe.
- [ ] `/denuncia` envia uma denúncia e mostra a classificação.
- [ ] A denúncia aparece em `/dashboard` (tabela e mapa de calor).
- [ ] `/api/dashboard/export-csv` baixa o CSV.
- [ ] `/relatorios` gera o relatório semanal.
- [ ] `/api/health` retorna `"mode":"supabase"` (se configurou o Supabase).

> Se `mode` vier `"mock"` mesmo com Supabase configurado, revise `ENABLE_MOCK_DATA=false` e se as
> chaves do Supabase estão preenchidas — e refaça o deploy.

---

## 6. Preencher os campos da equipe

Antes da submissão, edite e commite:

- [x] `README.md` → **Equipe**, **Integrantes**, **Link do MVP online**, **Vídeo de pitch**, **Validação**.
- [x] `docs/DECLARACAO_IA.md` → confirmar a lista de ferramentas e os ajustes manuais.
- [x] `LICENSE` → nome da equipe (se desejar).

```bash
git add README.md docs/DECLARACAO_IA.md LICENSE
git commit -m "docs: dados da equipe e links de entrega"
git push
```

---

## 7. Checklist final do edital (Anexo I)

- [x] README com identificação (equipe, integrantes, curso, turma, categoria)
- [x] Descrição do problema e do público
- [x] Descrição da solução
- [x] **Link do MVP funcional online**
- [x] **Link do vídeo de pitch**
- [x] Instruções de uso/teste/acesso
- [x] Tecnologias e bibliotecas utilizadas
- [x] Declaração das ferramentas de IA
- [x] Evidências de validação (quando houver)
- [x] Observação sobre licença
- [ ] **Submeter o link do repositório até 19/06/2026, 23h59**

---

### Resumo do mapeamento de variáveis (cola rápida)

```env
ENABLE_MOCK_DATA=false
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # secreta (server)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...    # publica
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1/forecast
CRON_SECRET=troque-por-uma-string-aleatoria
ANTHROPIC_API_KEY=                       # opcional
ENABLE_AI_CLASSIFICATION=false           # true se usar IA
```
