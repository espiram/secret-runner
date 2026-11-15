-- v1.1: block duplicate participant names within each exchange, ignoring case,
-- accents and excess whitespace. Existing participants and sessions are preserved.
-- PostgreSQL UTF-8 database required for normalize(..., NFD).
BEGIN;

CREATE OR REPLACE FUNCTION public.exchange_name_key(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
 SELECT btrim(regexp_replace(
   regexp_replace(lower(normalize(btrim(p_name), NFD)), U&'[\0300-\036F]', '', 'g'),
   '[[:space:]]+', ' ', 'g'
 ));
$$;

-- Do not silently merge or remove existing participants. If this check fails,
-- resolve the listed names manually, then rerun the migration.
DO $$
DECLARE duplicates text;
BEGIN
 SELECT string_agg(format('%s: %s', exchange_id, names), E'\n')
 INTO duplicates
 FROM (
   SELECT exchange_id, string_agg(name, ' / ' ORDER BY created_at) AS names
   FROM public.participants
   GROUP BY exchange_id, public.exchange_name_key(name)
   HAVING count(*) > 1
 ) AS collisions;
 IF duplicates IS NOT NULL THEN
   RAISE EXCEPTION 'Existen nombres equivalentes en un intercambio. Resuelve antes de migrar: %', duplicates;
 END IF;
END $$;

-- A unique expression index makes the check atomic for concurrent signups
-- and covers organizer creation and rename as well as participant registration.
CREATE UNIQUE INDEX IF NOT EXISTS participants_exchange_normalized_name_unique
ON public.participants (exchange_id, public.exchange_name_key(name));

COMMIT;
