-- Scan pipeline v1 logging (QC, CV features, Gemini, fused/smoothed scores)
alter table public.skin_scans
  add column if not exists pipeline_version text;

alter table public.skin_scans
  add column if not exists normalized_image_path text;

alter table public.skin_scans
  add column if not exists qc jsonb;

alter table public.skin_scans
  add column if not exists cv_features jsonb;

alter table public.skin_scans
  add column if not exists gemini_raw jsonb;

alter table public.skin_scans
  add column if not exists metrics_raw jsonb;

alter table public.skin_scans
  add column if not exists metrics_smoothed jsonb;

alter table public.skin_scans
  add column if not exists findings jsonb;

alter table public.skin_scans
  add column if not exists zones jsonb;

alter table public.skin_scans
  add column if not exists see_professional boolean default false;

alter table public.skin_scans
  add column if not exists overall_10 double precision;

alter table public.profiles
  add column if not exists skin_baseline_a_star double precision;

comment on column public.skin_scans.pipeline_version is 'Scan pipeline version tag e.g. v1';
comment on column public.profiles.skin_baseline_a_star is 'Median LAB a* from first 3 accepted scans';
