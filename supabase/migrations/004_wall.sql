-- A Mí Me Tocó... v0.7. Ejecutar una sola vez DESPUÉS de 003.
-- Mantiene participantes, deseos, exclusiones y asignaciones actuales.
alter table public.exchanges add column if not exists wish_deadline date;
alter table public.exchanges add column if not exists exchange_timezone text not null default 'America/Mexico_City';
update public.exchanges set wish_deadline=event_date where wish_deadline is null and event_date is not null;
-- Para intercambios sin fecha de evento, el cierre queda por definir y las listas abiertas.
alter table public.wishes add column if not exists image_url text;

create table if not exists public.wall_events (
  id bigint generated always as identity primary key,
  exchange_id uuid not null references public.exchanges(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  wish_id uuid references public.wishes(id) on delete cascade,
  kind text not null check(kind in ('joined','wish_added','wish_updated')),
  created_at timestamptz not null default now()
);
create index if not exists wall_events_exchange_recent_idx on public.wall_events(exchange_id,created_at desc,id desc);
create index if not exists wishes_participant_recent_idx on public.wishes(participant_id,created_at desc);
alter table public.wall_events enable row level security;
-- Sin políticas para anon/authenticated. Solo la Edge Function (service_role) accede.

create or replace function public.log_wall_activity()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare x uuid;
begin
  if TG_TABLE_NAME='participants' then
    insert into public.wall_events(exchange_id,participant_id,kind,created_at)
      values(NEW.exchange_id,NEW.id,'joined',NEW.created_at);
  elsif TG_TABLE_NAME='wishes' then
    select exchange_id into x from public.participants where id=NEW.participant_id;
    if x is not null then
      insert into public.wall_events(exchange_id,participant_id,wish_id,kind)
      values(x,NEW.participant_id,NEW.id,case when TG_OP='INSERT' then 'wish_added' else 'wish_updated' end);
    end if;
  end if;
  return NEW;
end $$;
drop trigger if exists wall_participant_joined on public.participants;
create trigger wall_participant_joined after insert on public.participants
for each row execute function public.log_wall_activity();
drop trigger if exists wall_wish_changed on public.wishes;
create trigger wall_wish_changed after insert or update of name,url,notes,image_url on public.wishes
for each row execute function public.log_wall_activity();

-- Backfill histórico, sin duplicar publicaciones al ejecutar nuevamente la migración.
insert into public.wall_events(exchange_id,participant_id,kind,created_at)
select p.exchange_id,p.id,'joined',p.created_at from public.participants p
where not exists (select 1 from public.wall_events ev where ev.participant_id=p.id and ev.kind='joined');
insert into public.wall_events(exchange_id,participant_id,wish_id,kind,created_at)
select p.exchange_id,p.id,w.id,'wish_added',w.created_at
from public.wishes w join public.participants p on p.id=w.participant_id
where not exists (select 1 from public.wall_events ev where ev.wish_id=w.id and ev.kind='wish_added');

-- Límite autoritativo comprobado por la Edge Function al escribir.
-- El borrado CASCADE de participantes sigue funcionando sin verse bloqueado.
