-- =====================================================================
--  HukukSiter — base de datos completa para Supabase
--  Cómo usar: Supabase → SQL Editor → New query → pegar TODO → Run
-- =====================================================================

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------

-- Datos públicos (para usuarios registrados): nombre y edad
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  role        text not null check (role in ('employer', 'babysitter')),
  first_name  text not null,
  last_name   text not null,
  birth_date  date,
  language    text not null default 'he' check (language in ('he', 'en')),
  created_at  timestamptz not null default now()
);

-- Datos privados: teléfono y token de notificaciones.
-- Nadie puede leer el teléfono de otro directamente; solo a través de
-- my_bookings() y solo cuando hay un pedido ACEPTADO entre ambos.
create table public.private_info (
  user_id     uuid primary key references public.profiles on delete cascade,
  phone       text not null,
  push_token  text
);

-- Disponibilidad de la babysitter: semanal (weekday) o fecha puntual (on_date)
create table public.availability (
  id             uuid primary key default gen_random_uuid(),
  babysitter_id  uuid not null references public.profiles on delete cascade,
  weekday        smallint check (weekday between 0 and 6), -- 0 = domingo
  on_date        date,
  start_time     time not null,
  end_time       time not null,
  created_at     timestamptz not null default now(),
  check ((weekday is null) <> (on_date is null)),
  check (end_time > start_time)
);
create index on public.availability (babysitter_id);

-- Pedidos
create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  employer_id    uuid not null references public.profiles on delete cascade,
  babysitter_id  uuid not null references public.profiles on delete cascade,
  booking_date   date not null,
  start_time     time not null,
  end_time       time not null,
  status         text not null default 'pending'
                 check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  cancelled_by   uuid references public.profiles,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_time > start_time)
);
create index on public.bookings (babysitter_id, booking_date);
create index on public.bookings (employer_id);

-- Notificaciones dentro de la app (la campanita)
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  actor_id    uuid references public.profiles on delete set null,
  booking_id  uuid references public.bookings on delete cascade,
  kind        text not null check (kind in ('new_request', 'accepted', 'rejected', 'cancelled')),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on public.notifications (user_id, read);

-- ---------------------------------------------------------------------
-- SEGURIDAD (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.private_info  enable row level security;
alter table public.availability  enable row level security;
alter table public.bookings      enable row level security;
alter table public.notifications enable row level security;

-- profiles: los usuarios registrados ven nombre/edad; cada uno edita lo suyo
create policy "profiles read" on public.profiles
  for select to authenticated using (true);
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (first_name, last_name, birth_date, language) on public.profiles to authenticated;

-- private_info: solo el dueño
create policy "private read own" on public.private_info
  for select to authenticated using (user_id = auth.uid());
create policy "private update own" on public.private_info
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.private_info from anon;
revoke insert, update, delete on public.private_info from authenticated;
grant update (phone, push_token) on public.private_info to authenticated;

-- availability: todos los registrados la leen; solo la babysitter maneja la suya
create policy "availability read" on public.availability
  for select to authenticated using (true);
create policy "availability write own" on public.availability
  for all to authenticated
  using (babysitter_id = auth.uid())
  with check (
    babysitter_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'babysitter')
  );
revoke all on public.availability from anon;

-- bookings: solo las dos partes lo ven; los cambios se hacen con funciones
create policy "bookings read parties" on public.bookings
  for select to authenticated
  using (auth.uid() in (employer_id, babysitter_id));
revoke all on public.bookings from anon;
revoke insert, update, delete on public.bookings from authenticated;

-- notifications: cada uno ve y marca como leídas las suyas
create policy "notifications read own" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications update own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

-- ---------------------------------------------------------------------
-- REGISTRO: crea el perfil automáticamente al registrarse
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := new.raw_user_meta_data;
begin
  insert into public.profiles (id, role, first_name, last_name, birth_date, language)
  values (
    new.id,
    coalesce(m->>'role', 'employer'),
    coalesce(m->>'first_name', ''),
    coalesce(m->>'last_name', ''),
    nullif(m->>'birth_date', '')::date,
    coalesce(nullif(m->>'language', ''), 'he')
  );
  insert into public.private_info (user_id, phone)
  values (new.id, coalesce(m->>'phone', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- BÚSQUEDA: babysitters libres en una fecha y horario
-- Una babysitter está libre si NO tiene un pedido aceptado que se superponga
-- (aunque sea en parte) con el horario buscado.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- PEDIDOS
-- ---------------------------------------------------------------------

-- El empleador pide a una babysitter
create or replace function public.create_booking(p_babysitter uuid, p_date date, p_start time, p_end time)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from profiles where id = auth.uid() and role = 'employer') then
    raise exception 'only_employers';
  end if;
  if not exists (select 1 from profiles where id = p_babysitter and role = 'babysitter') then
    raise exception 'not_a_babysitter';
  end if;
  if p_end <= p_start then raise exception 'invalid_time'; end if;
  if p_date < current_date - 1 then raise exception 'date_in_past'; end if;

  if exists (
    select 1 from bookings
    where employer_id = auth.uid() and babysitter_id = p_babysitter
      and booking_date = p_date and start_time = p_start and end_time = p_end
      and status in ('pending', 'accepted')
  ) then
    raise exception 'already_requested';
  end if;

  insert into bookings (employer_id, babysitter_id, booking_date, start_time, end_time)
  values (auth.uid(), p_babysitter, p_date, p_start, p_end)
  returning id into v_id;
  return v_id;
end $$;

-- La babysitter acepta o rechaza
create or replace function public.respond_booking(p_booking uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  b bookings%rowtype;
begin
  select * into b from bookings where id = p_booking for update;
  if not found or b.babysitter_id <> auth.uid() then raise exception 'not_allowed'; end if;
  if b.status <> 'pending' then raise exception 'not_pending'; end if;

  if p_accept then
    if exists (
      select 1 from bookings x
      where x.babysitter_id = b.babysitter_id and x.status = 'accepted'
        and x.booking_date = b.booking_date
        and x.start_time < b.end_time and x.end_time > b.start_time
    ) then
      raise exception 'conflict';
    end if;

    update bookings set status = 'accepted', updated_at = now() where id = b.id;

    -- Rechaza automáticamente otros pedidos pendientes que se superponen
    update bookings set status = 'rejected', updated_at = now()
    where babysitter_id = b.babysitter_id and status = 'pending' and id <> b.id
      and booking_date = b.booking_date
      and start_time < b.end_time and end_time > b.start_time;
  else
    update bookings set status = 'rejected', updated_at = now() where id = b.id;
  end if;
end $$;

-- Cualquiera de las dos partes cancela
create or replace function public.cancel_booking(p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b bookings%rowtype;
begin
  select * into b from bookings where id = p_booking for update;
  if not found or auth.uid() not in (b.employer_id, b.babysitter_id) then
    raise exception 'not_allowed';
  end if;
  if b.status not in ('pending', 'accepted') then raise exception 'not_cancellable'; end if;
  update bookings set status = 'cancelled', cancelled_by = auth.uid(), updated_at = now()
  where id = b.id;
end $$;

-- Mis pedidos, con los datos de la otra persona.
-- El teléfono SOLO se entrega si el pedido está aceptado.
create or replace function public.my_bookings()
returns table (
  id uuid, booking_date date, start_time time, end_time time, status text,
  i_am_babysitter boolean, cancelled_by_me boolean,
  other_first_name text, other_last_name text, other_age int, other_phone text,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select b.id, b.booking_date, b.start_time, b.end_time, b.status,
         (b.babysitter_id = auth.uid()),
         (b.cancelled_by = auth.uid()),
         o.first_name, o.last_name,
         case when o.birth_date is null then null
              else extract(year from age(current_date, o.birth_date))::int end,
         case when b.status = 'accepted' then pi.phone else null end,
         b.created_at
  from bookings b
  join profiles o
    on o.id = case when b.babysitter_id = auth.uid() then b.employer_id else b.babysitter_id end
  left join private_info pi on pi.user_id = o.id
  where auth.uid() in (b.employer_id, b.babysitter_id)
  order by b.booking_date desc, b.start_time desc;
$$;

-- ---------------------------------------------------------------------
-- NOTIFICACIONES: se crean solas cuando cambia un pedido
-- ---------------------------------------------------------------------
create or replace function public.booking_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, actor_id, booking_id, kind)
    values (new.babysitter_id, new.employer_id, new.id, 'new_request');

  elsif new.status is distinct from old.status then
    if new.status = 'accepted' then
      insert into notifications (user_id, actor_id, booking_id, kind)
      values (new.employer_id, new.babysitter_id, new.id, 'accepted');
    elsif new.status = 'rejected' then
      insert into notifications (user_id, actor_id, booking_id, kind)
      values (new.employer_id, new.babysitter_id, new.id, 'rejected');
    elsif new.status = 'cancelled' then
      insert into notifications (user_id, actor_id, booking_id, kind)
      values (
        case when new.cancelled_by = new.employer_id then new.babysitter_id else new.employer_id end,
        new.cancelled_by, new.id, 'cancelled'
      );
    end if;
  end if;
  return new;
end $$;

create trigger bookings_notify
  after insert or update of status on public.bookings
  for each row execute function public.booking_notify();

-- Envía la notificación push al celular (servicio gratuito de Expo)
create or replace function public.send_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_token text;
  v_lang  text;
  v_actor text;
  v_when  text;
  v_title text;
  v_body  text;
  b       bookings%rowtype;
begin
  select pi.push_token, p.language into v_token, v_lang
  from profiles p left join private_info pi on pi.user_id = p.id
  where p.id = new.user_id;

  if v_token is null or v_token = '' then return new; end if;

  select first_name || ' ' || last_name into v_actor from profiles where id = new.actor_id;
  select * into b from bookings where id = new.booking_id;
  v_when := to_char(b.booking_date, 'DD/MM/YYYY') || ' ' ||
            to_char(b.start_time, 'HH24:MI') || '–' || to_char(b.end_time, 'HH24:MI');

  if v_lang = 'he' then
    case new.kind
      when 'new_request' then v_title := 'בקשה חדשה 👶';      v_body := v_actor || ' מבקש/ת אותך ל־' || v_when;
      when 'accepted'    then v_title := 'הבקשה אושרה ✅';     v_body := v_actor || ' אישר/ה: ' || v_when;
      when 'rejected'    then v_title := 'הבקשה נדחתה';        v_body := v_actor || ' לא זמינ/ה ב־' || v_when;
      when 'cancelled'   then v_title := 'ההזמנה בוטלה';       v_body := v_actor || ' ביטל/ה: ' || v_when;
    end case;
  else
    case new.kind
      when 'new_request' then v_title := 'New request 👶';     v_body := v_actor || ' is asking for you on ' || v_when;
      when 'accepted'    then v_title := 'Request accepted ✅'; v_body := v_actor || ' accepted: ' || v_when;
      when 'rejected'    then v_title := 'Request declined';    v_body := v_actor || ' is not available on ' || v_when;
      when 'cancelled'   then v_title := 'Booking cancelled';   v_body := v_actor || ' cancelled: ' || v_when;
    end case;
  end if;

  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    body    := jsonb_build_object(
                 'to', v_token, 'title', v_title, 'body', v_body, 'sound', 'default',
                 'data', jsonb_build_object('booking_id', new.booking_id)),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
exception when others then
  -- Si falla el envío push, la notificación igual queda en la app
  return new;
end $$;

create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.send_push();

-- ---------------------------------------------------------------------
-- PERMISOS DE FUNCIONES
-- ---------------------------------------------------------------------
revoke execute on function public.search_babysitters(date, time, time)      from public, anon;
revoke execute on function public.create_booking(uuid, date, time, time)    from public, anon;
revoke execute on function public.respond_booking(uuid, boolean)            from public, anon;
revoke execute on function public.cancel_booking(uuid)                      from public, anon;
revoke execute on function public.my_bookings()                             from public, anon;
revoke execute on function public.handle_new_user()                         from public, anon, authenticated;
revoke execute on function public.booking_notify()                          from public, anon, authenticated;
revoke execute on function public.send_push()                               from public, anon, authenticated;

grant execute on function public.search_babysitters(date, time, time)   to authenticated;
grant execute on function public.create_booking(uuid, date, time, time) to authenticated;
grant execute on function public.respond_booking(uuid, boolean)         to authenticated;
grant execute on function public.cancel_booking(uuid)                   to authenticated;
grant execute on function public.my_bookings()                          to authenticated;

-- ---------------------------------------------------------------------
-- TIEMPO REAL (la app se actualiza sola)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications, public.bookings;
