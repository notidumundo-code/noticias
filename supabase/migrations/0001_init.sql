-- Noticias Globales: esquema inicial.
-- Solo el Worker de Cloudflare accede a estas tablas, con la clave secreta.
-- RLS activado sin políticas: las claves públicas (anon/publishable) no pueden leer ni escribir nada.

create table if not exists public.articles (
  id           bigint generated always as identity primary key,
  url          text not null unique check (url ~ '^https?://'),
  title        text not null check (char_length(title) <= 300),
  summary      text not null default '' check (char_length(summary) <= 400),
  source_id    text not null,
  source_name  text not null,
  category     text not null check (category in ('economia', 'politica')),
  region       text not null check (region in ('argentina', 'region', 'mundo')),
  lang         text not null default 'es',
  published_at timestamptz not null,
  fetched_at   timestamptz not null default now()
);

create index if not exists articles_published_idx on public.articles (published_at desc);
create index if not exists articles_bucket_idx on public.articles (category, region, published_at desc);

create table if not exists public.feed_status (
  feed_id         text primary key,
  last_fetched_at timestamptz,
  last_ok_at      timestamptz,
  last_error      text,
  items_last      integer
);

alter table public.articles    enable row level security;
alter table public.feed_status enable row level security;

revoke all on public.articles, public.feed_status from anon, authenticated;
