-- Permisos explícitos para la clave secreta (rol service_role).
-- Algunos proyectos nuevos de Supabase no dan permisos automáticos a las tablas creadas por SQL.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.articles, public.feed_status to service_role;
grant usage, select on all sequences in schema public to service_role;
