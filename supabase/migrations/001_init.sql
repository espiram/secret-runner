-- Execute in the Supabase SQL Editor for a NEW, dedicated Secret Runner project.
create extension if not exists pgcrypto;
create table public.exchanges (
 id uuid primary key default gen_random_uuid(), title text not null,
 budget numeric(12,2) not null default 500 check(budget>=0),
 event_date date, join_deadline date, invite_code text not null unique,
 drawn boolean not null default false, created_at timestamptz not null default now()
);
create table public.participants (
 id uuid primary key default gen_random_uuid(), exchange_id uuid not null references public.exchanges(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 75),
 token_hash text not null unique, is_admin boolean not null default false,
 created_at timestamptz not null default now(),
 unique(exchange_id,name)
);
create table public.wishes (
 id uuid primary key default gen_random_uuid(), participant_id uuid not null references public.participants(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 120), url text, price numeric(12,2) check(price>=0), notes text,
 created_at timestamptz not null default now()
);
create table public.exclusions (
 id uuid primary key default gen_random_uuid(), exchange_id uuid not null references public.exchanges(id) on delete cascade,
 a uuid not null references public.participants(id), b uuid not null references public.participants(id),
 check(a<>b), unique(exchange_id,a,b)
);
create table public.assignments (
 exchange_id uuid not null references public.exchanges(id) on delete cascade,
 giver uuid not null unique references public.participants(id),
 receiver uuid not null unique references public.participants(id),
 check(giver<>receiver), primary key(exchange_id,giver)
);
-- Clients must never access these tables directly. All access passes through an Edge Function.
alter table public.exchanges enable row level security;
alter table public.participants enable row level security;
alter table public.wishes enable row level security;
alter table public.exclusions enable row level security;
alter table public.assignments enable row level security;
-- No anon/authenticated RLS policies are deliberately provided.
-- Service role only, using server-side Edge Function secrets.

-- Atomic publication: guarantees single draw per exchange and checks the assignment set.
create or replace function public.publish_draw(p_exchange uuid, p_pairs jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer; x record;
begin
  perform 1 from public.exchanges where id=p_exchange for update;
  if not found then raise exception 'Intercambio no encontrado'; end if;
  if (select drawn from public.exchanges where id=p_exchange) then raise exception 'Sorteo ya realizado'; end if;
  select count(*) into n from public.participants where exchange_id=p_exchange;
  if n<3 or jsonb_array_length(p_pairs)<>n then raise exception 'Número de participantes inválido'; end if;
  if (select count(distinct (z->>'giver')) from jsonb_array_elements(p_pairs) z)<>n
     or (select count(distinct (z->>'receiver')) from jsonb_array_elements(p_pairs) z)<>n then
     raise exception 'Asignaciones duplicadas'; end if;
  for x in select (z->>'giver')::uuid as giver, (z->>'receiver')::uuid as receiver from jsonb_array_elements(p_pairs) z loop
    if x.giver=x.receiver then raise exception 'Autoasignación'; end if;
    if not exists(select 1 from public.participants where id=x.giver and exchange_id=p_exchange)
      or not exists(select 1 from public.participants where id=x.receiver and exchange_id=p_exchange) then
      raise exception 'Participante inválido'; end if;
    if exists(select 1 from public.exclusions e where e.exchange_id=p_exchange and
       ((e.a=x.giver and e.b=x.receiver) or (e.b=x.giver and e.a=x.receiver))) then
       raise exception 'Asignación excluida'; end if;
    insert into public.assignments(exchange_id,giver,receiver) values(p_exchange,x.giver,x.receiver);
  end loop;
  update public.exchanges set drawn=true where id=p_exchange;
end $$;
revoke all on function public.publish_draw(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.publish_draw(uuid,jsonb) to service_role;
