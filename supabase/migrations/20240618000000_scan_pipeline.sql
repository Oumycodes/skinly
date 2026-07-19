-- Pipeline logging + smoothed metrics for scan consistency
alter table public.skin_scans
  add column if not exists pipeline_payload jsonb;

alter table public.skin_scans
  add column if not exists metrics_smoothed jsonb;

alter table public.skin_scans
  add column if not exists overall_10 numeric;

comment on column public.skin_scans.pipeline_payload is 'QC, CV features, Gemini response, fusion artifacts';
comment on column public.skin_scans.metrics_smoothed is 'EMA-smoothed 0-10 metrics used for charts/trials';
comment on column public.skin_scans.overall_10 is 'Overall score on 0-10 scale';
