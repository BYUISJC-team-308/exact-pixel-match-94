alter table public.profiles
  add column if not exists interests text[] not null default '{}';
