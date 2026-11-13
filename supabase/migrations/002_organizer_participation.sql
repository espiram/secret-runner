-- Run ONCE in Supabase SQL Editor on the existing Secret Runner database.
-- The current organizer keeps participating until they switch the option off.
alter table public.participants
  add column if not exists participates boolean not null default true;

-- Replace original publication function to consider eligible runners only.
create or replace function public.publish_draw(p_exchange uuid, p_pairs jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer; x record;
begin
  perform 1 from public.exchanges where id=p_exchange for update;
  if not found then raise exception 'Intercambio no encontrado'; end if;
  if (select drawn from public.exchanges where id=p_exchange) then raise exception 'Sorteo ya realizado'; end if;
  select count(*) into n from public.participants where exchange_id=p_exchange and participates=true;
  if n<3 or jsonb_array_length(p_pairs)<>n then raise exception 'Número de participantes inválido'; end if;
  if (select count(distinct (z->>'giver')) from jsonb_array_elements(p_pairs) z)<>n
     or (select count(distinct (z->>'receiver')) from jsonb_array_elements(p_pairs) z)<>n then
     raise exception 'Asignaciones duplicadas'; end if;
  for x in select (z->>'giver')::uuid as giver, (z->>'receiver')::uuid as receiver from jsonb_array_elements(p_pairs) z loop
    if x.giver=x.receiver then raise exception 'Autoasignación'; end if;
    if not exists(select 1 from public.participants where id=x.giver and exchange_id=p_exchange and participates=true)
       or not exists(select 1 from public.participants where id=x.receiver and exchange_id=p_exchange and participates=true) then
       raise exception 'Participante no elegible'; end if;
    if exists(select 1 from public.exclusions e where e.exchange_id=p_exchange and
       ((e.a=x.giver and e.b=x.receiver) or (e.b=x.giver and e.a=x.receiver))) then
       raise exception 'Asignación excluida'; end if;
    insert into public.assignments(exchange_id,giver,receiver) values(p_exchange,x.giver,x.receiver);
  end loop;
  update public.exchanges set drawn=true where id=p_exchange;
end $$;
revoke all on function public.publish_draw(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.publish_draw(uuid,jsonb) to service_role;
