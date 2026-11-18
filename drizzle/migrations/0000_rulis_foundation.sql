
create type public.app_role as enum ('admin', 'moderator', 'user');
create type public.interaction_kind as enum ('viewed','saved','scheduled','completed','ignored','disliked','shared');
create type public.calendar_kind as enum ('work','study','commitment','exercise','leisure','rest');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  birth_date date,
  city text,
  state text,
  avatar_url text,
  home_lat double precision,
  home_lng double precision,
  onboarding_completed boolean not null default false,
  is_public boolean not null default false,
  share_activities boolean not null default false,
  share_availability boolean not null default false,
  allow_invites boolean not null default true,
  location_consent boolean not null default false,
  terms_accepted_at timestamptz,
  is_active boolean not null default true,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select on public.profiles to authenticated;
grant update (full_name, birth_date, city, state, avatar_url, home_lat, home_lng, onboarding_completed,
  is_public, share_activities, share_availability, allow_invites, location_consent, terms_accepted_at)
  on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Users read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pace text[] not null default '{}',
  crowd text[] not null default '{}',
  company text[] not null default '{}',
  planning text[] not null default '{}',
  novelty text not null default 'sometimes',
  price_openness text[] not null default '{}',
  max_distance_km integer not null default 10 check (max_distance_km between 1 and 500),
  budget_per_experience text not null default 'none',
  weekday_leisure boolean not null default true,
  weekend_leisure boolean not null default true,
  sleep_time time,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.user_preferences to authenticated;
grant all on public.user_preferences to service_role;
alter table public.user_preferences enable row level security;
create policy "Own preferences" on public.user_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger prefs_updated before update on public.user_preferences for each row execute function public.set_updated_at();

create table public.activity_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  group_key text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.activity_categories (group_key);
grant select on public.activity_categories to anon, authenticated;
grant insert, update, delete on public.activity_categories to authenticated;
grant all on public.activity_categories to service_role;
alter table public.activity_categories enable row level security;
create policy "Anyone reads categories" on public.activity_categories for select to anon, authenticated using (true);
create policy "Admins manage categories" on public.activity_categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.user_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.activity_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);
grant select, insert, delete on public.user_interests to authenticated;
grant all on public.user_interests to service_role;
alter table public.user_interests enable row level security;
create policy "Own interests" on public.user_interests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.user_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index on public.user_availability (user_id);
grant select, insert, update, delete on public.user_availability to authenticated;
grant all on public.user_availability to service_role;
alter table public.user_availability enable row level security;
create policy "Own availability" on public.user_availability for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.user_recurring_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null,
  kind public.calendar_kind not null default 'commitment',
  weekdays smallint[] not null default '{}',
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index on public.user_recurring_commitments (user_id);
grant select, insert, update, delete on public.user_recurring_commitments to authenticated;
grant all on public.user_recurring_commitments to service_role;
alter table public.user_recurring_commitments enable row level security;
create policy "Own commitments" on public.user_recurring_commitments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger commitments_updated before update on public.user_recurring_commitments for each row execute function public.set_updated_at();

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'admin',
  url text,
  notes text,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select on public.data_sources to anon, authenticated;
grant insert, update, delete on public.data_sources to authenticated;
grant all on public.data_sources to service_role;
alter table public.data_sources enable row level security;
create policy "Anyone reads sources" on public.data_sources for select to anon, authenticated using (true);
create policy "Admins manage sources" on public.data_sources for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references public.activity_categories(id) on delete set null,
  group_key text not null,
  address text,
  neighborhood text,
  city text not null default 'Florianópolis',
  state text not null default 'SC',
  lat double precision,
  lng double precision,
  price_level smallint check (price_level between 0 and 5),
  price_min numeric(10,2),
  price_max numeric(10,2),
  price_is_estimate boolean not null default true,
  duration_min_minutes integer not null default 60 check (duration_min_minutes > 0),
  duration_max_minutes integer not null default 120,
  indoor boolean not null default false,
  energy text not null default 'calm',
  crowd text not null default 'busy',
  solo_friendly boolean not null default true,
  group_friendly boolean not null default true,
  family_friendly boolean not null default false,
  accessible boolean,
  best_periods text[] not null default '{morning,afternoon}',
  vibe_tags text[] not null default '{}',
  cover_image_url text,
  external_url text,
  is_demo boolean not null default false,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  is_sponsored boolean not null default false,
  source_id uuid references public.data_sources(id) on delete set null,
  last_verified_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (duration_max_minutes >= duration_min_minutes)
);
create index on public.activities (group_key);
create index on public.activities (category_id);
create index on public.activities (city);
create index on public.activities (is_active);
grant select on public.activities to anon, authenticated;
grant insert, update, delete on public.activities to authenticated;
grant all on public.activities to service_role;
alter table public.activities enable row level security;
create policy "Anyone reads active activities" on public.activities for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(),'admin'));
create policy "Admins manage activities" on public.activities for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger activities_updated before update on public.activities for each row execute function public.set_updated_at();

create table public.activity_images (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.activity_images (activity_id);
grant select on public.activity_images to anon, authenticated;
grant insert, update, delete on public.activity_images to authenticated;
grant all on public.activity_images to service_role;
alter table public.activity_images enable row level security;
create policy "Anyone reads activity images" on public.activity_images for select to anon, authenticated using (true);
create policy "Admins manage activity images" on public.activity_images for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.activity_opening_hours (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.activity_opening_hours (activity_id);
grant select on public.activity_opening_hours to anon, authenticated;
grant insert, update, delete on public.activity_opening_hours to authenticated;
grant all on public.activity_opening_hours to service_role;
alter table public.activity_opening_hours enable row level security;
create policy "Anyone reads opening hours" on public.activity_opening_hours for select to anon, authenticated using (true);
create policy "Admins manage opening hours" on public.activity_opening_hours for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category_id uuid references public.activity_categories(id) on delete set null,
  group_key text not null default 'entretenimento',
  starts_at timestamptz not null,
  ends_at timestamptz,
  address text,
  city text not null default 'Florianópolis',
  lat double precision,
  lng double precision,
  price_min numeric(10,2),
  price_max numeric(10,2),
  is_free boolean not null default false,
  external_url text,
  image_url text,
  publish_until timestamptz,
  source_id uuid references public.data_sources(id) on delete set null,
  is_demo boolean not null default false,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.events (starts_at);
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "Anyone reads active events" on public.events for select to anon, authenticated
  using (is_active or public.has_role(auth.uid(),'admin'));
create policy "Admins manage events" on public.events for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger events_updated before update on public.events for each row execute function public.set_updated_at();

create table public.user_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null,
  kind public.calendar_kind not null default 'leisure',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recurrence text not null default 'none' check (recurrence in ('none','weekly')),
  activity_id uuid references public.activities(id) on delete set null,
  estimated_cost numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ends_at > starts_at)
);
create index on public.user_calendar_events (user_id, starts_at);
grant select, insert, update, delete on public.user_calendar_events to authenticated;
grant all on public.user_calendar_events to service_role;
alter table public.user_calendar_events enable row level security;
create policy "Own calendar" on public.user_calendar_events for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger calendar_updated before update on public.user_calendar_events for each row execute function public.set_updated_at();

create table public.saved_activities (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_id)
);
grant select, insert, delete on public.saved_activities to authenticated;
grant all on public.saved_activities to service_role;
alter table public.saved_activities enable row level security;
create policy "Own saved" on public.saved_activities for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.activity_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  kind public.interaction_kind not null,
  context text,
  created_at timestamptz not null default now()
);
create index on public.activity_interactions (user_id, activity_id);
create index on public.activity_interactions (activity_id, kind);
grant select, insert on public.activity_interactions to authenticated;
grant all on public.activity_interactions to service_role;
alter table public.activity_interactions enable row level security;
create policy "Own interactions read" on public.activity_interactions for select to authenticated using (user_id = auth.uid());
create policy "Own interactions insert" on public.activity_interactions for insert to authenticated with check (user_id = auth.uid());

create table public.completed_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  title text not null,
  group_key text,
  completed_at timestamptz not null default now(),
  rating smallint check (rating between 1 and 5),
  would_repeat boolean,
  would_recommend boolean,
  highlight text,
  notes text,
  is_favorite boolean not null default false,
  spent numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.completed_experiences (user_id, completed_at);
grant select, insert, update, delete on public.completed_experiences to authenticated;
grant all on public.completed_experiences to service_role;
alter table public.completed_experiences enable row level security;
create policy "Own experiences" on public.completed_experiences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger experiences_updated before update on public.completed_experiences for each row execute function public.set_updated_at();

create table public.personal_itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null default 'Meu fim de semana',
  kind text not null default 'weekend' check (kind in ('weekend','day','custom')),
  start_date date not null,
  end_date date not null,
  free_days date[] not null default '{}',
  people_count integer not null default 1 check (people_count >= 1),
  notes text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (end_date >= start_date)
);
create index on public.personal_itineraries (user_id, start_date);
grant select on public.personal_itineraries to anon;
grant select, insert, update, delete on public.personal_itineraries to authenticated;
grant all on public.personal_itineraries to service_role;
alter table public.personal_itineraries enable row level security;
create policy "Own itineraries" on public.personal_itineraries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Public itineraries readable" on public.personal_itineraries for select to anon, authenticated
  using (is_public and deleted_at is null);
create trigger itineraries_updated before update on public.personal_itineraries for each row execute function public.set_updated_at();

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.personal_itineraries(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  day_date date not null,
  start_time time,
  label text not null,
  activity_id uuid references public.activities(id) on delete set null,
  estimated_cost numeric(10,2),
  travel_minutes integer,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.itinerary_items (itinerary_id, day_date, sort_order);
grant select on public.itinerary_items to anon;
grant select, insert, update, delete on public.itinerary_items to authenticated;
grant all on public.itinerary_items to service_role;
alter table public.itinerary_items enable row level security;
create policy "Own itinerary items" on public.itinerary_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Public itinerary items readable" on public.itinerary_items for select to anon, authenticated
  using (exists (select 1 from public.personal_itineraries p where p.id = itinerary_id and p.is_public and p.deleted_at is null));

create table public.leisure_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  period text not null check (period in ('weekly','monthly')),
  group_key text not null default 'total',
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period, group_key)
);
grant select, insert, update, delete on public.leisure_budgets to authenticated;
grant all on public.leisure_budgets to service_role;
alter table public.leisure_budgets enable row level security;
create policy "Own budgets" on public.leisure_budgets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger budgets_updated before update on public.leisure_budgets for each row execute function public.set_updated_at();

create table public.recommendation_weights (
  key text primary key,
  label text not null,
  weight numeric(5,2) not null check (weight >= 0),
  updated_at timestamptz not null default now()
);
grant select on public.recommendation_weights to authenticated;
grant update on public.recommendation_weights to authenticated;
grant all on public.recommendation_weights to service_role;
alter table public.recommendation_weights enable row level security;
create policy "Signed-in read weights" on public.recommendation_weights for select to authenticated using (true);
create policy "Admins update weights" on public.recommendation_weights for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  surface text not null,
  score numeric(6,2),
  reasons text[] not null default '{}',
  accepted boolean,
  created_at timestamptz not null default now()
);
create index on public.recommendation_logs (user_id, created_at);
grant select, insert, update on public.recommendation_logs to authenticated;
grant all on public.recommendation_logs to service_role;
alter table public.recommendation_logs enable row level security;
create policy "Own reco logs" on public.recommendation_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  bd date;
begin
  begin
    bd := nullif(new.raw_user_meta_data->>'birth_date','')::date;
  exception when others then bd := null;
  end;
  insert into public.profiles (id, full_name, birth_date, city, state, avatar_url, terms_accepted_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
    bd,
    nullif(new.raw_user_meta_data->>'city',''),
    nullif(new.raw_user_meta_data->>'state',''),
    null,
    case when (new.raw_user_meta_data->>'terms_accepted') = 'true' then now() else null end
  ) on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.admin_list_users()
returns table (id uuid, full_name text, city text, state text, created_at timestamptz, is_active boolean, onboarding_completed boolean, is_admin boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  return query select p.id, p.full_name, p.city, p.state, p.created_at, p.is_active, p.onboarding_completed,
    public.has_role(p.id,'admin')
    from public.profiles p where p.deleted_at is null order by p.created_at desc limit 500;
end; $$;

create or replace function public.admin_set_user_active(_user_id uuid, _active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _user_id = auth.uid() then raise exception 'cannot change own status'; end if;
  update public.profiles set is_active = _active where id = _user_id;
end; $$;

create or replace function public.admin_metrics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles where deleted_at is null),
    'onboarded_users', (select count(*) from public.profiles where onboarding_completed),
    'active_users_30d', (select count(distinct user_id) from public.activity_interactions where created_at > now() - interval '30 days'),
    'returning_users_30d', (select count(*) from (select user_id from public.activity_interactions where created_at > now() - interval '30 days' group by user_id having count(distinct date(created_at)) >= 2) t),
    'reco_accepted', (select count(*) from public.recommendation_logs where accepted = true),
    'reco_rejected', (select count(*) from public.recommendation_logs where accepted = false),
    'top_saved', coalesce((select jsonb_agg(x) from (select a.title, count(*) as total from public.saved_activities s join public.activities a on a.id = s.activity_id group by a.title order by total desc limit 5) x), '[]'::jsonb),
    'top_completed', coalesce((select jsonb_agg(x) from (select title, count(*) as total from public.completed_experiences group by title order by total desc limit 5) x), '[]'::jsonb),
    'top_categories', coalesce((select jsonb_agg(x) from (select a.group_key, count(*) as total from public.activity_interactions i join public.activities a on a.id = i.activity_id group by a.group_key order by total desc limit 7) x), '[]'::jsonb),
    'users_by_city', coalesce((select jsonb_agg(x) from (select coalesce(city,'—') as city, count(*) as total from public.profiles group by city order by total desc limit 10) x), '[]'::jsonb)
  ) into result;
  return result;
end; $$;

revoke execute on function public.admin_list_users() from anon;
revoke execute on function public.admin_set_user_active(uuid, boolean) from anon;
revoke execute on function public.admin_metrics() from anon;

create policy "Avatar own read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avatar own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.recommendation_weights (key, label, weight) values
  ('interest','Compatibilidade com interesses',25),
  ('time','Compatibilidade temporal',25),
  ('distance','Distância',15),
  ('budget','Orçamento',10),
  ('daypart','Adequação ao dia e horário',10),
  ('history','Preferências históricas',10),
  ('novelty','Diversidade e novidade',5);

insert into public.activity_categories (slug, name, group_key, sort_order) values
  ('praias','Praias','natureza',1),('cachoeiras','Cachoeiras','natureza',2),('trilhas','Trilhas','natureza',3),
  ('montanhas','Montanhas','natureza',4),('parques','Parques','natureza',5),('florestas','Florestas','natureza',6),
  ('bosques','Bosques','natureza',7),('sitios','Sítios','natureza',8),('camping','Camping','natureza',9),
  ('piqueniques','Piqueniques','natureza',10),('mirantes','Mirantes','natureza',11),('ar-livre','Passeios ao ar livre','natureza',12),
  ('restaurantes','Restaurantes','gastronomia',1),('japonesa','Comida japonesa','gastronomia',2),('hamburguerias','Hamburguerias','gastronomia',3),
  ('pizzarias','Pizzarias','gastronomia',4),('cafeterias','Cafeterias','gastronomia',5),('bares','Bares','gastronomia',6),
  ('pubs','Pubs','gastronomia',7),('cervejarias','Cervejarias','gastronomia',8),('sorveterias','Sorveterias','gastronomia',9),
  ('exp-gastronomicas','Experiências gastronômicas','gastronomia',10),
  ('cinema','Cinema','entretenimento',1),('teatro','Teatro','entretenimento',2),('shows','Shows','entretenimento',3),
  ('festivais','Festivais','entretenimento',4),('musica-ao-vivo','Música ao vivo','entretenimento',5),('baladas','Baladas','entretenimento',6),
  ('casas-noturnas','Casas noturnas','entretenimento',7),('stand-up','Stand-up','entretenimento',8),('ent-eventos-culturais','Eventos culturais','entretenimento',9),
  ('caminhadas','Caminhadas','esporte',1),('corridas','Corridas','esporte',2),('ciclismo','Ciclismo','esporte',3),
  ('academia','Academia','esporte',4),('esportes-coletivos','Esportes coletivos','esporte',5),('aquaticas','Atividades aquáticas','esporte',6),
  ('aventura','Aventura','esporte',7),
  ('museus','Museus','cultura',1),('exposicoes','Exposições','cultura',2),('feiras','Feiras','cultura',3),
  ('livrarias','Livrarias','cultura',4),('centros-historicos','Centros históricos','cultura',5),('cul-eventos-culturais','Eventos culturais','cultura',6),
  ('encontros-amigos','Encontros com amigos','social',1),('atividades-grupo','Atividades em grupo','social',2),('jogos','Jogos','social',3),
  ('exp-coletivas','Experiências coletivas','social',4),('novas-amizades','Novas amizades em ambientes apropriados','social',5),
  ('passeios-familiares','Passeios familiares','familia',1),('infantis','Atividades infantis','familia',2),('fam-parques','Parques','familia',3),
  ('educativas','Experiências educativas','familia',4),('com-criancas','Programas com crianças','familia',5);

insert into public.data_sources (id, name, kind, notes) values
  ('00000000-0000-0000-0000-00000000d001','Demonstração RULIS — lugares públicos de Florianópolis','demo',
   'Lugares públicos conhecidos cadastrados para demonstração. Preços são faixas estimadas e horários não foram verificados.');

insert into public.activities (title, description, category_id, group_key, address, neighborhood, lat, lng, price_level, price_min, price_max,
  duration_min_minutes, duration_max_minutes, indoor, energy, crowd, solo_friendly, group_friendly, family_friendly, best_periods, vibe_tags, is_demo, source_id)
select v.title, v.description, c.id, c.group_key, v.address, v.neighborhood, v.lat, v.lng, v.price_level, v.price_min, v.price_max,
  v.dmin, v.dmax, v.indoor, v.energy, v.crowd, v.solo, v.grp, v.fam, v.periods, v.vibes, true, '00000000-0000-0000-0000-00000000d001'
from (values
  ('Praia da Joaquina','Praia de mar aberto, famosa pelas ondas e pelas dunas ao lado.','praias','Rod. Prefeito Aldo Gil Alves','Joaquina',-27.6290,-48.4490,0::smallint,0::numeric,0::numeric,120,300,false,'lively','busy',true,true,true,'{morning,afternoon}'::text[],'{near_home,economic}'::text[]),
  ('Sandboard nas Dunas da Joaquina','Descer as dunas de prancha. O aluguel costuma ser cobrado no local.','aventura','Dunas da Joaquina','Joaquina',-27.6250,-48.4560,2::smallint,null,null,60,150,false,'lively','busy',true,true,true,'{morning,afternoon}','{adventure,friends}'),
  ('Praia Mole','Praia cercada por morros, ponto de surfistas e de fim de tarde animado.','praias','Rod. Jornalista Manoel de Menezes','Praia Mole',-27.6030,-48.4330,0,0,0,120,300,false,'lively','busy',true,true,true,'{morning,afternoon}','{friends,economic}'),
  ('Trilha da Lagoinha do Leste','Trilha longa no sul da Ilha até uma das praias mais isoladas de Floripa.','trilhas','Acesso pelo Pântano do Sul ou Matadeiro','Pântano do Sul',-27.7770,-48.4850,0,0,0,240,420,false,'lively','reserved',true,true,false,'{morning}','{adventure,economic}'),
  ('Trilha da Praia do Gravatá','Trilha curta entre a Praia Mole e a Joaquina até uma praia pequena e tranquila.','trilhas','Rod. Jornalista Manoel de Menezes','Lagoa da Conceição',-27.6110,-48.4330,0,0,0,90,180,false,'calm','reserved',true,true,false,'{morning,afternoon}','{adventure,romantic,economic}'),
  ('Mirante da Lagoa da Conceição','Vista panorâmica da Lagoa, das dunas e do mar, à beira da estrada.','mirantes','Rod. João Paulo, Morro da Lagoa','Lagoa da Conceição',-27.5880,-48.4650,0,0,0,20,60,false,'calm','busy',true,true,true,'{afternoon,evening}','{romantic,economic}'),
  ('Praia do Campeche','Faixa de areia extensa e mar de água clara, com vista para a Ilha do Campeche.','praias','Av. Campeche','Campeche',-27.6750,-48.4790,0,0,0,120,300,false,'calm','busy',true,true,true,'{morning,afternoon}','{economic}'),
  ('Parque Estadual do Rio Vermelho','Área de restinga e floresta com trilhas, camping e acesso à praia do Moçambique.','florestas','Rod. João Gualberto Soares','São João do Rio Vermelho',-27.5000,-48.4200,0,0,0,120,300,false,'calm','reserved',true,true,true,'{morning,afternoon}','{adventure,economic}'),
  ('Mirante do Morro da Cruz','Vista de 360° do centro, das pontes e da baía. Bonito ao anoitecer.','mirantes','Morro da Cruz','Centro',-27.5940,-48.5360,0,0,0,30,90,false,'calm','busy',true,true,true,'{afternoon,evening}','{romantic,near_home,economic}'),
  ('Parque da Luz','Parque urbano com gramado e vista para a Ponte Hercílio Luz.','parques','Rua Felipe Schmidt','Centro',-27.5930,-48.5540,0,0,0,30,90,false,'calm','reserved',true,true,true,'{morning,afternoon}','{near_home,economic,romantic}'),
  ('Parque Ecológico do Córrego Grande','Bosque urbano com trilhas curtas, lago e área para crianças.','bosques','Rua João Pio Duarte Silva','Córrego Grande',-27.5980,-48.5080,0,0,0,60,120,false,'calm','reserved',true,true,true,'{morning,afternoon}','{near_home,economic}'),
  ('Caminhada na Beira-Mar Norte','Calçadão e ciclovia à beira da baía, bons para caminhar, correr ou pedalar.','caminhadas','Av. Jornalista Rubens de Arruda Ramos','Centro',-27.5850,-48.5480,0,0,0,30,120,false,'lively','busy',true,true,true,'{morning,evening}','{near_home,economic}'),
  ('Passeio pela Ponte Hercílio Luz','Cartão-postal da cidade, com passagem para pedestres e ciclistas.','centros-historicos','Ponte Hercílio Luz','Centro',-27.5935,-48.5600,0,0,0,30,60,false,'calm','busy',true,true,true,'{afternoon,evening}','{romantic,economic}'),
  ('Mercado Público de Florianópolis','Mercado histórico com boxes de comida, bares e artesanato.','exp-gastronomicas','Rua Jerônimo Coelho, 60','Centro',-27.5970,-48.5510,2,null,null,60,150,true,'lively','busy',true,true,true,'{morning,afternoon}','{friends}'),
  ('Museu Histórico de Santa Catarina','Antigo Palácio Cruz e Sousa, com acervo sobre a história do estado.','museus','Praça XV de Novembro, 227','Centro',-27.5960,-48.5490,null,null,null,60,120,true,'calm','reserved',true,true,true,'{morning,afternoon}','{}'),
  ('Centro Integrado de Cultura (CIC)','Complexo com museu de arte, teatro, cinema e exposições.','exposicoes','Av. Gov. Irineu Bornhausen, 5600','Agronômica',-27.5850,-48.5190,null,null,null,60,150,true,'calm','reserved',true,true,true,'{afternoon,evening}','{}'),
  ('Teatro Álvaro de Carvalho','Teatro histórico do centro, com programação variada.','teatro','Rua Marechal Guilherme, 26','Centro',-27.5966,-48.5470,null,null,null,90,150,true,'calm','busy',true,true,false,'{evening,night}','{romantic}'),
  ('Fortaleza de São José da Ponta Grossa','Fortaleza do século XVIII no norte da Ilha, com vista para o mar.','centros-historicos','Estrada Haroldo Soares Glavan','Jurerê',-27.4320,-48.5170,null,null,null,60,120,false,'calm','reserved',true,true,true,'{morning,afternoon}','{}'),
  ('Pôr do sol em Santo Antônio de Lisboa','Vila açoriana à beira da baía, com casario histórico e fim de tarde famoso.','centros-historicos','Rua Quinze de Novembro','Santo Antônio de Lisboa',-27.5070,-48.5200,0,0,0,60,180,false,'calm','busy',true,true,true,'{afternoon,evening}','{romantic,economic}'),
  ('Ostras no Ribeirão da Ilha','Vila de pescadores no sul da Ilha, conhecida pelo cultivo de ostras.','exp-gastronomicas','Rod. Baldicero Filomeno','Ribeirão da Ilha',-27.7180,-48.5620,3,null,null,90,180,false,'calm','reserved',true,true,true,'{afternoon,evening}','{romantic}'),
  ('Costa da Lagoa','Comunidade acessível de barco ou por trilha, com cachoeira e restaurantes à beira da água.','ar-livre','Trapiche da Lagoa da Conceição','Lagoa da Conceição',-27.5630,-48.4720,null,null,null,180,300,false,'calm','reserved',true,true,true,'{morning,afternoon}','{adventure,romantic}'),
  ('Ilha do Campeche','Ilha com águas transparentes e inscrições rupestres. Travessia de barco paga e com controle de visitantes.','praias','Saída pela Praia do Campeche ou Armação','Campeche',-27.6960,-48.4650,null,null,null,300,480,false,'calm','reserved',true,true,true,'{morning}','{adventure}'),
  ('Projeto Tamar Florianópolis','Centro de visitantes sobre tartarugas marinhas, bom programa com crianças.','educativas','Rua Professor Ademir Francisco, Barra da Lagoa','Barra da Lagoa',-27.5730,-48.4250,null,null,null,60,120,false,'calm','busy',true,true,true,'{morning,afternoon}','{}'),
  ('Bares do centrinho da Lagoa','Região de bares e restaurantes ao redor do centrinho da Lagoa da Conceição.','bares','Av. Afonso Delambert Neto','Lagoa da Conceição',-27.6000,-48.4710,2,null,null,90,240,false,'lively','busy',false,true,false,'{evening,night}','{friends}'),
  ('Praia de Jurerê Internacional','Praia de águas calmas no norte da Ilha.','praias','Av. dos Búzios','Jurerê',-27.4390,-48.4970,0,0,0,120,300,false,'lively','busy',true,true,true,'{morning,afternoon}','{economic}'),
  ('Trilha do Morro das Aranhas','Trilha com vista das praias do norte, entre Santinho e Ingleses.','trilhas','Acesso pela Praia do Santinho','Santinho',-27.4730,-48.3890,0,0,0,120,180,false,'lively','reserved',true,true,false,'{morning}','{adventure,economic}'),
  ('Catedral Metropolitana','Igreja histórica no alto da Praça XV.','centros-historicos','Praça XV de Novembro','Centro',-27.5960,-48.5500,0,0,0,20,40,true,'calm','reserved',true,true,true,'{morning,afternoon}','{near_home,economic}'),
  ('Praça XV e a Figueira centenária','Praça central com uma figueira de mais de cem anos e muita história.','centros-historicos','Praça XV de Novembro','Centro',-27.5967,-48.5493,0,0,0,20,45,false,'calm','busy',true,true,true,'{morning,afternoon}','{near_home,economic}'),
  ('Piquenique no Parque de Coqueiros','Parque à beira-mar no continente, com gramado, quadras e playground.','piqueniques','Rua Des. Pedro Silva','Coqueiros',-27.6080,-48.5850,0,0,0,60,180,false,'calm','busy',true,true,true,'{morning,afternoon}','{friends,economic,near_home}')
) as v(title, description, cat, address, neighborhood, lat, lng, price_level, price_min, price_max, dmin, dmax, indoor, energy, crowd, solo, grp, fam, periods, vibes)
join public.activity_categories c on c.slug = v.cat;
