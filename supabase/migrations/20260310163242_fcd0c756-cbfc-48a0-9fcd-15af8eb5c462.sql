
-- Create app_role enum
create type public.app_role as enum ('admin', 'user');

-- User roles table
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null default 'user',
    unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  phone_number text default '',
  country_id integer default 1,
  vip_tier text default 'None',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  category text not null default 'T-Shirt',
  image_url text not null default '',
  description text not null default '',
  stock_quantity integer not null default 0,
  sizes text[] not null default '{}',
  colors jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.products enable row level security;

-- Gallery items table
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  created_at timestamptz default now()
);
alter table public.gallery_items enable row level security;

-- Function to setup new user (called from app after signup)
create or replace function public.handle_new_user_setup(p_user_id uuid, p_email text, p_full_name text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (p_user_id, coalesce(p_full_name, ''))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (p_user_id, 'user')
  on conflict (user_id, role) do nothing;

  if lower(p_email) = 'africanboy.admin@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (p_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
end;
$$;

-- RLS Policies

-- user_roles: users can read their own roles
create policy "Users can read own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- profiles
create policy "Users can read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Users can update own profile" on public.profiles
  for update to authenticated using (id = auth.uid());
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- products: all authenticated can read, admin can write
create policy "Anyone can read products" on public.products
  for select to authenticated using (true);
create policy "Admins can insert products" on public.products
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update products" on public.products
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete products" on public.products
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- gallery_items: all authenticated can read, admin can write
create policy "Anyone can read gallery" on public.gallery_items
  for select to authenticated using (true);
create policy "Admins can insert gallery" on public.gallery_items
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update gallery" on public.gallery_items
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete gallery" on public.gallery_items
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
