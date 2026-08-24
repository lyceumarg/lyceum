# Lyceum — motor multi-tenant de academias (Fase 0/1)

Base de código **única**, **multi-tenant por debajo** y **mono-marca hacia cada cliente**. Cada organización (tenant) tiene su academia white-label servida en su propio dominio; ninguna ve la plataforma ni la existencia de otros tenants.

> **Lyceum** es la marca de la **plataforma** (del proveedor): aparece solo del lado tuyo — sitio comercial (Sitio A), super-admin y este repo. **Nunca** en la superficie del tenant. El nombre de cada academia lo define el tenant en `tenant_branding`. Excepción opcional: un "Powered by Lyceum" discreto en el footer de la app del tenant, activable por plan (`powered_by`), nunca en certificado ni verificación.

## Qué incluye esta fase

- **Esquema Postgres multi-tenant** (`supabase/migrations/0001_schema.sql`): tenancy + negocio, todo con `tenant_id`.
- **RLS + roles + superficie segura** (`0002_rls.sql`): aislamiento por tenant, corrección de examen server-side, y RPCs públicas de salida mínima.
- **Seed de demo** (`0003_seed.sql`): tenant ABE con un curso publicado.
- **Scaffolding Next.js (App Router)**: resolución de tenant por host, clientes Supabase (browser / server / admin), auth con roles, middleware que separa Sitio A / Sitio B, y ejemplos de queries.

## Arquitectura de superficies

- **Sitio A — Plataforma (proveedor).** Sitio comercial + super-admin. Corre en `PLATFORM_HOST`. Opera las tablas de plataforma con `service_role`. Ningún tenant llega acá.
- **Sitio B — Academia (por tenant).** Storefront + app del alumno + back-office. El tenant se resuelve por el **host** de la request. Todo lo que ve el cliente lleva **su** marca.

Recomendación de deploy: **dos proyectos/deploys** (uno por sitio) apuntando a la **misma** base Supabase. Así el Sitio A ni siquiera comparte bundle con el Sitio B.

## Modelo de seguridad (lo importante)

1. **`tenant_id` y `rol` viven en el JWT** (`app_metadata`), que **no es editable por el cliente**. Se setean al crear el usuario con `service_role` (ver `app/api/auth/signup/route.ts`). RLS confía en ellos vía `current_tenant_id()` / `current_rol()`.
2. **RLS en todas las tablas.** Las de plataforma quedan **sin policy** → denegadas para `anon`/`authenticated` (solo `service_role`). Las de negocio filtran por `tenant_id = current_tenant_id()`.
3. **Anon nunca toca tablas.** El catálogo, el branding y la verificación se sirven por **funciones `security definer`** con salida mínima, resolviendo el tenant por host. No se puede enumerar otros tenants.
4. **Integridad del examen.** El participante **no** tiene lectura sobre `questions`/`question_options`. La corrección, el registro del intento y la emisión del certificado ocurren en `submit_exam()` (server-side), que revalida inscripción, avance e intentos.
5. **Certificado y verificación** llevan solo la marca del tenant; la verificación pública no expone la plataforma.

## Puesta en marcha (local)

```bash
# 1. Supabase local (requiere Supabase CLI) o un proyecto en la nube
supabase start
# 2. Aplicar migraciones
supabase db reset            # corre 0001, 0002, 0003 en orden
# 3. Variables
cp .env.example .env.local   # completar URL + anon + service_role + PLATFORM_HOST
# 4. Dependencias y dev
npm install
npm run dev
```

Para probar el tenant de demo, apuntá un host a la app (ej. `abe.localhost:3000`, ya sembrado en `tenant_domains`). El `branding_by_host` lo resolverá como Academia ABE.

### Crear un usuario admin del tenant (ejemplo)
Los participantes se dan de alta por `/api/auth/signup` (resuelve tenant por host). Para un `tenant_admin`, creá el usuario con `service_role` seteando `app_metadata: { tenant_id, rol: 'tenant_admin' }` desde la app de Sitio A / un script.

## Sitio B — UI incluida (Fase 1)

Rutas del front de la academia (App Router), tematizadas por host:

- `/` — storefront branded + catálogo público (RPC `catalog_by_host`).
- `/curso/[id]` — detalle público con temario (RPC `course_detail_public`).
- `/login` y `/registro` — auth; el registro crea el participante en la academia del host (tenant resuelto en el server).
- `/mis-cursos` — panel del alumno: inscripciones con avance y certificados (RPC `my_courses`).
- `/verificar` — verificación pública por ID (RPC `verify_certificate`), sin cuenta.
- `/curso/[id]/cursar` — cursada: índice de lecciones, render de bloques mixtos, marca de progreso.
- `/curso/[id]/examen` — examen: preguntas sin respuestas (RPC `get_exam`), corrección y emisión en `submit_exam`.
- `/certificado/[id]` — credencial en pantalla, branded por la academia emisora.
- `/panel` — **back-office** (staff): dashboard, alta de cursos, editor de módulos/lecciones/bloques con vista previa, y examen (config + banco de preguntas). Mutaciones bajo RLS de staff.
- `/panel/participantes` — inscripciones de la academia (solo lectura).

El layout resuelve el tenant por host, aplica su color, y pone el nombre de la academia en el `<title>`. Ninguna vista referencia la plataforma.

El circuito del alumno está completo (catálogo → inscripción → cursada → examen → certificado → verificación) y el **back-office `/panel`** permite al tenant operar solo: crear cursos, cargar contenido y armar el examen. Pendiente: checkout Mercado Pago (Fase 2; hoy la inscripción es sin pago), certificado en PDF server-side (Fase 3) y el alta de tenants en el Sitio A.

## Próximos pasos

- **Fase 1 (UI):** back-office de cursos/módulos/lecciones (editor de bloques) y app del alumno, consumiendo estas queries.
- **Fase 2:** checkout Mercado Pago + webhook (con `service_role`) que inserta `orders` e `enrollments`.
- **Fase 3–4:** cursada con progreso, examen (ya cableado en backend) y certificado PDF + página de verificación.
- **Alta de tenants:** flujo de onboarding en Sitio A (crea `tenant`, `tenant_domains`, `tenant_branding`, `subscription`).

Ver `prompt-plataforma-elearning.md` para el spec funcional completo.
