-- ============================================================
-- WriteRight — initial schema
-- ============================================================

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  tier        text not null default 'free',   -- 'free' | 'pro'
  credits     integer not null default 0,     -- paid credits remaining
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Usage tracking ────────────────────────────────────────────
create table if not exists public.usage_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  session_id  text,                          -- for anonymous users
  created_at  timestamptz not null default now()
);

alter table public.usage_logs enable row level security;

create policy "Users can insert own usage"
  on public.usage_logs for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Users can view own usage"
  on public.usage_logs for select
  using (auth.uid() = user_id);

-- ── Campaigns ─────────────────────────────────────────────────
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.campaigns enable row level security;

create policy "Users can manage own campaigns"
  on public.campaigns for all
  using (auth.uid() = user_id);

-- ── Saved outputs ─────────────────────────────────────────────
create table if not exists public.saved_outputs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  campaign_id   uuid references public.campaigns(id) on delete set null,
  content_type  text not null,   -- caption | product | ad | hashtag | bio | reply | whatsapp | image_caption
  platform      text,
  language      text,
  business_name text,
  text          text not null,
  label         text,
  created_at    timestamptz not null default now()
);

alter table public.saved_outputs enable row level security;

create policy "Users can manage own saved outputs"
  on public.saved_outputs for all
  using (auth.uid() = user_id);

-- ── Scheduled posts ───────────────────────────────────────────
create table if not exists public.scheduled_posts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  saved_output_id uuid references public.saved_outputs(id) on delete set null,
  platform        text not null,   -- 'instagram' | 'facebook'
  caption         text not null,
  image_url       text,
  scheduled_at    timestamptz not null,
  status          text not null default 'pending',  -- pending | published | failed
  meta_post_id    text,
  error_message   text,
  created_at      timestamptz not null default now()
);

alter table public.scheduled_posts enable row level security;

create policy "Users can manage own scheduled posts"
  on public.scheduled_posts for all
  using (auth.uid() = user_id);

-- ── Stripe payments ───────────────────────────────────────────
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  stripe_session_id   text unique,
  stripe_payment_id   text,
  amount_inr          integer not null,   -- in paise (₹5 = 500)
  credits_purchased   integer not null,
  status              text not null default 'pending',  -- pending | completed | failed
  created_at          timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);
