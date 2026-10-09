-- DKV SMKN 7: jalankan seluruh file ini di Supabase > SQL Editor > New query.
-- Aman dijalankan ulang untuk memperbarui tabel dan policy yang dikelola script ini.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Kegiatan',
  event_date date not null default current_date,
  description text not null default '',
  media_url text,
  media_type text,
  youtube_url text,
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_published_date_idx on public.content(published, event_date desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, role)
  values(new.id, new.email, 'viewer')
  on conflict(id) do update set email = excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Security-definer helper functions avoid recursive RLS checks on profiles.
create or replace function public.current_profile_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;
revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.content enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
for select to authenticated
using (id = auth.uid() or public.current_profile_role() = 'admin');

drop policy if exists "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles
for update to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "public reads published content" on public.content;
create policy "public reads published content" on public.content
for select to anon, authenticated
using (published = true or (auth.uid() is not null and public.current_profile_role() in ('admin','editor')));

drop policy if exists "editors insert content" on public.content;
create policy "editors insert content" on public.content
for insert to authenticated
with check (public.current_profile_role() in ('admin','editor'));

drop policy if exists "editors update content" on public.content;
create policy "editors update content" on public.content
for update to authenticated
using (public.current_profile_role() in ('admin','editor'))
with check (public.current_profile_role() in ('admin','editor'));

drop policy if exists "admins delete content" on public.content;
create policy "admins delete content" on public.content
for delete to authenticated
using (public.current_profile_role() = 'admin');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('dkv-media', 'dkv-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view dkv media" on storage.objects;
create policy "public can view dkv media" on storage.objects
for select to anon, authenticated using (bucket_id = 'dkv-media');

drop policy if exists "editors upload dkv media" on storage.objects;
create policy "editors upload dkv media" on storage.objects
for insert to authenticated
with check (bucket_id = 'dkv-media' and public.current_profile_role() in ('admin','editor'));

drop policy if exists "editors update own dkv media" on storage.objects;
create policy "editors update own dkv media" on storage.objects
for update to authenticated
using (bucket_id = 'dkv-media' and owner_id = auth.uid()::text and public.current_profile_role() in ('admin','editor'))
with check (bucket_id = 'dkv-media' and public.current_profile_role() in ('admin','editor'));

drop policy if exists "admins delete dkv media" on storage.objects;
create policy "admins delete dkv media" on storage.objects
for delete to authenticated
using (bucket_id = 'dkv-media' and public.current_profile_role() = 'admin');
