-- A Mí Me Tocó... v0.8: direcciones privadas y solicitudes anónimas.
-- Ejecutar después de 004_wall.sql. No altera asignaciones ni deseos.
-- Acceso exclusivo desde Edge Function con service_role: NO policies anon/authenticated.
create table if not exists public.delivery_addresses (
 participant_id uuid primary key references public.participants(id) on delete cascade,
 exchange_id uuid not null references public.exchanges(id) on delete cascade,
 recipient_name text not null check (char_length(recipient_name) between 1 and 100),
 kind text not null check (kind in ('Casa','Oficina','Familiar','Punto de entrega','Otro')),
 address_text text not null check (char_length(address_text) between 10 and 1000),
 notes text check (char_length(notes)<=300),
 updated_at timestamptz not null default now()
);
create index if not exists delivery_addresses_exchange_idx on public.delivery_addresses(exchange_id);
alter table public.delivery_addresses enable row level security;

create table if not exists public.delivery_requests (
 recipient_id uuid primary key references public.participants(id) on delete cascade,
 exchange_id uuid not null references public.exchanges(id) on delete cascade,
 requested_at timestamptz not null default now(),
 fulfilled_at timestamptz
);
create index if not exists delivery_requests_exchange_idx on public.delivery_requests(exchange_id);
alter table public.delivery_requests enable row level security;

-- Enforces consistent exchange ownership even if API code changes in future.
create or replace function public.validate_delivery_exchange()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.participants p where p.id=NEW.participant_id and p.exchange_id=NEW.exchange_id) then
   raise exception 'La dirección no pertenece al intercambio';
 end if;
 return NEW;
end $$;
drop trigger if exists delivery_address_exchange_check on public.delivery_addresses;
create trigger delivery_address_exchange_check before insert or update on public.delivery_addresses
 for each row execute function public.validate_delivery_exchange();

create or replace function public.validate_request_exchange()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.participants p where p.id=NEW.recipient_id and p.exchange_id=NEW.exchange_id) then
   raise exception 'Solicitud fuera del intercambio';
 end if;
 return NEW;
end $$;
drop trigger if exists delivery_request_exchange_check on public.delivery_requests;
create trigger delivery_request_exchange_check before insert or update on public.delivery_requests
 for each row execute function public.validate_request_exchange();

revoke all on public.delivery_addresses from anon,authenticated;
revoke all on public.delivery_requests from anon,authenticated;
