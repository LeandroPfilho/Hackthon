-- ============================================================================
-- LinhaMap — schema.sql
-- Estrutura inicial do banco (Seção 8 do LinhaMap).
-- Banco: PostgreSQL (Supabase) + PostGIS para dados geográficos.
--
-- Este script é IDEMPOTENTE: pode ser executado novamente do zero.
-- Ordem de execução: 1) schema.sql  ->  2) seed.sql
-- ============================================================================

-- Extensões -----------------------------------------------------------------
create extension if not exists postgis;      -- geometria das vias (LineString)
create extension if not exists pgcrypto;     -- gen_random_uuid()

-- Limpeza (permite re-execução total) ---------------------------------------
drop table if exists notifications     cascade;
drop table if exists follows           cascade;
drop table if exists work_orders       cascade;
drop table if exists weather_snapshots cascade;
drop table if exists reports            cascade;
drop table if exists processing_logs    cascade;
drop table if exists road_segments      cascade;
drop table if exists profiles           cascade;

drop type if exists risk_level        cascade;
drop type if exists report_category   cascade;
drop type if exists report_severity   cascade;
drop type if exists report_status     cascade;
drop type if exists alert_channel     cascade;
drop type if exists work_order_status cascade;
drop type if exists user_role         cascade;

-- Tipos enumerados (domínios de negócio) ------------------------------------
-- Níveis de risco derivados do Índice de Trafegabilidade (0-100).
create type risk_level      as enum ('baixo', 'medio', 'alto', 'critico');

-- Categorias possíveis de uma denúncia (Seção 5/6.5).
create type report_category as enum ('buraco', 'lama', 'erosao', 'ponte_danificada', 'atolamento', 'outro');

-- Severidade da ocorrência.
create type report_severity as enum ('baixa', 'media', 'alta', 'critica');

-- Ciclo de vida da denúncia.
create type report_status   as enum ('aberta', 'em_analise', 'resolvida');

-- Canal de entrega de alertas (e-mail/WhatsApp simulados no MVP).
create type alert_channel   as enum ('in_app', 'email', 'whatsapp');

-- Ciclo de vida de uma ordem de serviço de manutenção.
create type work_order_status as enum ('agendada', 'em_execucao', 'concluida', 'cancelada');

-- Papel da conta: cidadão (denuncia/segue) vs secretaria (back-office).
create type user_role as enum ('cidadao', 'secretaria');

-- ===========================================================================
-- Função utilitária: mantém updated_at sempre atualizado em UPDATE
-- ===========================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ===========================================================================
-- Tabela: profiles  (papel de cada conta — cidadao | secretaria)
-- 1:1 com auth.users. A proteção real do back-office é na camada de aplicação
-- (o app acessa via service-role, que BYPASSA o RLS); o RLS aqui é defesa em
-- profundidade para acesso direto anon/PostgREST.
--
-- NOTA: o trigger `on_auth_user_created` (cria o profile no cadastro) e o
-- backfill dos usuários existentes vivem nas migrations `add_profiles_and_roles`
-- e `signup_role_from_metadata`, pois operam sobre o schema `auth` (não
-- reproduzível por este script). Na DEMO, o trigger lê o papel escolhido no
-- cadastro de `raw_user_meta_data->>'role'` (default `cidadao`).
-- ===========================================================================
create table profiles (
    id          uuid        primary key references auth.users(id) on delete cascade,
    role        user_role   not null default 'cidadao',
    created_at  timestamptz not null default now()
);

comment on table profiles is 'Papel de cada conta. cidadao = denuncia/segue; secretaria = back-office.';

alter table profiles enable row level security;
-- Cada usuário lê apenas o próprio profile (policy não-recursiva).
create policy profiles_select_own on profiles
    for select using (auth.uid() = id);

-- ===========================================================================
-- Tabela: road_segments  (trechos das linhas vicinais monitorados)
-- ===========================================================================
create table road_segments (
    id                  uuid primary key default gen_random_uuid(),
    name                text        not null,                 -- ex.: "Ponte do Branco"
    rural_line          text        not null,                 -- ex.: "Linha C-65"
    geometry            geometry(LineString, 4326),           -- traçado do trecho (WGS84, p/ PostGIS)
    coordinates         jsonb,                                -- mesmo traçado em [[lon,lat], ...] p/ a API/mapa
    latitude            double precision not null,            -- ponto representativo (marcador)
    longitude           double precision not null,
    slope               numeric(5,2)  not null default 0,     -- declividade média (%)
    accumulated_rain_72h numeric(6,2) not null default 0,     -- chuva acumulada 72h (mm)
    forecast_rain_7d    numeric(6,2)  not null default 0,     -- chuva prevista próximos 7 dias (mm, total)
    forecast_daily      jsonb,                                -- detalhamento diário p/ gráfico (opcional)
    reports_count       integer       not null default 0,     -- nº de relatos recentes (denormalizado)
    risk_score          numeric(5,2)  not null default 0
                          check (risk_score >= 0 and risk_score <= 100),
    risk_level          risk_level    not null default 'baixo',
    explanation         text,                                 -- justificativa textual do score
    updated_at          timestamptz   not null default now()
);

comment on table  road_segments is 'Trechos das linhas vicinais com Índice de Trafegabilidade (0-100) e nível de risco.';
comment on column road_segments.forecast_daily is 'Array JSON [{date, mm}] com a previsão diária dos próximos 7 dias.';

create index idx_road_segments_risk_level on road_segments (risk_level);
create index idx_road_segments_rural_line on road_segments (rural_line);
create index idx_road_segments_geometry   on road_segments using gist (geometry);

create trigger trg_road_segments_updated_at
    before update on road_segments
    for each row execute function set_updated_at();

-- ===========================================================================
-- Tabela: reports  (denúncias colaborativas dos produtores/moradores)
-- ===========================================================================
create table reports (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references auth.users(id) on delete set null, -- conta que denunciou (null = anônima)
    reporter_name   text,
    phone           text,
    road_segment_id uuid references road_segments(id) on delete set null,
    latitude        double precision,
    longitude       double precision,
    description     text,
    image_url       text,
    category        report_category not null default 'outro',
    severity        report_severity not null default 'media',
    confidence      numeric(4,3)    check (confidence >= 0 and confidence <= 1), -- confiança da IA (0-1)
    status          report_status   not null default 'aberta',
    created_at      timestamptz     not null default now(),
    updated_at      timestamptz     not null default now()
);

comment on table  reports is 'Denúncias enviadas pela comunidade; categoria/severidade podem ser classificadas por IA.';
comment on column reports.confidence is 'Confiança (0-1) retornada pela classificação automática.';

create index idx_reports_segment  on reports (road_segment_id);
create index idx_reports_status   on reports (status);
create index idx_reports_category on reports (category);
create index idx_reports_created  on reports (created_at desc);

create trigger trg_reports_updated_at
    before update on reports
    for each row execute function set_updated_at();

-- ===========================================================================
-- Tabela: weather_snapshots  (registros meteorológicos por trecho)
-- ===========================================================================
create table weather_snapshots (
    id                    uuid primary key default gen_random_uuid(),
    road_segment_id       uuid references road_segments(id) on delete cascade,
    date                  date         not null default current_date,
    precipitation_forecast numeric(6,2),     -- previsão de precipitação (mm)
    accumulated_rain      numeric(6,2),       -- chuva acumulada observada (mm)
    source                text default 'mock',-- origem: mock | open-meteo | inmet
    created_at            timestamptz  not null default now()
);

comment on table weather_snapshots is 'Histórico de previsões/observações de chuva por trecho (Open-Meteo/INMET ou mock).';

create index idx_weather_segment_date on weather_snapshots (road_segment_id, date desc);

-- ===========================================================================
-- Tabela: processing_logs  (auditoria do reprocessamento diário)
-- ===========================================================================
create table processing_logs (
    id             uuid primary key default gen_random_uuid(),
    execution_date timestamptz  not null default now(),
    status         text         not null default 'success', -- success | error | partial
    message        text,
    created_at     timestamptz  not null default now()
);

comment on table processing_logs is 'Log de cada execução do worker de recálculo de scores (cron diário).';

create index idx_processing_logs_date on processing_logs (execution_date desc);

-- ===========================================================================
-- Tabela: follows  (inscrições para alertas de um trecho)
-- ===========================================================================
create table follows (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references auth.users(id) on delete cascade,  -- conta que segue o trecho
    road_segment_id uuid references road_segments(id) on delete cascade,
    segment_id      uuid,                       -- espelho usado pela API (= road_segment_id)
    name            text,
    contact         text,                       -- telefone/e-mail (opcional)
    channel         alert_channel not null default 'in_app',
    created_at      timestamptz   not null default now()
);

comment on table follows is 'Inscrições de produtores/moradores para receber alertas de um trecho.';
create index idx_follows_segment on follows (segment_id);

-- ===========================================================================
-- Tabela: notifications  (alertas gerados aos seguidores)
-- ===========================================================================
create table notifications (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid references auth.users(id) on delete cascade, -- destinatário (conta seguidora)
    segment_id   uuid,
    segment_name text,
    contact      text,
    channel      alert_channel not null default 'in_app',
    level        risk_level    not null,
    message      text          not null,
    status       text          not null default 'in_app', -- in_app | simulada | enviada
    created_at   timestamptz   not null default now()
);

comment on table notifications is 'Notificações geradas quando um trecho seguido piora (e-mail/WhatsApp simulados).';
create index idx_notifications_created on notifications (created_at desc);

-- ===========================================================================
-- Tabela: work_orders  (ordens de serviço de manutenção — Secretaria)
-- ===========================================================================
create table work_orders (
    id              uuid primary key default gen_random_uuid(),
    road_segment_id uuid references road_segments(id) on delete set null,
    segment_id      uuid,                       -- espelho usado pela API
    title           text not null,
    status          work_order_status not null default 'agendada',
    assigned_team   text,
    notes           text,
    report_ids      jsonb not null default '[]'::jsonb,  -- denúncias vinculadas
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table work_orders is 'Ordens de serviço de manutenção; ao concluir, resolvem denúncias e reduzem o risco.';
create index idx_work_orders_segment on work_orders (segment_id);
create index idx_work_orders_status  on work_orders (status);

create trigger trg_work_orders_updated_at
    before update on work_orders
    for each row execute function set_updated_at();

-- ============================================================================
-- Fim do schema. Próximo passo: executar database/seed.sql
-- ============================================================================
