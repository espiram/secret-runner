-- Secret Runner v0.4. Run once AFTER 001_init.sql and 002_organizer_participation.sql.
-- Removes a non-admin participant and their exclusions atomically, only before draw.
-- Wishes cascade on participant deletion. No published assignments can be touched.
create or replace function public.remove_participant_before_draw(p_exchange uuid, p_participant uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from public.exchanges where id=p_exchange for update;
  if not found then raise exception 'Intercambio no encontrado'; end if;
  if (select drawn from public.exchanges where id=p_exchange) then
    raise exception 'No se puede eliminar participantes después del sorteo';
  end if;
  if not exists (
    select 1 from public.participants
    where id=p_participant and exchange_id=p_exchange and is_admin=false
  ) then raise exception 'Participante no encontrado o protegido'; end if;
  delete from public.exclusions
    where exchange_id=p_exchange and (a=p_participant or b=p_participant);
  delete from public.participants
    where id=p_participant and exchange_id=p_exchange and is_admin=false;
  if not found then raise exception 'No se pudo eliminar al participante'; end if;
end $$;
revoke all on function public.remove_participant_before_draw(uuid,uuid) from public,anon,authenticated;
grant execute on function public.remove_participant_before_draw(uuid,uuid) to service_role;
