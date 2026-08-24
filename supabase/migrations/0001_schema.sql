-- =====================================================================
-- 0001_schema.sql — Esquema multi-tenant (Fase 0/1)
-- Motor de academias white-label. Toda tabla de negocio lleva tenant_id.
-- El aislamiento se aplica en 0002_rls.sql (RLS por tenant).
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- CAPA DE PLATAFORMA (del proveedor — NUNCA visible para un tenant)
-- =====================================================================

create table platform_plans (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  precio_mensual numeric(12,2) not null default 0,
  limites        jsonb not null default '{}'::jsonb,  -- {cursos, alumnos, storage_gb}
  created_at     timestamptz not null default now()
);

create table tenants (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,                    -- razón social del cliente (uso interno)
  slug       text not null unique,
  estado     text not null default 'activo' check (estado in ('activo','suspendido')),
  plan_id    uuid references platform_plans(id),
  created_at timestamptz not null default now()
);

-- Un tenant puede tener varios hosts (subdominio + dominio custom).
create table tenant_domains (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  host        text not null unique,            -- ej: academia.abe.org.ar
  es_primario boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on tenant_domains(tenant_id);

-- Identidad de marca del tenant (lo único de "marca" que ve el cliente).
create table tenant_branding (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  nombre_academia text not null,
  logo_url        text,
  color_primario  text not null default '#1f5c9c',
  updated_at      timestamptz not null default now()
);

-- Suscripción del tenant a la plataforma (cobro tenant -> proveedor).
create table subscriptions (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  plan_id          uuid references platform_plans(id),
  estado           text not null default 'activa' check (estado in ('activa','pausada','cancelada','morosa')),
  periodo_inicio   date,
  periodo_fin      date,
  mp_subscription_id text,
  created_at       timestamptz not null default now()
);
create index on subscriptions(tenant_id);

-- =====================================================================
-- PERFILES (ligados a auth.users). tenant_id NULL solo para platform_admin.
-- =====================================================================

create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  tenant_id         uuid references tenants(id) on delete cascade,
  rol               text not null default 'participante'
                    check (rol in ('platform_admin','tenant_admin','instructor','participante')),
  nombre            text,
  dni_cuit          text,
  datos_certificado jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index on profiles(tenant_id);

-- =====================================================================
-- NEGOCIO DE CADA ACADEMIA (todas con tenant_id)
-- =====================================================================

create table courses (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  titulo        text not null,
  descripcion   text,
  portada_url   text,
  precio        numeric(12,2) not null default 0,
  moneda        text not null default 'ARS',
  estado        text not null default 'borrador' check (estado in ('borrador','publicado','archivado')),
  categoria     text,
  instructor_id uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index on courses(tenant_id);
create index on courses(tenant_id, estado);

create table modules (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  course_id  uuid not null references courses(id) on delete cascade,
  titulo     text not null,
  orden      int not null default 0
);
create index on modules(tenant_id);
create index on modules(course_id);

create table lessons (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  module_id        uuid not null references modules(id) on delete cascade,
  titulo           text not null,
  orden            int not null default 0,
  es_muestra_gratis boolean not null default false
);
create index on lessons(tenant_id);
create index on lessons(module_id);

create table content_blocks (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  lesson_id     uuid not null references lessons(id) on delete cascade,
  tipo          text not null check (tipo in ('video','slides','richtext','download','link','embed','quiz','scorm')),
  orden         int not null default 0,
  contenido     jsonb not null default '{}'::jsonb,  -- campos propios del tipo (url, proveedor, html, fuente, dominio...)
  media_url     text
);
create index on content_blocks(tenant_id);
create index on content_blocks(lesson_id);

create table enrollments (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  course_id        uuid not null references courses(id) on delete cascade,
  estado           text not null default 'activa' check (estado in ('activa','completada','cancelada')),
  origen           text not null default 'compra' check (origen in ('compra','manual','cupo')),
  fecha_inscripcion timestamptz not null default now(),
  unique (user_id, course_id)
);
create index on enrollments(tenant_id);
create index on enrollments(user_id);
create index on enrollments(course_id);

create table lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  lesson_id     uuid not null references lessons(id) on delete cascade,
  completada    boolean not null default false,
  fecha         timestamptz,
  unique (enrollment_id, lesson_id)
);
create index on lesson_progress(tenant_id);
create index on lesson_progress(enrollment_id);

-- Banco de preguntas del examen certificante (contenido SENSIBLE: nunca al cliente).
create table questions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  course_id   uuid not null references courses(id) on delete cascade,
  tipo        text not null default 'single' check (tipo in ('single','multiple','truefalse')),
  enunciado   text not null,
  explicacion text
);
create index on questions(tenant_id);
create index on questions(course_id);

create table question_options (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  texto       text not null,
  es_correcta boolean not null default false
);
create index on question_options(question_id);

create table exam_config (
  course_id     uuid primary key references courses(id) on delete cascade,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  cant_preguntas int not null default 10,
  nota_corte    int not null default 70,
  max_intentos  int not null default 3,
  tiempo_max_min int,
  aleatorizar   boolean not null default true
);
create index on exam_config(tenant_id);

create table exam_attempts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  enrollment_id uuid not null references enrollments(id) on delete cascade,
  puntaje       int not null,
  aprobado      boolean not null,
  respuestas    jsonb not null default '{}'::jsonb,
  fecha         timestamptz not null default now()
);
create index on exam_attempts(tenant_id);
create index on exam_attempts(enrollment_id);

create table certificates (
  id             uuid primary key default gen_random_uuid(),
  id_publico     text not null unique,          -- ID verificable (ej: ABE-2026-4821)
  tenant_id      uuid not null references tenants(id) on delete cascade,
  enrollment_id  uuid not null references enrollments(id) on delete cascade,
  puntaje        int not null,
  fecha_emision  timestamptz not null default now(),
  fecha_vencimiento date,
  estado         text not null default 'valido' check (estado in ('valido','revocado')),
  pdf_url        text
);
create index on certificates(tenant_id);
create index on certificates(enrollment_id);

create table orders (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  course_id      uuid not null references courses(id) on delete cascade,
  monto          numeric(12,2) not null,
  estado         text not null default 'pendiente' check (estado in ('pendiente','aprobado','rechazado','reembolsado')),
  mp_payment_id  text,
  mp_preference_id text,
  created_at     timestamptz not null default now()
);
create index on orders(tenant_id);
create index on orders(user_id);

create table coupons (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  codigo      text not null,
  descuento_pct int not null check (descuento_pct between 1 and 100),
  activo      boolean not null default true,
  vence       date,
  unique (tenant_id, codigo)
);
create index on coupons(tenant_id);
