-- ============================================================
-- JARDÍN SEMÁNTICO — esquema de Supabase
-- Pega TODO este archivo en: Supabase → SQL Editor → Run
-- ============================================================

-- Tabla de plantas
create table if not exists public.plants (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  phrase      text not null check (char_length(phrase) between 3 and 300),
  keyword     text,
  species     text,
  sentiment   double precision,
  genome      jsonb not null,
  x           double precision
);

-- Índice para cargar las más recientes rápido
create index if not exists plants_created_at_idx
  on public.plants (created_at desc);

-- Seguridad a nivel de fila (RLS)
alter table public.plants enable row level security;

-- Cualquiera puede LEER el jardín
drop policy if exists "lectura pública" on public.plants;
create policy "lectura pública"
  on public.plants for select
  using (true);

-- Cualquiera puede PLANTAR (insertar)
drop policy if exists "siembra pública" on public.plants;
create policy "siembra pública"
  on public.plants for insert
  with check (true);

-- Nadie puede editar ni borrar plantas ajenas (sin políticas de
-- update/delete: quedan bloqueadas por defecto con RLS activo).

-- Tiempo real: emitir INSERTs a los clientes conectados
alter publication supabase_realtime add table public.plants;
