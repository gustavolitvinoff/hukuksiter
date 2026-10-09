-- HukukSiter — actualización: la babysitter ya no marca horarios.
-- Aparece disponible siempre que no tenga un pedido ACEPTADO que choque con el horario buscado.
-- Cómo usar: Supabase → SQL Editor → New query → pegar todo → Run

create or replace function public.search_babysitters(p_date date, p_start time, p_end time)
returns table (id uuid, first_name text, last_name text, age int)
language sql stable security definer set search_path = public as $$
  select p.id, p.first_name, p.last_name,
         case when p.birth_date is null then null
              else extract(year from age(current_date, p.birth_date))::int end
  from public.profiles p
  where auth.uid() is not null
    and p_end > p_start
    and p.role = 'babysitter'
    and p.id <> auth.uid()
    and not exists (
      select 1 from public.bookings b
      where b.babysitter_id = p.id
        and b.status = 'accepted'
        and b.booking_date = p_date
        and b.start_time < p_end
        and b.end_time   > p_start
    )
  order by p.first_name, p.last_name;
$$;
