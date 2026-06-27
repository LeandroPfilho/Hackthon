-- ============================================================================
-- LinhaMap — seed.sql
-- Dados mockados de Ariquemes/RO para o MVP rodar no primeiro dia (Seção 7).
-- Pré-requisito: executar database/schema.sql antes.
--
-- IDEMPOTENTE: limpa as tabelas antes de inserir.
-- IDs fixos para que as denúncias possam referenciar os trechos de forma estável.
-- ============================================================================

truncate weather_snapshots, reports, processing_logs, road_segments restart identity cascade;

-- ===========================================================================
-- 1) ROAD_SEGMENTS — 8 trechos cobrindo os 4 níveis de risco
--    Geometria ancorada em dados reais do OpenStreetMap (Nominatim, jun/2026):
--    C-60, C-65, C-70, C-75, Linha Gaúcha, Linha 60 e Linha 57,5 existem em
--    Ariquemes/RO. Riscos/chuvas seguem fictícios. © OpenStreetMap, ODbL.
-- ===========================================================================
insert into road_segments
    (id, name, rural_line, geometry, latitude, longitude, slope,
     accumulated_rain_72h, forecast_rain_7d, forecast_daily,
     reports_count, risk_score, risk_level, explanation)
values
-- (1) CRÍTICO ---------------------------------------------------------------
('11111111-1111-1111-1111-000000000001',
 'Trecho Ponte do Branco', 'Linha C-65',
 ST_GeomFromText('LINESTRING(-63.161 -9.8934, -63.1579 -9.8934, -63.1548 -9.8933)', 4326),
 -9.8934, -63.1579, 8.50, 92.0, 140.0,
 '[{"date":"D+1","mm":28},{"date":"D+2","mm":34},{"date":"D+3","mm":22},{"date":"D+4","mm":18},{"date":"D+5","mm":15},{"date":"D+6","mm":12},{"date":"D+7","mm":11}]',
 4, 86.0, 'critico',
 'Risco crítico: chuva acumulada de 92 mm em 72h, previsão de chuva intensa (140 mm em 7 dias), declividade elevada de 8,5% e 4 relatos recentes de lama e atolamento.'),

-- (2) CRÍTICO ---------------------------------------------------------------
('11111111-1111-1111-1111-000000000007',
 'Trecho Atravessa Igarapé', 'Linha 60',
 ST_GeomFromText('LINESTRING(-63.007 -9.953, -63.004 -9.953, -63.001 -9.9531)', 4326),
 -9.953, -63.004, 6.20, 88.0, 122.0,
 '[{"date":"D+1","mm":24},{"date":"D+2","mm":30},{"date":"D+3","mm":20},{"date":"D+4","mm":16},{"date":"D+5","mm":12},{"date":"D+6","mm":10},{"date":"D+7","mm":10}]',
 3, 79.0, 'critico',
 'Risco crítico: ponte sobre igarapé com 3 relatos recentes, chuva acumulada de 88 mm e previsão de 122 mm para a semana comprometem a travessia de caminhões de peixe.'),

-- (3) ALTO ------------------------------------------------------------------
('11111111-1111-1111-1111-000000000002',
 'Trecho Igarapé Verde', 'Linha C-70',
 ST_GeomFromText('LINESTRING(-62.9953 -9.842, -62.9782 -9.8421, -62.9618 -9.8421)', 4326),
 -9.8421, -62.9782, 5.10, 64.0, 95.0,
 '[{"date":"D+1","mm":18},{"date":"D+2","mm":20},{"date":"D+3","mm":16},{"date":"D+4","mm":14},{"date":"D+5","mm":10},{"date":"D+6","mm":9},{"date":"D+7","mm":8}]',
 2, 66.0, 'alto',
 'Risco alto: chuva acumulada de 64 mm em 72h e previsão de 95 mm para os próximos dias, com 2 relatos recentes de buraco e erosão.'),

-- (4) ALTO ------------------------------------------------------------------
('11111111-1111-1111-1111-000000000005',
 'Trecho Travessão 40', 'Linha Gaúcha',
 ST_GeomFromText('LINESTRING(-63.011 -9.9217, -63.008 -9.9217, -63.005 -9.9216)', 4326),
 -9.9217, -63.008, 7.30, 58.0, 88.0,
 '[{"date":"D+1","mm":16},{"date":"D+2","mm":18},{"date":"D+3","mm":15},{"date":"D+4","mm":13},{"date":"D+5","mm":11},{"date":"D+6","mm":8},{"date":"D+7","mm":7}]',
 2, 70.0, 'alto',
 'Risco alto: declividade de 7,3% acelera a erosão; chuva acumulada de 58 mm e 2 relatos recentes elevam a probabilidade de atolamento.'),

-- (5) MÉDIO -----------------------------------------------------------------
('11111111-1111-1111-1111-000000000003',
 'Trecho Sítio Boa Vista', 'Linha C-60',
 ST_GeomFromText('LINESTRING(-63.150 -9.9384, -63.1615 -9.9387, -63.173 -9.939)', 4326),
 -9.9387, -63.1615, 3.40, 36.0, 52.0,
 '[{"date":"D+1","mm":10},{"date":"D+2","mm":9},{"date":"D+3","mm":8},{"date":"D+4","mm":7},{"date":"D+5","mm":6},{"date":"D+6","mm":6},{"date":"D+7","mm":6}]',
 1, 38.0, 'medio',
 'Risco médio: chuva acumulada moderada (36 mm) e previsão de 52 mm; 1 relato recente. Trecho exige atenção, mas ainda transitável.'),

-- (6) MÉDIO -----------------------------------------------------------------
('11111111-1111-1111-1111-000000000006',
 'Trecho Cafezal Alto', 'Linha 57,5',
 ST_GeomFromText('LINESTRING(-63.0064 -9.9563, -63.0034 -9.9563, -63.0004 -9.9564)', 4326),
 -9.9563, -63.0034, 4.60, 30.0, 48.0,
 '[{"date":"D+1","mm":9},{"date":"D+2","mm":8},{"date":"D+3","mm":8},{"date":"D+4","mm":7},{"date":"D+5","mm":6},{"date":"D+6","mm":5},{"date":"D+7","mm":5}]',
 1, 45.0, 'medio',
 'Risco médio: declividade de 4,6% e chuva acumulada de 30 mm; 1 relato de buraco. Recomenda-se monitorar antes do escoamento do café.'),

-- (7) BAIXO -----------------------------------------------------------------
('11111111-1111-1111-1111-000000000004',
 'Trecho Laticínio', 'Linha C-75',
 ST_GeomFromText('LINESTRING(-63.1364 -9.8021, -63.1492 -9.8026, -63.1617 -9.803)', 4326),
 -9.8026, -63.1491, 2.10, 12.0, 22.0,
 '[{"date":"D+1","mm":4},{"date":"D+2","mm":3},{"date":"D+3","mm":3},{"date":"D+4","mm":3},{"date":"D+5","mm":3},{"date":"D+6","mm":3},{"date":"D+7","mm":3}]',
 0, 15.0, 'baixo',
 'Risco baixo: chuva acumulada de apenas 12 mm, previsão fraca (22 mm) e declividade suave de 2,1%. Sem relatos recentes.'),

-- (8) BAIXO -----------------------------------------------------------------
('11111111-1111-1111-1111-000000000008',
 'Trecho Curva da Serra', 'Linha C-65',
 ST_GeomFromText('LINESTRING(-63.150 -9.8933, -63.1469 -9.8933, -63.1438 -9.8932)', 4326),
 -9.8933, -63.1469, 3.00, 18.0, 28.0,
 '[{"date":"D+1","mm":5},{"date":"D+2","mm":5},{"date":"D+3","mm":4},{"date":"D+4","mm":4},{"date":"D+5","mm":4},{"date":"D+6","mm":3},{"date":"D+7","mm":3}]',
 0, 21.0, 'baixo',
 'Risco baixo: condições estáveis, chuva acumulada de 18 mm e previsão de 28 mm. Sem relatos recentes; trafegabilidade normal.');

-- Popula `coordinates` (formato API/mapa) a partir da geometria PostGIS.
update road_segments
set coordinates = (ST_AsGeoJSON(geometry)::jsonb -> 'coordinates');

-- ===========================================================================
-- 2) REPORTS — denúncias de exemplo (alimentam dashboard e contagem de relatos)
-- ===========================================================================
insert into reports
    (reporter_name, phone, road_segment_id, latitude, longitude, description,
     image_url, category, severity, confidence, status, created_at)
values
('João Ferreira', '(69) 99999-1001', '11111111-1111-1111-1111-000000000001',
 -9.8935, -63.1576, 'Muita lama na descida da ponte, caminhão do leite quase atolou.',
 null, 'lama', 'critica', 0.91, 'aberta', now() - interval '1 day'),

('Maria Souza', '(69) 99999-1002', '11111111-1111-1111-1111-000000000001',
 -9.8933, -63.1582, 'Buraco grande perto da ponte, está crescendo com a chuva.',
 null, 'buraco', 'alta', 0.84, 'em_analise', now() - interval '2 days'),

('Cooperativa Leite Bom', '(69) 99999-1003', '11111111-1111-1111-1111-000000000007',
 -9.9531, -63.0037, 'Cabeceira da ponte cedendo, perigoso para caminhão de peixe.',
 null, 'ponte_danificada', 'critica', 0.88, 'aberta', now() - interval '1 day'),

('Pedro Lima', '(69) 99999-1004', '11111111-1111-1111-1111-000000000002',
 -9.8422, -62.9779, 'Erosão na lateral da estrada depois da última chuva forte.',
 null, 'erosao', 'alta', 0.79, 'aberta', now() - interval '3 days'),

('Antônio Rocha', '(69) 99999-1005', '11111111-1111-1111-1111-000000000005',
 -9.9218, -63.0077, 'Atolei a caminhonete no travessão, solo muito mole.',
 null, 'atolamento', 'alta', 0.82, 'aberta', now() - interval '2 days'),

('Sebastião Alves', '(69) 99999-1006', '11111111-1111-1111-1111-000000000003',
 -9.9388, -63.1612, 'Apareceu um buraco no meio da pista, dá pra desviar ainda.',
 null, 'buraco', 'media', 0.71, 'resolvida', now() - interval '6 days');

-- ===========================================================================
-- 3) WEATHER_SNAPSHOTS — registro meteorológico atual por trecho (mock)
-- ===========================================================================
insert into weather_snapshots (road_segment_id, date, precipitation_forecast, accumulated_rain, source)
select id, current_date, forecast_rain_7d, accumulated_rain_72h, 'mock'
from road_segments;

-- ===========================================================================
-- 4) PROCESSING_LOGS — log inicial do seed
-- ===========================================================================
insert into processing_logs (status, message)
values ('success', 'Carga inicial (seed) concluída: 8 trechos, 6 denúncias e snapshots meteorológicos mockados de Ariquemes/RO.');

-- ============================================================================
-- Conferência rápida (opcional):
--   select rural_line, name, risk_level, risk_score from road_segments order by risk_score desc;
--   select count(*) from reports;
-- ============================================================================
